import { createCharacter } from "./Character.js";
import { createFormTransitionRuntime } from "./FormTransitionRuntime.js";
import { getEffectiveTransitionRules } from "./FormTransitionPlannerEvaluation.js";
import { normalizeResourceKey } from "./FormTransitionPlannerResources.js";

export function initializeFormTransitionRuntime(character, formSetId, options = {}) {
  const set = findSet(character, formSetId);
  if (!set) throw new Error("Alternate form set not found");

  const activeForm = set.forms.find(form => form.id === set.activeFormId);
  if (!activeForm) throw new Error("Alternate form set active form not found");

  if (activeForm.id === set.baseFormId) {
    return updateRuntime(character, set.id, null, options.now);
  }

  const startedAt = normalizeTimestamp(set.activeSince ?? options.now);
  const rules = getEffectiveTransitionRules(set, activeForm);
  const maintenanceCosts = collectMaintenanceCosts(rules);
  const runtime = createFormTransitionRuntime({
    activationId: set.activeActivationId ?? options.activationId ?? generateRuntimeId(),
    formId: activeForm.id,
    startedAt,
    observedAt: startedAt,
    duration: rules.duration,
    maintenance: maintenanceCosts.map(entry => ({
      costId: entry.runtimeCostId,
      resource: entry.cost.resource,
      resourceKey: normalizeResourceKey(entry.cost.resource),
      amount: entry.cost.amount,
      intervalSeconds: entry.cost.intervalSeconds,
      chargedIntervals: 0,
      lastChargedAt: null,
      nextDueAt: entry.cost.intervalSeconds == null
        ? null
        : addSeconds(startedAt, entry.cost.intervalSeconds),
      notes: entry.cost.notes,
    })),
  });

  return updateRuntime(character, set.id, runtime, options.now ?? startedAt);
}

export function clearFormTransitionRuntime(character, formSetId, options = {}) {
  const set = findSet(character, formSetId);
  if (!set) throw new Error("Alternate form set not found");
  return updateRuntime(character, set.id, null, options.now);
}

function collectMaintenanceCosts(rules) {
  const entries = [
    ...rules.activation.costs.map((cost, index) => ({
      cost,
      phase: "activation",
      index,
    })),
    ...rules.deactivation.costs.map((cost, index) => ({
      cost,
      phase: "deactivation",
      index,
    })),
  ].filter(entry => entry.cost.timing === "maintenance");
  const frequencies = new Map();

  for (const entry of entries) {
    frequencies.set(
      entry.cost.id,
      (frequencies.get(entry.cost.id) ?? 0) + 1,
    );
  }

  return entries.map(entry => ({
    ...entry,
    runtimeCostId: frequencies.get(entry.cost.id) === 1
      ? entry.cost.id
      : `${entry.phase}:${entry.cost.id}:${entry.index + 1}`,
  }));
}

function updateRuntime(character, setId, runtime, now) {
  const timestamp = normalizeTimestamp(now);
  return createCharacter({
    ...character,
    alternateFormSets: character.alternateFormSets.map(set => (
      set.id === setId ? { ...set, transitionRuntime: runtime } : set
    )),
    metadata: {
      ...character.metadata,
      updatedAt: timestamp,
    },
  });
}

function findSet(character, setId) {
  return character.alternateFormSets.find(set => set.id === setId) ?? null;
}

function normalizeTimestamp(value) {
  if (value == null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error("Form transition runtime timestamp must be valid");
  }
  return value;
}

function addSeconds(timestamp, seconds) {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString();
}

function generateRuntimeId() {
  return `form_runtime_${Math.random().toString(36).slice(2, 10)}`;
}
