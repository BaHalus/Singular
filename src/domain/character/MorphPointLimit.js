import { validateMorphProfile } from "./MorphProfile.js";

const TARGET_KINDS = ["known", "improvised"];
const HARD_REASONS = new Set([
  "morph-point-limit-exceeded",
  "morph-improvisation-point-limit-exceeded",
]);

export function evaluateMorphPointLimit(
  profile,
  templateImportedPoints,
  options = {},
) {
  validateMorphProfile(profile);

  const targetKind = options.targetKind ?? "known";
  if (!TARGET_KINDS.includes(targetKind)) {
    throw new Error("Morfose point limit targetKind is invalid");
  }

  const targetPoints = normalizeNullableNumber(
    templateImportedPoints,
    "Morfose target template points must be finite number or null",
  );
  const generalMode = profile.pointLimitMode;
  const generalLimit = profile.pointLimit;
  const improvisationLimit = targetKind === "improvised"
    ? profile.improvisation.pointLimit
    : null;
  const reasons = [];

  const needsTargetPoints = generalMode === "limited" ||
    improvisationLimit !== null;

  if (generalMode === "undeclared") {
    reasons.push("morph-point-limit-undeclared");
  }

  if (needsTargetPoints && targetPoints === null) {
    reasons.push("morph-template-points-unknown");
  }

  const generalExcessPoints = generalMode === "limited" && targetPoints !== null
    ? Math.max(0, targetPoints - generalLimit)
    : null;
  if (generalExcessPoints !== null && generalExcessPoints > 0) {
    reasons.push("morph-point-limit-exceeded");
  }

  const improvisationExcessPoints = improvisationLimit !== null &&
      targetPoints !== null
    ? Math.max(0, targetPoints - improvisationLimit)
    : null;
  if (
    improvisationExcessPoints !== null &&
    improvisationExcessPoints > 0
  ) {
    reasons.push("morph-improvisation-point-limit-exceeded");
  }

  const enforcementMode = determineEnforcementMode(
    generalMode,
    improvisationLimit,
  );
  const uniqueReasons = [...new Set(reasons)];
  const status = uniqueReasons.some(reason => HARD_REASONS.has(reason))
    ? "blocked"
    : uniqueReasons.length > 0 ? "pending" : "ready";

  return {
    targetKind,
    generalPointLimitMode: generalMode,
    generalPointLimit: generalLimit,
    generalPointLimitSource: profile.pointLimitSource,
    improvisationPointLimit: improvisationLimit,
    effectivePointLimit: determineEffectivePointLimit(
      generalMode,
      generalLimit,
      improvisationLimit,
    ),
    templateImportedPoints: targetPoints,
    generalExcessPoints,
    improvisationExcessPoints,
    enforcementMode,
    enforced: enforcementMode !== "none",
    complete: enforcementMode === "complete",
    status,
    reasons: uniqueReasons,
  };
}

export function evaluateMorphTargetPointLimit(character, set, targetForm) {
  validateTargetInput(character, set, targetForm);

  if (set.mechanism !== "morph" || targetForm.id === set.baseFormId) {
    return null;
  }

  if (targetForm.morphImprovisation !== null &&
      targetForm.morphImprovisation !== undefined) {
    return evaluateMorphPointLimit(
      set.morphProfile,
      targetForm.morphImprovisation.draft?.template?.importedPoints ?? null,
      { targetKind: "improvised" },
    );
  }

  if (targetForm.morphKnownFormId !== null &&
      targetForm.morphKnownFormId !== undefined) {
    const template = targetForm.templateId === null ||
        targetForm.templateId === undefined
      ? null
      : character.templates.find(item => item.id === targetForm.templateId) ?? null;

    return evaluateMorphPointLimit(
      set.morphProfile,
      template?.importedPoints ?? null,
      { targetKind: "known" },
    );
  }

  return null;
}

export function applyMorphPointLimitToSelection(selection, evaluation) {
  if (selection === null || evaluation === null) return selection;

  const mergePending = evaluation.enforcementMode === "complete";
  const evaluationReasons = evaluation.reasons.filter(reason => (
    HARD_REASONS.has(reason) || mergePending
  ));
  const reasons = [...new Set([
    ...(selection.reasons ?? []),
    ...evaluationReasons,
  ])];
  const status = determineCombinedStatus(selection.status, reasons);

  return {
    ...selection,
    templateImportedPoints:
      selection.templateImportedPoints ?? evaluation.templateImportedPoints,
    pointLimitEvaluation: clone(evaluation),
    status,
    reasons,
  };
}

export function getMorphPointLimitReasonSeverity(reason) {
  if (HARD_REASONS.has(reason)) return "blocked";
  if ([
    "morph-point-limit-undeclared",
    "morph-template-points-unknown",
  ].includes(reason)) return "pending";
  return null;
}

function determineCombinedStatus(selectionStatus, reasons) {
  if (
    selectionStatus === "blocked" ||
    reasons.some(reason => HARD_REASONS.has(reason))
  ) {
    return "blocked";
  }
  if (selectionStatus === "pending" || reasons.length > 0) return "pending";
  return "ready";
}

function determineEnforcementMode(generalMode, improvisationLimit) {
  if (generalMode === "limited" || generalMode === "unlimited") {
    return "complete";
  }
  return improvisationLimit === null ? "none" : "partial";
}

function determineEffectivePointLimit(
  generalMode,
  generalLimit,
  improvisationLimit,
) {
  if (generalMode === "undeclared") return null;
  if (generalMode === "unlimited") return improvisationLimit;
  if (improvisationLimit === null) return generalLimit;
  return Math.min(generalLimit, improvisationLimit);
}

function validateTargetInput(character, set, targetForm) {
  if (!plain(character)) throw new Error("Character must be object");
  if (!Array.isArray(character.templates)) {
    throw new Error("Character templates must be array");
  }
  if (!plain(set)) throw new Error("Alternate form set must be object");
  if (!plain(targetForm)) throw new Error("Alternate form target must be object");
  if (set.mechanism === "morph") validateMorphProfile(set.morphProfile);
}

function normalizeNullableNumber(value, message) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" ? Number(value.trim()) : Number.NaN;
  if (!Number.isFinite(parsed)) throw new Error(message);
  return parsed;
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
