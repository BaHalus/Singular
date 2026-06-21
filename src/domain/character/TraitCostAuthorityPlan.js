import {
  analyzeTraitCostAuthority,
  serializeTraitCostAuthorityAnalysis,
  validateTraitCostAuthorityAnalysis,
} from "./TraitCostAuthorityAnalysis.js";
import { createTraitCostFingerprint } from "./TraitCostSourceProjection.js";

const SCHEMA_VERSION = 1;
const STATUSES = ["ready", "no-op", "incomplete", "conflict", "unsupported"];

export function planTraitCostAuthority(character, options = {}) {
  requireObject(options, "Trait cost authority plan options");
  const analysis = analyzeTraitCostAuthority(character, options);
  const plannedAt = normalizeTimestamp(options.now);
  const operationId = options.operationId ?? generateId("trait-cost-operation");
  const plan = {
    schemaVersion: SCHEMA_VERSION,
    id: options.planId ?? generateId("trait-cost-plan"),
    operationId,
    plannedAt,
    characterId: character.identity.id,
    percentageMode: analysis.percentageMode,
    status: analysis.status,
    sourceFingerprint: analysis.sourceFingerprint,
    targetFingerprint: analysis.targetFingerprint,
    analysisFingerprint: analysis.analysisFingerprint,
    analysis: serializeTraitCostAuthorityAnalysis(analysis),
  };
  plan.planFingerprint = createTraitCostFingerprint(projectPlan(plan));
  validateTraitCostAuthorityPlan(plan);
  return deepFreeze(plan);
}

export function validateTraitCostAuthorityPlan(plan) {
  requireObject(plan, "Trait cost authority plan");
  if (plan.schemaVersion !== SCHEMA_VERSION) {
    throw new Error("Trait cost authority plan schemaVersion is invalid");
  }
  for (const field of [
    "id",
    "operationId",
    "plannedAt",
    "characterId",
    "percentageMode",
    "sourceFingerprint",
    "targetFingerprint",
    "analysisFingerprint",
    "planFingerprint",
  ]) {
    if (typeof plan[field] !== "string" || plan[field] === "") {
      throw new Error(`Trait cost authority plan ${field} is required`);
    }
  }
  normalizeTimestamp(plan.plannedAt);
  if (!STATUSES.includes(plan.status)) {
    throw new Error("Trait cost authority plan status is invalid");
  }
  validateTraitCostAuthorityAnalysis(plan.analysis);
  if (plan.analysis.status !== plan.status ||
      plan.analysis.characterId !== plan.characterId ||
      plan.analysis.percentageMode !== plan.percentageMode ||
      plan.analysis.sourceFingerprint !== plan.sourceFingerprint ||
      plan.analysis.targetFingerprint !== plan.targetFingerprint ||
      plan.analysis.analysisFingerprint !== plan.analysisFingerprint) {
    throw new Error("Trait cost authority plan analysis is inconsistent");
  }
  const expected = createTraitCostFingerprint(projectPlan(plan));
  if (plan.planFingerprint !== expected) {
    throw new Error("Trait cost authority plan fingerprint is inconsistent");
  }
  return true;
}

export function serializeTraitCostAuthorityPlan(plan) {
  validateTraitCostAuthorityPlan(plan);
  return cloneValue(plan);
}

function projectPlan(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    id: plan.id,
    operationId: plan.operationId,
    plannedAt: plan.plannedAt,
    characterId: plan.characterId,
    percentageMode: plan.percentageMode,
    status: plan.status,
    sourceFingerprint: plan.sourceFingerprint,
    targetFingerprint: plan.targetFingerprint,
    analysisFingerprint: plan.analysisFingerprint,
  };
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Trait cost authority timestamp is invalid");
  }
  return value;
}

function generateId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `${prefix}:${crypto.randomUUID()}`;
  }
  return `${prefix}:${Math.random().toString(36).slice(2, 12)}`;
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
