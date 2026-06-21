const SELF_CONTROL_MULTIPLIERS = new Map([
  [0, 1],
  [1, 2.5],
  [6, 2],
  [7, 1.83],
  [8, 1.67],
  [9, 1.5],
  [10, 1.33],
  [11, 1.17],
  [12, 1],
  [13, 0.83],
  [14, 0.67],
  [15, 0.5],
]);

const FREQUENCY_MULTIPLIERS = new Map([
  [0, 1],
  [6, 0.5],
  [9, 1],
  [12, 2],
  [15, 3],
  [18, 4],
]);

const ADJUSTMENT_TYPES = [
  "none",
  "action-penalty",
  "reaction-penalty",
  "fright-check-penalty",
  "fright-check-bonus",
  "minor-cost-of-living-increase",
  "major-cost-of-living-increase",
  "unknown",
];

export function createTraitSelfControl(input = null, adjustmentInput = null) {
  const source = normalizeControlInput(input);
  const roll = normalizeRoll(source.roll);
  const status = roll === 0
    ? "none"
    : SELF_CONTROL_MULTIPLIERS.has(roll) ? "ready" : "unsupported";
  const multiplier = SELF_CONTROL_MULTIPLIERS.get(roll) ?? null;
  const penalty = status === "ready" ? selfControlPenalty(roll) : 0;
  const adjustmentType = normalizeAdjustmentType(
    source.adjustment ?? adjustmentInput,
  );
  const adjustmentStatus = (
    status === "unsupported" || adjustmentType === "unknown"
  )
    ? "unsupported"
    : "ready";
  const adjustment = {
    type: adjustmentType,
    status: adjustmentStatus,
    value: adjustmentStatus === "unsupported"
      ? null
      : calculateAdjustmentValue(adjustmentType, penalty, roll),
  };
  const result = {
    roll,
    status,
    multiplier,
    penalty,
    adjustment,
    raw: cloneValue(source.raw),
  };
  validateTraitSelfControl(result);
  return deepFreeze(result);
}

export function createTraitFrequency(input = null) {
  const source = normalizeFrequencyInput(input);
  const roll = normalizeRoll(source.roll);
  const status = roll === 0
    ? "none"
    : FREQUENCY_MULTIPLIERS.has(roll) ? "ready" : "unsupported";
  const result = {
    roll,
    status,
    multiplier: FREQUENCY_MULTIPLIERS.get(roll) ?? null,
    raw: cloneValue(source.raw),
  };
  validateTraitFrequency(result);
  return deepFreeze(result);
}

export function validateTraitSelfControl(value) {
  requireObject(value, "Trait selfControl");
  requireRoll(value.roll, "Trait selfControl roll");
  if (!["none", "ready", "unsupported"].includes(value.status)) {
    throw new Error("Trait selfControl status is invalid");
  }
  validateNullableFinite(value.multiplier, "Trait selfControl multiplier");
  if (!Number.isInteger(value.penalty)) {
    throw new Error("Trait selfControl penalty must be integer");
  }
  requireObject(value.adjustment, "Trait selfControl adjustment");
  if (!ADJUSTMENT_TYPES.includes(value.adjustment.type)) {
    throw new Error("Trait selfControl adjustment type is invalid");
  }
  if (!["ready", "unsupported"].includes(value.adjustment.status)) {
    throw new Error("Trait selfControl adjustment status is invalid");
  }
  validateNullableFinite(
    value.adjustment.value,
    "Trait selfControl adjustment value",
  );

  const expected = createExpectedSelfControl(value.roll, value.adjustment.type);
  if (
    value.status !== expected.status ||
    !Object.is(value.multiplier, expected.multiplier) ||
    value.penalty !== expected.penalty ||
    value.adjustment.status !== expected.adjustment.status ||
    !Object.is(value.adjustment.value, expected.adjustment.value)
  ) {
    throw new Error("Trait selfControl is stale or inconsistent");
  }
  return true;
}

export function validateTraitFrequency(value) {
  requireObject(value, "Trait frequency");
  requireRoll(value.roll, "Trait frequency roll");
  if (!["none", "ready", "unsupported"].includes(value.status)) {
    throw new Error("Trait frequency status is invalid");
  }
  validateNullableFinite(value.multiplier, "Trait frequency multiplier");
  const expectedStatus = value.roll === 0
    ? "none"
    : FREQUENCY_MULTIPLIERS.has(value.roll) ? "ready" : "unsupported";
  const expectedMultiplier = FREQUENCY_MULTIPLIERS.get(value.roll) ?? null;
  if (
    value.status !== expectedStatus ||
    !Object.is(value.multiplier, expectedMultiplier)
  ) {
    throw new Error("Trait frequency is stale or inconsistent");
  }
  return true;
}

export function serializeTraitSelfControl(value) {
  validateTraitSelfControl(value);
  return cloneValue(value);
}

export function serializeTraitFrequency(value) {
  validateTraitFrequency(value);
  return cloneValue(value);
}

export function getKnownSelfControlRolls() {
  return [...SELF_CONTROL_MULTIPLIERS.keys()];
}

export function getKnownFrequencyRolls() {
  return [...FREQUENCY_MULTIPLIERS.keys()];
}

export function getKnownSelfControlAdjustmentTypes() {
  return [...ADJUSTMENT_TYPES];
}

function createExpectedSelfControl(roll, adjustmentType) {
  const status = roll === 0
    ? "none"
    : SELF_CONTROL_MULTIPLIERS.has(roll) ? "ready" : "unsupported";
  const penalty = status === "ready" ? selfControlPenalty(roll) : 0;
  const adjustmentStatus = (
    status === "unsupported" || adjustmentType === "unknown"
  )
    ? "unsupported"
    : "ready";
  return {
    status,
    multiplier: SELF_CONTROL_MULTIPLIERS.get(roll) ?? null,
    penalty,
    adjustment: {
      status: adjustmentStatus,
      value: adjustmentStatus === "unsupported"
        ? null
        : calculateAdjustmentValue(adjustmentType, penalty, roll),
    },
  };
}

function selfControlPenalty(roll) {
  if ([14, 15].includes(roll)) return -1;
  if ([11, 12, 13].includes(roll)) return -2;
  if ([8, 9, 10].includes(roll)) return -3;
  if ([6, 7].includes(roll)) return -4;
  if (roll === 1) return -5;
  return 0;
}

function calculateAdjustmentValue(type, penalty, roll) {
  if (roll === 0 || type === "none") return 0;
  if ([
    "action-penalty",
    "reaction-penalty",
    "fright-check-penalty",
  ].includes(type)) return penalty;
  if (type === "fright-check-bonus") return -penalty;
  if (type === "minor-cost-of-living-increase") return -penalty * 5;
  if (type === "major-cost-of-living-increase") {
    return 10 * (2 ** (-(penalty + 1)));
  }
  return null;
}

function normalizeControlInput(input) {
  if (input === undefined || input === null || input === "") {
    return { roll: 0, adjustment: null, raw: input ?? null };
  }
  if (isPlainObject(input)) {
    return {
      roll: input.roll ?? input.value ?? input.cr ?? 0,
      adjustment: readAdjustmentInput(input),
      raw: hasOwn(input, "raw") ? input.raw : input,
    };
  }
  return { roll: input, adjustment: null, raw: input };
}

function readAdjustmentInput(input) {
  const candidate = input.adjustment ?? input.adjustmentType ?? input.cr_adj;
  if (isPlainObject(candidate)) {
    return candidate.type ?? candidate.value ?? candidate.key ?? null;
  }
  return candidate;
}

function normalizeFrequencyInput(input) {
  if (input === undefined || input === null || input === "") {
    return { roll: 0, raw: input ?? null };
  }
  if (isPlainObject(input)) {
    return {
      roll: input.roll ?? input.value ?? input.frequency ?? 0,
      raw: hasOwn(input, "raw") ? input.raw : input,
    };
  }
  return { roll: input, raw: input };
}

function normalizeRoll(value) {
  const parsed = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("Trait control roll must be non-negative integer");
  }
  return parsed;
}

function normalizeAdjustmentType(value) {
  const text = String(value ?? "none")
    .trim()
    .toLowerCase()
    .replaceAll("_", "-")
    .replaceAll(" ", "-");
  return ADJUSTMENT_TYPES.includes(text) ? text : "unknown";
}

function requireRoll(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be non-negative integer`);
  }
}

function validateNullableFinite(value, label) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new Error(`${label} must be finite number or null`);
  }
}

function requireObject(value, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be object`);
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

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
