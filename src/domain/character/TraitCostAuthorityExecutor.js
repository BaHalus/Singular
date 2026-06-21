import {
  createCharacter,
  serializeCharacter,
  validateCharacter,
} from "./Character.js";
import {
  analyzeTraitCostAuthority,
} from "./TraitCostAuthorityAnalysis.js";
import {
  createTraitFinalCostAuthority,
  serializeTraitFinalCostAuthority,
} from "./TraitFinalCostAuthority.js";
import {
  validateTraitCostAuthorityPlan,
} from "./TraitCostAuthorityPlan.js";
import {
  createTraitCostTargetFingerprint,
} from "./TraitCostSourceProjection.js";
import { serializeTrait } from "./Traits.js";

export class TraitCostAuthorityExecutionError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TraitCostAuthorityExecutionError";
    this.code = code;
    this.details = details;
  }
}

export function executeTraitCostAuthorityPlan(character, plan, options = {}) {
  validateCharacter(character);
  validateTraitCostAuthorityPlan(plan);
  requireObject(options, "Trait cost authority execution options");

  if (plan.characterId !== character.identity.id) {
    throw new TraitCostAuthorityExecutionError(
      "PLAN_CHARACTER_MISMATCH",
      "Trait cost authority plan belongs to another character",
    );
  }

  const current = analyzeTraitCostAuthority(character, {
    percentageMode: plan.percentageMode,
  });
  if (current.analysisFingerprint !== plan.analysisFingerprint) {
    throw new TraitCostAuthorityExecutionError(
      "PLAN_STALE",
      "Trait cost authority plan is stale",
      {
        expectedFingerprint: plan.analysisFingerprint,
        currentFingerprint: current.analysisFingerprint,
        currentAnalysis: current,
      },
    );
  }

  const executedAt = normalizeTimestamp(options.now ?? plan.plannedAt);
  if (current.status === "no-op") {
    return freezeResult({
      character,
      plan,
      changed: false,
      receipt: createReceipt({
        character,
        plan,
        executedAt,
        status: "no-op",
        authorities: [],
        afterTargetFingerprint: current.targetFingerprint,
      }),
    });
  }
  if (current.status !== "ready") {
    throw new TraitCostAuthorityExecutionError(
      "PLAN_NOT_READY",
      "Trait cost authority plan is not ready",
      { status: current.status, diagnostics: current.diagnostics },
    );
  }

  const contributions = new Map(
    current.groups.contributions.map(item => [item.traitId, item]),
  );
  const choices = new Map(
    current.choices.map(item => [item.traitId, item.evaluation]),
  );
  const groupPolicies = new Map(
    current.groups.groups.map(group => [group.id, group.policy]),
  );
  const authorities = [];
  const traits = character.traits.map(trait => {
    const contribution = contributions.get(trait.id);
    const choiceEvaluation = choices.get(trait.id);
    if (!contribution || !choiceEvaluation) {
      throw new TraitCostAuthorityExecutionError(
        "ANALYSIS_INCOMPLETE",
        `Trait ${trait.id} has no complete cost analysis`,
      );
    }
    const authority = createTraitFinalCostAuthority({
      operationId: plan.operationId,
      appliedAt: executedAt,
      characterId: character.identity.id,
      traitId: trait.id,
      sourceFingerprint: current.sourceFingerprint,
      analysisFingerprint: current.analysisFingerprint,
      planFingerprint: plan.planFingerprint,
      groupId: contribution.groupId,
      groupRole: contribution.groupRole,
      individualPoints: contribution.individualPoints,
      contributionPoints: contribution.contributionPoints,
      finalCost: contribution.finalCost,
      choices: choiceEvaluation,
      groupPolicy: contribution.groupId === null
        ? null
        : groupPolicies.get(contribution.groupId),
    });
    authorities.push(authority);
    const serialized = serializeTrait(trait);
    return {
      ...serialized,
      pointValue: {
        ...serialized.pointValue,
        calculatedPoints: contribution.contributionPoints,
        finalCostAuthority: serializeTraitFinalCostAuthority(authority),
      },
    };
  });

  const nextCharacter = createCharacter({
    ...serializeCharacter(character),
    traits,
  });
  validateCharacter(nextCharacter);
  const afterTargetFingerprint = createTraitCostTargetFingerprint(nextCharacter);

  return freezeResult({
    character: nextCharacter,
    plan,
    changed: true,
    receipt: createReceipt({
      character,
      plan,
      executedAt,
      status: "applied",
      authorities,
      afterTargetFingerprint,
    }),
  });
}

function createReceipt({
  character,
  plan,
  executedAt,
  status,
  authorities,
  afterTargetFingerprint,
}) {
  return deepFreeze({
    operationId: plan.operationId,
    planId: plan.id,
    characterId: character.identity.id,
    executedAt,
    status,
    sourceFingerprint: plan.sourceFingerprint,
    beforeTargetFingerprint: plan.targetFingerprint,
    afterTargetFingerprint,
    analysisFingerprint: plan.analysisFingerprint,
    planFingerprint: plan.planFingerprint,
    authorities: authorities.map(serializeTraitFinalCostAuthority),
  });
}

function freezeResult(value) {
  return Object.freeze(value);
}

function normalizeTimestamp(value) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Trait cost authority execution timestamp is invalid");
  }
  return value;
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be object`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
