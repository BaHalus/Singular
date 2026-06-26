import {
  validateSkillDefaultCandidate,
} from "./SkillDefaultCandidate.js";
import {
  resolveSkillDefaultCandidate,
} from "./SkillDefaultResolver.js";
import {
  createSkillMechanicsResult,
  serializeSkillMechanicsResult,
  validateSkillMechanicsResult,
} from "./SkillMechanicsResult.js";
import {
  requireSkillMechanicsPlainObject,
} from "./SkillMechanicsPortableValue.js";

export function resolveSkillDefaultFromTrainedSource(input = {}) {
  requireSkillMechanicsPlainObject(
    input,
    "Skill default trained-source input",
  );

  const {
    candidate,
    trainedSourceResult,
    targetAttributeLevel,
  } = input;

  validateSkillDefaultCandidate(candidate);
  if (candidate.sourceType !== "skill") {
    throw new Error(
      "Skill default trained-source candidate must use a Skill source",
    );
  }

  if (trainedSourceResult === undefined || trainedSourceResult === null) {
    return createBlockedResult(candidate, {
      code: "SKILL_DEFAULT_TRAINED_SOURCE_MISSING",
      severity: "blocked",
      sourceId: candidate.sourceId,
    });
  }

  validateSkillMechanicsResult(trainedSourceResult);
  validateSourceIdentity(candidate, trainedSourceResult);

  if (trainedSourceResult.status === "blocked") {
    return createBlockedResult(candidate, {
      code: "SKILL_DEFAULT_SOURCE_BLOCKED",
      severity: "blocked",
      sourceId: candidate.sourceId,
      sourceDiagnostics: serializeSkillMechanicsResult(
        trainedSourceResult,
      ).diagnostics,
    });
  }

  if (trainedSourceResult.basis?.kind !== "trained") {
    return createBlockedResult(candidate, {
      code: "SKILL_DEFAULT_SOURCE_NOT_TRAINED",
      severity: "blocked",
      sourceId: candidate.sourceId,
      sourceBasisKind: trainedSourceResult.basis?.kind ?? null,
    });
  }

  return resolveSkillDefaultCandidate({
    candidate,
    sourceLevel: trainedSourceResult.level,
    targetAttributeLevel,
  });
}

function validateSourceIdentity(candidate, sourceResult) {
  if (sourceResult.entityType !== "skill") {
    throw new Error(
      "Skill default trained source must be a Skill mechanics result",
    );
  }

  if (sourceResult.entityId !== candidate.sourceId) {
    throw new Error(
      "Skill default trained source must match candidate sourceId",
    );
  }
}

function createBlockedResult(candidate, diagnostic) {
  return createSkillMechanicsResult({
    entityId: candidate.targetSkillId,
    entityType: "skill",
    status: "blocked",
    diagnostics: [diagnostic],
  });
}
