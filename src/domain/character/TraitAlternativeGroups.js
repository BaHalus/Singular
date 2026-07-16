import {
  evaluateTraitFinalCost,
  serializeTraitFinalCost,
} from "./TraitFinalCost.js";
import { validateTrait } from "./Traits.js";

const STATUSES = ["ready", "incomplete", "conflict", "unsupported"];
const DEFAULT_ALTERNATIVE_FACTOR = 0.2;

export function evaluateTraitAlternativeGroups(traits = [], options = {}) {
  if (!Array.isArray(traits)) {
    throw new Error("Trait alternative group input must be array");
  }
  if (!isPlainObject(options)) {
    throw new Error("Trait alternative group options must be object");
  }

  traits.forEach(validateTrait);
  const percentageMode = options.percentageMode ?? "additive";
  const policies = normalizePolicies(options.groupPolicies);
  const externalModifiersByTraitId = normalizeExternalModifiersByTraitId(
    options.externalModifiersByTraitId,
  );
  const evaluations = new Map(
    traits.map(trait => [
      trait.id,
      evaluateTraitFinalCost(trait, {
        percentageMode,
        externalModifiers: externalModifiersByTraitId[trait.id] ?? [],
      }),
    ]),
  );

  const contributions = [];
  const groups = [];
  const diagnostics = [];

  for (const trait of traits.filter(item => item.alternateGroupId === null)) {
    const evaluation = evaluations.get(trait.id);
    contributions.push(createStandaloneContribution(trait, evaluation));
  }

  const grouped = groupTraits(traits);
  for (const [groupId, members] of grouped) {
    const group = evaluateGroup({
      groupId,
      members,
      evaluations,
      policy: policies.get(groupId) ?? createDefaultPolicy(),
    });
    groups.push(group);
    contributions.push(...group.contributions);
    diagnostics.push(...group.diagnostics);
  }

  const contributionStatuses = contributions.map(item => item.status);
  const groupStatuses = groups.map(item => item.status);
  const status = combineStatuses([...contributionStatuses, ...groupStatuses]);
  const complete = status === "ready";
  const totalPoints = complete
    ? normalizeArithmetic(
        contributions.reduce(
          (sum, item) => sum + item.contributionPoints,
          0,
        ),
      )
    : null;

  const result = {
    status,
    complete,
    percentageMode,
    groups,
    contributions,
    totalPoints,
    diagnostics,
  };

  validateTraitAlternativeGroupsEvaluation(result);
  return deepFreeze(result);
}

export function validateTraitAlternativeGroupsEvaluation(result) {
  if (!isPlainObject(result)) {
    throw new Error("Trait alternative groups evaluation must be object");
  }
  if (!STATUSES.includes(result.status)) {
    throw new Error("Trait alternative groups status is invalid");
  }
  if (result.complete !== (result.status === "ready")) {
    throw new Error("Trait alternative groups complete flag is inconsistent");
  }
  if (!Array.isArray(result.groups)) {
    throw new Error("Trait alternative groups groups must be array");
  }
  if (!Array.isArray(result.contributions)) {
    throw new Error("Trait alternative groups contributions must be array");
  }
  if (!Array.isArray(result.diagnostics)) {
    throw new Error("Trait alternative groups diagnostics must be array");
  }
  if (result.status === "ready") {
    validateFiniteNumber(
      result.totalPoints,
      "Ready Trait alternative groups totalPoints must be finite number",
    );
    const expectedTotal = normalizeArithmetic(
      result.contributions.reduce(
        (sum, item) => sum + item.contributionPoints,
        0,
      ),
    );
    if (!Object.is(result.totalPoints, expectedTotal)) {
      throw new Error("Trait alternative groups totalPoints is inconsistent");
    }
  } else if (result.totalPoints !== null) {
    throw new Error("Non-ready Trait alternative groups totalPoints must be null");
  }
  return true;
}

export function serializeTraitAlternativeGroupsEvaluation(result) {
  validateTraitAlternativeGroupsEvaluation(result);
  return cloneValue(result);
}

export function getTraitAlternativeGroupStatuses() {
  return [...STATUSES];
}

function evaluateGroup({ groupId, members, evaluations, policy }) {
  const diagnostics = [];
  const memberEvaluations = members.map(trait => ({
    trait,
    evaluation: evaluations.get(trait.id),
  }));

  if (members.length < 2) {
    return createBlockedGroup({
      groupId,
      members,
      memberEvaluations,
      policy,
      status: "conflict",
      diagnostics: [diagnostic(
        "trait-alternative-group-requires-two-members",
        "warning",
        groupId,
      )],
    });
  }

  const invalidRoles = members
    .filter(trait => trait.role !== "advantage")
    .map(trait => trait.id);
  if (invalidRoles.length > 0) {
    return createBlockedGroup({
      groupId,
      members,
      memberEvaluations,
      policy,
      status: "conflict",
      diagnostics: [{
        ...diagnostic(
          "trait-alternative-group-only-advantages",
          "warning",
          groupId,
        ),
        traitIds: invalidRoles,
      }],
    });
  }

  const memberStatus = combineStatuses(
    memberEvaluations.map(item => item.evaluation.status),
  );
  if (memberStatus !== "ready") {
    return createBlockedGroup({
      groupId,
      members,
      memberEvaluations,
      policy,
      status: memberStatus,
      diagnostics: [diagnostic(
        `trait-alternative-group-member-${memberStatus}`,
        memberStatus === "conflict" ? "warning" : "pending",
        groupId,
      )],
    });
  }

  const negativeMembers = memberEvaluations
    .filter(item => item.evaluation.calculatedPoints < 0)
    .map(item => item.trait.id);
  if (negativeMembers.length > 0) {
    return createBlockedGroup({
      groupId,
      members,
      memberEvaluations,
      policy,
      status: "conflict",
      diagnostics: [{
        ...diagnostic(
          "trait-alternative-group-negative-cost",
          "warning",
          groupId,
        ),
        traitIds: negativeMembers,
      }],
    });
  }

  const maximum = Math.max(
    ...memberEvaluations.map(item => item.evaluation.calculatedPoints),
  );
  const candidates = memberEvaluations.filter(item => (
    Object.is(item.evaluation.calculatedPoints, maximum)
  ));
  const explicitAll = memberEvaluations.filter(item => (
    item.trait.isPrimaryAlternative === true
  ));
  const explicitCandidates = candidates.filter(item => (
    item.trait.isPrimaryAlternative === true
  ));

  if (explicitAll.some(item => !candidates.includes(item))) {
    return createBlockedGroup({
      groupId,
      members,
      memberEvaluations,
      policy,
      status: "conflict",
      diagnostics: [diagnostic(
        "trait-alternative-group-primary-not-most-expensive",
        "warning",
        groupId,
      )],
    });
  }
  if (explicitCandidates.length > 1) {
    return createBlockedGroup({
      groupId,
      members,
      memberEvaluations,
      policy,
      status: "conflict",
      diagnostics: [diagnostic(
        "trait-alternative-group-multiple-primary",
        "warning",
        groupId,
      )],
    });
  }

  const primary = explicitCandidates[0] ?? [...candidates].sort((left, right) => (
    left.trait.id.localeCompare(right.trait.id)
  ))[0];
  const contributions = memberEvaluations.map(item => {
    const primaryMember = item.trait.id === primary.trait.id;
    const individualPoints = item.evaluation.calculatedPoints;
    const contributionPoints = primaryMember
      ? individualPoints
      : roundAlternative(
          individualPoints * policy.alternativeFactor,
          policy.roundCostDown,
        );
    return {
      traitId: item.trait.id,
      groupId,
      groupRole: primaryMember ? "primary" : "alternative",
      status: "ready",
      individualPoints,
      contributionPoints,
      finalCost: serializeTraitFinalCost(item.evaluation),
      diagnostics: [],
    };
  });

  if (explicitCandidates.length === 0) {
    diagnostics.push(diagnostic(
      "trait-alternative-group-primary-selected-automatically",
      "info",
      groupId,
    ));
  }

  return {
    id: groupId,
    status: "ready",
    complete: true,
    policy,
    memberTraitIds: members.map(trait => trait.id),
    primaryTraitId: primary.trait.id,
    contributions,
    totalPoints: normalizeArithmetic(
      contributions.reduce(
        (sum, item) => sum + item.contributionPoints,
        0,
      ),
    ),
    diagnostics,
  };
}

function createBlockedGroup({
  groupId,
  members,
  memberEvaluations,
  policy,
  status,
  diagnostics,
}) {
  return {
    id: groupId,
    status,
    complete: false,
    policy,
    memberTraitIds: members.map(trait => trait.id),
    primaryTraitId: null,
    contributions: memberEvaluations.map(item => ({
      traitId: item.trait.id,
      groupId,
      groupRole: null,
      status: item.evaluation.status,
      individualPoints: item.evaluation.calculatedPoints,
      contributionPoints: null,
      finalCost: serializeTraitFinalCost(item.evaluation),
      diagnostics: [],
    })),
    totalPoints: null,
    diagnostics,
  };
}

function createStandaloneContribution(trait, evaluation) {
  const ready = evaluation.status === "ready";
  return {
    traitId: trait.id,
    groupId: null,
    groupRole: "standalone",
    status: evaluation.status,
    individualPoints: evaluation.calculatedPoints,
    contributionPoints: ready ? evaluation.calculatedPoints : null,
    finalCost: serializeTraitFinalCost(evaluation),
    diagnostics: [],
  };
}

function groupTraits(traits) {
  const groups = new Map();
  for (const trait of traits) {
    if (trait.alternateGroupId === null) continue;
    if (!groups.has(trait.alternateGroupId)) {
      groups.set(trait.alternateGroupId, []);
    }
    groups.get(trait.alternateGroupId).push(trait);
  }
  return groups;
}

function normalizePolicies(input) {
  if (input === undefined || input === null) return new Map();
  if (!isPlainObject(input)) {
    throw new Error("Trait alternative group policies must be object");
  }
  return new Map(
    Object.entries(input).map(([groupId, policy]) => [
      groupId,
      normalizePolicy(policy),
    ]),
  );
}

function normalizeExternalModifiersByTraitId(input) {
  if (input === undefined || input === null) return {};
  if (!isPlainObject(input)) {
    throw new Error("Trait external modifiers by trait id must be object");
  }
  for (const [traitId, modifiers] of Object.entries(input)) {
    if (traitId === "" || !Array.isArray(modifiers)) {
      throw new Error("Trait external modifiers entry is invalid");
    }
  }
  return input;
}

function normalizePolicy(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Trait alternative group policy must be object");
  }
  const alternativeFactor = input.alternativeFactor ?? DEFAULT_ALTERNATIVE_FACTOR;
  if (
    typeof alternativeFactor !== "number" ||
    !Number.isFinite(alternativeFactor) ||
    alternativeFactor < 0
  ) {
    throw new Error("Trait alternative group factor must be non-negative finite number");
  }
  const roundCostDown = input.roundCostDown ?? false;
  if (typeof roundCostDown !== "boolean") {
    throw new Error("Trait alternative group roundCostDown must be boolean");
  }
  return {
    alternativeFactor,
    roundCostDown,
  };
}

function createDefaultPolicy() {
  return normalizePolicy();
}

function roundAlternative(value, roundCostDown) {
  const normalized = normalizeArithmetic(value);
  return normalizeArithmetic(
    roundCostDown ? Math.floor(normalized) : Math.ceil(normalized),
  );
}

function combineStatuses(statuses) {
  if (statuses.includes("conflict")) return "conflict";
  if (statuses.includes("unsupported")) return "unsupported";
  if (statuses.includes("incomplete")) return "incomplete";
  return "ready";
}

function diagnostic(code, severity, groupId) {
  return { code, severity, groupId };
}

function validateFiniteNumber(value, message) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(message);
  }
}

function normalizeArithmetic(value) {
  if (!Number.isFinite(value)) return value;
  const normalized = Number(value.toFixed(12));
  return Object.is(normalized, -0) ? 0 : normalized;
}

function cloneValue(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    for (const item of value) result.push(cloneValue(item, seen));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneValue(item, seen);
    }
    return result;
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
