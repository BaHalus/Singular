import { validateCharacter } from "./Character.js";
import {
  evaluateTraitAlternativeGroups,
  serializeTraitAlternativeGroupsEvaluation,
  validateTraitAlternativeGroupsEvaluation,
} from "./TraitAlternativeGroups.js";
import {
  projectTraitAlternativeGroupPolicies,
} from "./TraitAlternativeGroupPolicies.js";
import {
  evaluateTraitChoices,
  validateTraitChoicesEvaluation,
} from "./TraitChoices.js";
import {
  createTraitCostFingerprint,
  createTraitCostSourceFingerprint,
  createTraitCostTargetFingerprint,
} from "./TraitCostSourceProjection.js";

const STATUSES = ["ready", "no-op", "incomplete", "conflict", "unsupported"];

export function analyzeTraitCostAuthority(character, options = {}) {
  validateCharacter(character);
  requireObject(options, "Trait cost authority analysis options");

  const percentageMode = options.percentageMode ?? "additive";
  const sourceFingerprint = createTraitCostSourceFingerprint(character, {
    percentageMode,
  });
  const targetFingerprint = createTraitCostTargetFingerprint(character);
  const choices = character.traits.map(trait => ({
    traitId: trait.id,
    evaluation: evaluateTraitChoices(trait.choices),
  }));
  const groups = evaluateTraitAlternativeGroups(character.traits, {
    percentageMode,
    groupPolicies: projectTraitAlternativeGroupPolicies(
      character.traitAlternativeGroups,
    ),
  });

  let status = groups.status;
  if (
    choices.some(item => item.evaluation.status === "incomplete") &&
    !["conflict", "unsupported"].includes(status)
  ) {
    status = "incomplete";
  }

  if (status === "ready" && isCurrent(character, groups, sourceFingerprint)) {
    status = "no-op";
  }

  const diagnostics = [
    ...groups.diagnostics,
    ...choices
      .filter(item => item.evaluation.status === "incomplete")
      .map(item => ({
        code: "trait-required-choice-missing",
        severity: "pending",
        traitId: item.traitId,
        missingKeys: [...item.evaluation.missingKeys],
      })),
  ];
  const analysis = {
    status,
    complete: ["ready", "no-op"].includes(status),
    characterId: character.identity.id,
    percentageMode,
    sourceFingerprint,
    targetFingerprint,
    choices,
    groups: serializeTraitAlternativeGroupsEvaluation(groups),
    diagnostics,
  };
  analysis.analysisFingerprint = createTraitCostFingerprint(
    projectAnalysisFingerprint(analysis),
  );

  validateTraitCostAuthorityAnalysis(analysis);
  return deepFreeze(analysis);
}

export function validateTraitCostAuthorityAnalysis(value) {
  requireObject(value, "Trait cost authority analysis");
  if (!STATUSES.includes(value.status)) {
    throw new Error("Trait cost authority analysis status is invalid");
  }
  if (value.complete !== ["ready", "no-op"].includes(value.status)) {
    throw new Error("Trait cost authority analysis complete flag is inconsistent");
  }
  for (const field of [
    "characterId",
    "percentageMode",
    "sourceFingerprint",
    "targetFingerprint",
    "analysisFingerprint",
  ]) {
    if (typeof value[field] !== "string" || value[field] === "") {
      throw new Error(`Trait cost authority analysis ${field} is required`);
    }
  }
  if (!Array.isArray(value.choices) || !Array.isArray(value.diagnostics)) {
    throw new Error("Trait cost authority analysis arrays are invalid");
  }
  const traitIds = new Set();
  for (const item of value.choices) {
    requireObject(item, "Trait cost authority choice entry");
    if (typeof item.traitId !== "string" || item.traitId === "") {
      throw new Error("Trait cost authority choice traitId is required");
    }
    if (traitIds.has(item.traitId)) {
      throw new Error(`Duplicate Trait cost choice traitId: ${item.traitId}`);
    }
    traitIds.add(item.traitId);
    validateTraitChoicesEvaluation(item.evaluation);
  }
  validateTraitAlternativeGroupsEvaluation(value.groups);
  const expected = createTraitCostFingerprint(projectAnalysisFingerprint(value));
  if (value.analysisFingerprint !== expected) {
    throw new Error("Trait cost authority analysis fingerprint is inconsistent");
  }
  return true;
}

export function serializeTraitCostAuthorityAnalysis(value) {
  validateTraitCostAuthorityAnalysis(value);
  return cloneValue(value);
}

function projectAnalysisFingerprint(value) {
  return {
    status: value.status,
    percentageMode: value.percentageMode,
    sourceFingerprint: value.sourceFingerprint,
    targetFingerprint: value.targetFingerprint,
    choices: value.choices,
    groups: value.groups,
    diagnostics: value.diagnostics,
  };
}

function isCurrent(character, groups, sourceFingerprint) {
  const contributions = new Map(
    groups.contributions.map(item => [item.traitId, item]),
  );
  return character.traits.every(trait => {
    const contribution = contributions.get(trait.id);
    const authority = trait.pointValue.finalCostAuthority ?? null;
    return contribution !== undefined && authority !== null &&
      authority.sourceFingerprint === sourceFingerprint &&
      Object.is(
        trait.pointValue.calculatedPoints,
        contribution.contributionPoints,
      );
  });
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be object`);
  }
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
