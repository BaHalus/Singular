const STATE_MODES = ["shared", "perForm"];
const POOL_KEYS = ["HP", "FP", "EnergyReserve"];

export function createAlternateFormStatePolicy(input = {}) {
  const pools = input.pools ?? {};

  const policy = {
    pools: Object.fromEntries(
      POOL_KEYS.map(key => [key, normalizeMode(pools[key])]),
    ),
    injuries: normalizeMode(input.injuries),
    conditions: normalizeMode(input.conditions),
    effects: normalizeMode(input.effects),
    equipment: normalizeMode(input.equipment),
  };

  validateAlternateFormStatePolicy(policy);

  return policy;
}

export function validateAlternateFormStatePolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new Error("Alternate form state policy must be object");
  }

  if (!isPlainObject(policy.pools)) {
    throw new Error("Alternate form state policy pools must be object");
  }

  for (const key of POOL_KEYS) {
    validateMode(policy.pools[key], `Alternate form pool policy ${key} is invalid`);
  }

  validateMode(policy.injuries, "Alternate form injuries policy is invalid");
  validateMode(policy.conditions, "Alternate form conditions policy is invalid");
  validateMode(policy.effects, "Alternate form effects policy is invalid");
  validateMode(policy.equipment, "Alternate form equipment policy is invalid");

  return true;
}

export function serializeAlternateFormStatePolicy(policy) {
  validateAlternateFormStatePolicy(policy);

  return {
    pools: { ...policy.pools },
    injuries: policy.injuries,
    conditions: policy.conditions,
    effects: policy.effects,
    equipment: policy.equipment,
  };
}

export function createAlternateFormRuntimeState(input = {}) {
  const runtimeState = {
    initialized: input.initialized ?? false,
    capturedAt: input.capturedAt ?? null,
    pools: normalizePoolSnapshot(input.pools),
    injuries: normalizeArray(input.injuries, "Alternate form injuries state must be array"),
    conditions: normalizeArray(input.conditions, "Alternate form conditions state must be array"),
    effects: normalizeArray(input.effects, "Alternate form effects state must be array"),
    equipment: normalizeEquipmentSnapshots(input.equipment),
  };

  validateAlternateFormRuntimeState(runtimeState);

  return runtimeState;
}

export function validateAlternateFormRuntimeState(runtimeState) {
  if (!isPlainObject(runtimeState)) {
    throw new Error("Alternate form runtime state must be object");
  }

  if (typeof runtimeState.initialized !== "boolean") {
    throw new Error("Alternate form runtime state initialized must be boolean");
  }

  if (runtimeState.capturedAt !== null && typeof runtimeState.capturedAt !== "string") {
    throw new Error("Alternate form runtime state capturedAt must be string or null");
  }

  if (!isPlainObject(runtimeState.pools)) {
    throw new Error("Alternate form runtime state pools must be object");
  }

  for (const [key, value] of Object.entries(runtimeState.pools)) {
    if (!POOL_KEYS.includes(key)) {
      throw new Error(`Alternate form runtime state pool is unknown: ${key}`);
    }

    if (value !== null && typeof value !== "number") {
      throw new Error(`Alternate form runtime state pool ${key} must be number or null`);
    }
  }

  validateArray(runtimeState.injuries, "Alternate form injuries state must be array");
  validateArray(runtimeState.conditions, "Alternate form conditions state must be array");
  validateArray(runtimeState.effects, "Alternate form effects state must be array");

  if (!Array.isArray(runtimeState.equipment)) {
    throw new Error("Alternate form equipment state must be array");
  }

  for (const snapshot of runtimeState.equipment) {
    validateEquipmentSnapshot(snapshot);
  }

  return true;
}

export function serializeAlternateFormRuntimeState(runtimeState) {
  validateAlternateFormRuntimeState(runtimeState);

  return {
    initialized: runtimeState.initialized,
    capturedAt: runtimeState.capturedAt,
    pools: { ...runtimeState.pools },
    injuries: cloneValue(runtimeState.injuries),
    conditions: cloneValue(runtimeState.conditions),
    effects: cloneValue(runtimeState.effects),
    equipment: runtimeState.equipment.map(snapshot => ({ ...snapshot })),
  };
}

export function captureAlternateFormRuntimeState(character, set, capturedAt) {
  const policy = set.statePolicy;
  const pools = {};

  for (const key of POOL_KEYS) {
    if (policy.pools[key] === "perForm" && character.pools[key] !== undefined) {
      pools[key] = character.pools[key].current;
    }
  }

  return createAlternateFormRuntimeState({
    initialized: true,
    capturedAt,
    pools,
    injuries: policy.injuries === "perForm"
      ? cloneValue(character.state.injuries ?? [])
      : [],
    conditions: policy.conditions === "perForm"
      ? cloneValue(character.state.conditions)
      : [],
    effects: policy.effects === "perForm"
      ? cloneValue(character.state.effects)
      : [],
    equipment: policy.equipment === "perForm"
      ? captureEquipmentSnapshots(character.equipment, set.id)
      : [],
  });
}

export function restoreAlternateFormRuntimeState(character, set, runtimeState) {
  if (!runtimeState.initialized) {
    return {
      pools: character.pools,
      state: character.state,
      equipment: character.equipment,
    };
  }

  const policy = set.statePolicy;
  const pools = cloneValue(character.pools);
  const state = cloneValue(character.state);
  let equipment = character.equipment;

  for (const key of POOL_KEYS) {
    if (
      policy.pools[key] === "perForm" &&
      Object.hasOwn(runtimeState.pools, key) &&
      pools[key] !== undefined
    ) {
      pools[key].current = runtimeState.pools[key];
    }
  }

  if (policy.injuries === "perForm") {
    state.injuries = cloneValue(runtimeState.injuries);
  }

  if (policy.conditions === "perForm") {
    state.conditions = cloneValue(runtimeState.conditions);
  }

  if (policy.effects === "perForm") {
    state.effects = cloneValue(runtimeState.effects);
  }

  if (policy.equipment === "perForm") {
    equipment = restoreEquipmentSnapshots(
      character.equipment,
      runtimeState.equipment,
      set.id,
    );
  }

  return { pools, state, equipment };
}

function captureEquipmentSnapshots(equipment, formSetId) {
  const snapshots = [];

  visitEquipment(equipment, item => {
    const key = createEquipmentStateKey(item, formSetId);

    if (key === null) return;

    snapshots.push({
      key,
      state: item.state,
      uses: item.uses,
      quantity: item.quantity,
    });
  });

  return snapshots;
}

function restoreEquipmentSnapshots(equipment, snapshots, formSetId) {
  const byKey = new Map(snapshots.map(snapshot => [snapshot.key, snapshot]));

  return equipment.map(item => restoreEquipmentItem(item, byKey, formSetId));
}

function restoreEquipmentItem(item, byKey, formSetId) {
  const key = createEquipmentStateKey(item, formSetId);
  const snapshot = key === null ? null : byKey.get(key);

  return {
    ...item,
    ...(snapshot
      ? {
        state: snapshot.state,
        uses: snapshot.uses,
        quantity: snapshot.quantity,
      }
      : {}),
    children: (item.children ?? []).map(child => (
      restoreEquipmentItem(child, byKey, formSetId)
    )),
  };
}

function createEquipmentStateKey(item, formSetId) {
  const sourceSetId = item.importMeta?.alternateFormSetId ?? null;

  if (sourceSetId !== null && sourceSetId !== formSetId) {
    return null;
  }

  if (sourceSetId === formSetId) {
    const templateId = item.importMeta?.templateId ?? "template";
    const sourceId = item.importMeta?.templateSourceComponentId ?? item.id;

    return `form:${templateId}:${sourceId}`;
  }

  return `equipment:${item.id}`;
}

function visitEquipment(items, visitor) {
  for (const item of items) {
    visitor(item);
    visitEquipment(item.children ?? [], visitor);
  }
}

function normalizeMode(value) {
  return value ?? "shared";
}

function validateMode(value, errorMessage) {
  if (!STATE_MODES.includes(value)) {
    throw new Error(errorMessage);
  }
}

function normalizePoolSnapshot(value) {
  if (value === undefined || value === null) return {};

  if (!isPlainObject(value)) {
    throw new Error("Alternate form runtime state pools must be object");
  }

  return { ...value };
}

function normalizeEquipmentSnapshots(value) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error("Alternate form equipment state must be array");
  }

  return value.map(snapshot => ({ ...snapshot }));
}

function validateEquipmentSnapshot(snapshot) {
  if (!isPlainObject(snapshot)) {
    throw new Error("Alternate form equipment snapshot must be object");
  }

  if (typeof snapshot.key !== "string" || snapshot.key === "") {
    throw new Error("Alternate form equipment snapshot key must be non-empty string");
  }

  if (typeof snapshot.state !== "string") {
    throw new Error("Alternate form equipment snapshot state must be string");
  }

  if (snapshot.uses !== null && typeof snapshot.uses !== "number") {
    throw new Error("Alternate form equipment snapshot uses must be number or null");
  }

  if (typeof snapshot.quantity !== "number") {
    throw new Error("Alternate form equipment snapshot quantity must be number");
  }
}

function normalizeArray(value, errorMessage) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return cloneValue(value);
}

function validateArray(value, errorMessage) {
  if (!Array.isArray(value)) {
    throw new Error(errorMessage);
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
