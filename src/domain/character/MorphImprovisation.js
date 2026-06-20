import {
  createTemplate,
  validateTemplate,
  serializeTemplates,
} from "./Templates.js";
import { createMorphTemplateFingerprint } from "./MorphMaterialization.js";
import { evaluateMorphPointLimit } from "./MorphPointLimit.js";

const IMPROVISATION_SOURCES = ["unknown", "manual", "imported", "generated"];
const HARD_REASONS = new Set([
  "morph-improvisation-forbidden",
  "morph-improvisation-conditions-unsatisfied",
  "morph-improvisation-nonphysical-characteristic",
  "morph-improvisation-characteristic-not-in-setting",
  "morph-improvisation-composition-change-forbidden",
  "morph-improvisation-policy-stale",
  "morph-improvisation-projection-invalid",
]);

export function createMorphImprovisationDraft(input = {}) {
  const id = input.id ?? generateImprovisationId();
  const template = createTemplate({
    ...(input.template ?? {}),
    id: input.template?.id ?? `${id}_template`,
    templateType: "form",
  });

  const draft = {
    id,
    name: input.name ?? template.name ?? "",
    source: input.source ?? "manual",
    template,
    evidence: {
      physicalNaturalOnly: nullableBoolean(input.evidence?.physicalNaturalOnly),
      allCharacteristicsExistInSetting: nullableBoolean(
        input.evidence?.allCharacteristicsExistInSetting,
      ),
      changesComposition: nullableBoolean(input.evidence?.changesComposition),
      conditionsSatisfied: nullableBoolean(input.evidence?.conditionsSatisfied),
    },
    notes: input.notes ?? "",
    tags: stringArray(input.tags, "Morfose improvisation tags must be string array"),
    raw: clone(input.raw ?? null),
  };

  validateMorphImprovisationDraft(draft);
  return draft;
}

export function validateMorphImprovisationDraft(draft) {
  if (!plain(draft)) throw new Error("Morfose improvisation draft must be object");
  requiredString(draft.id, "Morfose improvisation draft id must be non-empty string");
  if (typeof draft.name !== "string") {
    throw new Error("Morfose improvisation draft name must be string");
  }
  if (!IMPROVISATION_SOURCES.includes(draft.source)) {
    throw new Error("Morfose improvisation source is invalid");
  }
  validateTemplate(draft.template);
  if (draft.template.templateType !== "form") {
    throw new Error("Morfose improvisation template must be form template");
  }
  if (!plain(draft.evidence)) {
    throw new Error("Morfose improvisation evidence must be object");
  }
  for (const key of [
    "physicalNaturalOnly",
    "allCharacteristicsExistInSetting",
    "changesComposition",
    "conditionsSatisfied",
  ]) {
    validateNullableBoolean(
      draft.evidence[key],
      `Morfose improvisation evidence ${key} must be boolean or null`,
    );
  }
  if (typeof draft.notes !== "string") {
    throw new Error("Morfose improvisation notes must be string");
  }
  validateStringArray(draft.tags, "Morfose improvisation tags must be string array");
  return true;
}

export function serializeMorphImprovisationDraft(draft) {
  validateMorphImprovisationDraft(draft);
  return {
    id: draft.id,
    name: draft.name,
    source: draft.source,
    template: serializeTemplates([draft.template])[0],
    evidence: { ...draft.evidence },
    notes: draft.notes,
    tags: [...draft.tags],
    raw: clone(draft.raw),
  };
}

export function createMorphImprovisationProjection(input = {}) {
  const draft = createMorphImprovisationDraft(input.draft ?? input);
  const projection = {
    improvisationId: requiredString(
      input.improvisationId ?? draft.id,
      "Morfose improvisation projection id must be non-empty string",
    ),
    draft,
    draftFingerprint: input.draftFingerprint ?? createMorphImprovisationDraftFingerprint(draft),
    templateFingerprint: input.templateFingerprint ??
      createMorphTemplateFingerprint(draft.template),
    policyFingerprint: requiredString(
      input.policyFingerprint,
      "Morfose improvisation policyFingerprint must be non-empty string",
    ),
    materializedAt: normalizeTimestamp(input.materializedAt),
    pointLimitEvaluation: clone(input.pointLimitEvaluation ?? null),
  };

  validateMorphImprovisationProjection(projection);
  return projection;
}

export function validateMorphImprovisationProjection(projection) {
  if (!plain(projection)) {
    throw new Error("Morfose improvisation projection must be object");
  }
  requiredString(
    projection.improvisationId,
    "Morfose improvisation projection id must be non-empty string",
  );
  validateMorphImprovisationDraft(projection.draft);
  requiredString(
    projection.draftFingerprint,
    "Morfose improvisation draftFingerprint must be non-empty string",
  );
  requiredString(
    projection.templateFingerprint,
    "Morfose improvisation templateFingerprint must be non-empty string",
  );
  requiredString(
    projection.policyFingerprint,
    "Morfose improvisation policyFingerprint must be non-empty string",
  );
  normalizeTimestamp(projection.materializedAt);
  if (projection.pointLimitEvaluation !== null && !plain(projection.pointLimitEvaluation)) {
    throw new Error("Morfose improvisation pointLimitEvaluation must be object or null");
  }
  return true;
}

export function serializeMorphImprovisationProjection(projection) {
  validateMorphImprovisationProjection(projection);
  return {
    improvisationId: projection.improvisationId,
    draft: serializeMorphImprovisationDraft(projection.draft),
    draftFingerprint: projection.draftFingerprint,
    templateFingerprint: projection.templateFingerprint,
    policyFingerprint: projection.policyFingerprint,
    materializedAt: projection.materializedAt,
    pointLimitEvaluation: clone(projection.pointLimitEvaluation),
  };
}

export function evaluateMorphImprovisationPolicy(policy, evidence) {
  if (!plain(policy)) throw new Error("Morfose improvisation policy must be object");
  if (!plain(evidence)) throw new Error("Morfose improvisation evidence must be object");

  const reasons = [];
  if (policy.mode === "forbidden") {
    reasons.push("morph-improvisation-forbidden");
  } else if (policy.mode === "unknown") {
    reasons.push("morph-improvisation-policy-unknown");
  } else if (policy.mode === "conditional") {
    if (evidence.conditionsSatisfied === false) {
      reasons.push("morph-improvisation-conditions-unsatisfied");
    } else if (evidence.conditionsSatisfied !== true) {
      reasons.push("morph-improvisation-conditions-unknown");
    }
  }

  if (policy.traitScope === "unknown") {
    reasons.push("morph-improvisation-trait-scope-unknown");
  } else if (policy.traitScope === "physicalNatural") {
    if (evidence.physicalNaturalOnly === false) {
      reasons.push("morph-improvisation-nonphysical-characteristic");
    } else if (evidence.physicalNaturalOnly !== true) {
      reasons.push("morph-improvisation-physical-natural-evidence-unknown");
    }
  }

  if (policy.availabilityScope === "unknown") {
    reasons.push("morph-improvisation-availability-scope-unknown");
  } else if (policy.availabilityScope === "settingOnly") {
    if (evidence.allCharacteristicsExistInSetting === false) {
      reasons.push("morph-improvisation-characteristic-not-in-setting");
    } else if (evidence.allCharacteristicsExistInSetting !== true) {
      reasons.push("morph-improvisation-setting-evidence-unknown");
    }
  }

  if (policy.compositionScope === "unknown") {
    reasons.push("morph-improvisation-composition-scope-unknown");
  } else if (policy.compositionScope === "sameComposition") {
    if (evidence.changesComposition === true) {
      reasons.push("morph-improvisation-composition-change-forbidden");
    } else if (evidence.changesComposition !== false) {
      reasons.push("morph-improvisation-composition-evidence-unknown");
    }
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    status: uniqueReasons.some(reason => HARD_REASONS.has(reason))
      ? "blocked"
      : uniqueReasons.length > 0 ? "pending" : "ready",
    reasons: uniqueReasons,
  };
}

export function createMorphImprovisationPointLimitEvaluation(profile, draft) {
  validateMorphImprovisationDraft(draft);
  return evaluateMorphPointLimit(
    profile,
    draft.template.importedPoints,
    { targetKind: "improvised" },
  );
}

export function evaluateMorphImprovisedTarget(set, targetForm) {
  if (
    set.mechanism !== "morph" ||
    targetForm.id === set.baseFormId ||
    targetForm.morphImprovisation === null ||
    targetForm.morphImprovisation === undefined
  ) {
    return null;
  }

  const reasons = [];
  let projection = null;
  try {
    projection = createMorphImprovisationProjection(targetForm.morphImprovisation);
  } catch {
    reasons.push("morph-improvisation-projection-invalid");
  }

  if (projection !== null) {
    if (
      projection.draftFingerprint !==
        createMorphImprovisationDraftFingerprint(projection.draft) ||
      projection.templateFingerprint !==
        createMorphTemplateFingerprint(projection.draft.template)
    ) {
      reasons.push("morph-improvisation-projection-invalid");
    }
    if (
      projection.policyFingerprint !==
        createMorphImprovisationPolicyFingerprint(set.morphProfile.improvisation)
    ) {
      reasons.push("morph-improvisation-policy-stale");
    }
    reasons.push(...evaluateMorphImprovisationPolicy(
      set.morphProfile.improvisation,
      projection.draft.evidence,
    ).reasons);
  }

  const uniqueReasons = [...new Set(reasons)];
  return {
    improvisationId: projection?.improvisationId ?? null,
    templateImportedPoints: projection?.draft.template.importedPoints ?? null,
    materialization: projection === null ? null : serializeMorphImprovisationProjection(projection),
    status: uniqueReasons.some(reason => HARD_REASONS.has(reason))
      ? "blocked"
      : uniqueReasons.length > 0 ? "pending" : "ready",
    reasons: uniqueReasons,
    pointLimitEvaluation: projection === null
      ? null
      : createMorphImprovisationPointLimitEvaluation(
        set.morphProfile,
        projection.draft,
      ),
  };
}

export function createMorphImprovisationDraftFingerprint(draft) {
  validateMorphImprovisationDraft(draft);
  return canonicalStringify(serializeMorphImprovisationDraft(draft));
}

export function createMorphImprovisationPolicyFingerprint(policy) {
  if (!plain(policy)) throw new Error("Morfose improvisation policy must be object");
  return canonicalStringify(policy);
}

function nullableBoolean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "boolean") {
    throw new Error("Morfose improvisation evidence must be boolean or null");
  }
  return value;
}

function validateNullableBoolean(value, message) {
  if (value !== null && typeof value !== "boolean") throw new Error(message);
}

function stringArray(value, message) {
  if (value === undefined || value === null) return [];
  validateStringArray(value, message);
  return [...value];
}

function validateStringArray(value, message) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error(message);
  }
}

function requiredString(value, message) {
  if (typeof value !== "string" || value === "") throw new Error(message);
  return value;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Morfose improvisation timestamp must be valid");
  }
  return value;
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (plain(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  }
  return value;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateImprovisationId() {
  return `morph_improvisation_${Math.random().toString(36).slice(2, 10)}`;
}
