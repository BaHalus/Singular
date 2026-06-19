import { createCharacter } from "./Character.js";
import {
  appendFormTransitionHistory,
} from "./FormTransitionHistory.js";

export function recordFormTransitionExecution(character, receipt) {
  validateReceipt(receipt);

  const entry = {
    id: `form_history_transition_${sanitizeId(receipt.id)}`,
    type: "transition-executed",
    occurredAt: receipt.executedAt,
    characterId: receipt.characterId,
    formSetId: receipt.formSetId,
    formId: receipt.targetFormId,
    fromFormId: receipt.fromFormId,
    targetFormId: receipt.targetFormId,
    activationId: receipt.activationId ?? null,
    runtimeId: receipt.runtimeId ?? null,
    executionId: receipt.id,
    data: cloneValue(receipt),
  };

  return appendHistory(character, entry, receipt.executedAt);
}

export function recordFormRuntimeAdvance(character, input) {
  const {
    formSetId,
    formId,
    runtimeId,
    activationId = null,
    observedAt,
    consumedResources = [],
    dueMaintenance = [],
    maintenanceError = null,
    previousReturnRequest = null,
    returnRequest = null,
  } = input;
  let current = character;

  if (consumedResources.length > 0) {
    current = appendHistory(current, {
      id: createRuntimeEventId(
        "maintenance_charged",
        runtimeId,
        observedAt,
      ),
      type: "maintenance-charged",
      occurredAt: observedAt,
      characterId: current.identity.id,
      formSetId,
      formId,
      fromFormId: null,
      targetFormId: null,
      activationId,
      runtimeId,
      executionId: null,
      data: {
        consumedResources: cloneValue(consumedResources),
        dueMaintenance: cloneValue(dueMaintenance),
      },
    }, observedAt);
  }

  if (maintenanceError !== null) {
    current = appendHistory(current, {
      id: createRuntimeEventId(
        "maintenance_unpaid",
        runtimeId,
        observedAt,
      ),
      type: "maintenance-unpaid",
      occurredAt: observedAt,
      characterId: current.identity.id,
      formSetId,
      formId,
      fromFormId: null,
      targetFormId: null,
      activationId,
      runtimeId,
      executionId: null,
      data: {
        error: cloneValue(maintenanceError),
        dueMaintenance: cloneValue(dueMaintenance),
      },
    }, observedAt);
  }

  if (
    returnRequest !== null &&
    JSON.stringify(previousReturnRequest) !== JSON.stringify(returnRequest)
  ) {
    current = appendHistory(current, {
      id: createRuntimeEventId(
        "return_requested",
        runtimeId,
        observedAt,
      ),
      type: "return-requested",
      occurredAt: observedAt,
      characterId: current.identity.id,
      formSetId,
      formId,
      fromFormId: formId,
      targetFormId: returnRequest.targetFormId,
      activationId,
      runtimeId,
      executionId: null,
      data: {
        request: cloneValue(returnRequest),
        previousRequest: cloneValue(previousReturnRequest),
      },
    }, observedAt);
  }

  return current;
}

function appendHistory(character, entry, updatedAt) {
  return createCharacter({
    ...character,
    formTransitionHistory: appendFormTransitionHistory(
      character.formTransitionHistory,
      entry,
    ),
    metadata: {
      ...character.metadata,
      updatedAt,
    },
  });
}

function validateReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new Error("Form transition receipt must be object");
  }

  for (const key of [
    "id",
    "executedAt",
    "characterId",
    "formSetId",
    "fromFormId",
    "targetFormId",
  ]) {
    if (typeof receipt[key] !== "string" || receipt[key] === "") {
      throw new Error(`Form transition receipt ${key} must be non-empty string`);
    }
  }
}

function createRuntimeEventId(type, runtimeId, observedAt) {
  return [
    "form_history",
    type,
    sanitizeId(runtimeId),
    sanitizeId(observedAt),
  ].join("_");
}

function sanitizeId(value) {
  return String(value ?? "item")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
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
