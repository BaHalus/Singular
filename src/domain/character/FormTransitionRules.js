const RETURN_MODES = ["manual", "automatic", "involuntary", "locked", "unspecified"];
const COST_TIMINGS = ["activation", "deactivation", "maintenance", "unspecified"];
const TEST_KINDS = ["attribute", "skill", "selfControl", "other"];

export function createFormTransitionRules(input = {}) {
  const rules = {
    activation: createTransitionPhase(input.activation),
    deactivation: createTransitionPhase(input.deactivation),
    duration: {
      minimumSeconds: normalizeNullableNumber(
        input.duration?.minimumSeconds,
        "Form transition minimum duration must be number or null",
      ),
      maximumSeconds: normalizeNullableNumber(
        input.duration?.maximumSeconds,
        "Form transition maximum duration must be number or null",
      ),
    },
    return: {
      mode: input.return?.mode ?? "manual",
      targetFormId: normalizeNullableString(
        input.return?.targetFormId,
        "Form transition return targetFormId must be string or null",
      ),
      triggers: normalizeConditionEntries(
        input.return?.triggers,
        "return-trigger",
      ),
    },
    impediments: normalizeConditionEntries(
      input.impediments,
      "impediment",
    ),
  };

  validateFormTransitionRules(rules);

  return rules;
}

export function validateFormTransitionRules(rules) {
  if (!isPlainObject(rules)) {
    throw new Error("Form transition rules must be object");
  }

  validateTransitionPhase(rules.activation, "activation");
  validateTransitionPhase(rules.deactivation, "deactivation");

  if (!isPlainObject(rules.duration)) {
    throw new Error("Form transition duration must be object");
  }

  validateNullableNumber(
    rules.duration.minimumSeconds,
    "Form transition minimum duration must be number or null",
  );
  validateNullableNumber(
    rules.duration.maximumSeconds,
    "Form transition maximum duration must be number or null",
  );

  if (
    rules.duration.minimumSeconds !== null &&
    rules.duration.maximumSeconds !== null &&
    rules.duration.minimumSeconds > rules.duration.maximumSeconds
  ) {
    throw new Error("Form transition minimum duration cannot exceed maximum duration");
  }

  if (!isPlainObject(rules.return)) {
    throw new Error("Form transition return must be object");
  }

  if (!RETURN_MODES.includes(rules.return.mode)) {
    throw new Error("Form transition return mode is invalid");
  }

  validateNullableString(
    rules.return.targetFormId,
    "Form transition return targetFormId must be string or null",
  );
  validateConditionEntries(rules.return.triggers, "Form transition return triggers must be array");
  validateConditionEntries(rules.impediments, "Form transition impediments must be array");

  return true;
}

export function serializeFormTransitionRules(rules) {
  validateFormTransitionRules(rules);

  return cloneValue(rules);
}

function createTransitionPhase(input = {}) {
  return {
    baseTimeSeconds: normalizeNullableNumber(
      input.baseTimeSeconds,
      "Form transition base time must be number or null",
    ),
    timeStepsDelta: normalizeInteger(
      input.timeStepsDelta,
      0,
      "Form transition timeStepsDelta must be integer",
    ),
    maneuver: normalizeNullableString(
      input.maneuver,
      "Form transition maneuver must be string or null",
    ),
    costs: normalizeCosts(input.costs),
    tests: normalizeTests(input.tests),
    requirements: normalizeConditionEntries(input.requirements, "requirement"),
    triggers: normalizeConditionEntries(input.triggers, "trigger"),
    involuntary: input.involuntary ?? false,
    interruptible: input.interruptible ?? true,
  };
}

function validateTransitionPhase(phase, phaseName) {
  if (!isPlainObject(phase)) {
    throw new Error(`Form transition ${phaseName} phase must be object`);
  }

  validateNullableNumber(
    phase.baseTimeSeconds,
    `Form transition ${phaseName} base time must be number or null`,
  );

  if (!Number.isInteger(phase.timeStepsDelta)) {
    throw new Error(`Form transition ${phaseName} timeStepsDelta must be integer`);
  }

  validateNullableString(
    phase.maneuver,
    `Form transition ${phaseName} maneuver must be string or null`,
  );

  validateCosts(phase.costs);
  validateTests(phase.tests);
  validateConditionEntries(
    phase.requirements,
    `Form transition ${phaseName} requirements must be array`,
  );
  validateConditionEntries(
    phase.triggers,
    `Form transition ${phaseName} triggers must be array`,
  );

  if (typeof phase.involuntary !== "boolean") {
    throw new Error(`Form transition ${phaseName} involuntary must be boolean`);
  }

  if (typeof phase.interruptible !== "boolean") {
    throw new Error(`Form transition ${phaseName} interruptible must be boolean`);
  }
}

function normalizeCosts(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Form transition costs must be array");
  }

  return value.map((cost, index) => ({
    id: cost.id ?? `transition-cost-${index + 1}`,
    resource: cost.resource ?? "",
    amount: normalizeNullableNumber(
      cost.amount,
      "Form transition cost amount must be number or null",
    ),
    timing: cost.timing ?? "unspecified",
    intervalSeconds: normalizeNullableNumber(
      cost.intervalSeconds,
      "Form transition cost interval must be number or null",
    ),
    notes: cost.notes ?? "",
  }));
}

function validateCosts(costs) {
  if (!Array.isArray(costs)) {
    throw new Error("Form transition costs must be array");
  }

  for (const cost of costs) {
    if (!isPlainObject(cost)) {
      throw new Error("Form transition cost must be object");
    }
    if (typeof cost.id !== "string" || cost.id === "") {
      throw new Error("Form transition cost id must be non-empty string");
    }
    if (typeof cost.resource !== "string") {
      throw new Error("Form transition cost resource must be string");
    }
    validateNullableNumber(
      cost.amount,
      "Form transition cost amount must be number or null",
    );
    if (!COST_TIMINGS.includes(cost.timing)) {
      throw new Error("Form transition cost timing is invalid");
    }
    validateNullableNumber(
      cost.intervalSeconds,
      "Form transition cost interval must be number or null",
    );
    if (typeof cost.notes !== "string") {
      throw new Error("Form transition cost notes must be string");
    }
  }
}

function normalizeTests(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Form transition tests must be array");
  }

  return value.map((test, index) => ({
    id: test.id ?? `transition-test-${index + 1}`,
    kind: test.kind ?? "other",
    target: test.target ?? "",
    modifier: normalizeSignedNumber(
      test.modifier,
      0,
      "Form transition test modifier must be number",
    ),
    notes: test.notes ?? "",
  }));
}

function validateTests(tests) {
  if (!Array.isArray(tests)) {
    throw new Error("Form transition tests must be array");
  }

  for (const test of tests) {
    if (!isPlainObject(test)) {
      throw new Error("Form transition test must be object");
    }
    if (typeof test.id !== "string" || test.id === "") {
      throw new Error("Form transition test id must be non-empty string");
    }
    if (!TEST_KINDS.includes(test.kind)) {
      throw new Error("Form transition test kind is invalid");
    }
    if (typeof test.target !== "string") {
      throw new Error("Form transition test target must be string");
    }
    if (typeof test.modifier !== "number" || Number.isNaN(test.modifier)) {
      throw new Error("Form transition test modifier must be number");
    }
    if (typeof test.notes !== "string") {
      throw new Error("Form transition test notes must be string");
    }
  }
}

function normalizeConditionEntries(value, defaultKind) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Form transition condition entries must be array");
  }

  return value.map((entry, index) => ({
    id: entry.id ?? `${defaultKind}-${index + 1}`,
    kind: entry.kind ?? defaultKind,
    description: entry.description ?? "",
    notes: entry.notes ?? "",
  }));
}

function validateConditionEntries(entries, errorMessage) {
  if (!Array.isArray(entries)) {
    throw new Error(errorMessage);
  }

  for (const entry of entries) {
    if (!isPlainObject(entry)) {
      throw new Error("Form transition condition entry must be object");
    }
    if (typeof entry.id !== "string" || entry.id === "") {
      throw new Error("Form transition condition entry id must be non-empty string");
    }
    if (typeof entry.kind !== "string") {
      throw new Error("Form transition condition entry kind must be string");
    }
    if (typeof entry.description !== "string") {
      throw new Error("Form transition condition entry description must be string");
    }
    if (typeof entry.notes !== "string") {
      throw new Error("Form transition condition entry notes must be string");
    }
  }
}

function normalizeNullableNumber(value, errorMessage) {
  if (value === undefined || value === null) return null;
  return normalizeNumber(value, null, errorMessage);
}

function normalizeNumber(value, fallback, errorMessage) {
  if (value === undefined || value === null) return fallback;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(errorMessage);
  }
  return number;
}

function normalizeSignedNumber(value, fallback, errorMessage) {
  if (value === undefined || value === null) return fallback;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(errorMessage);
  }
  return number;
}

function normalizeInteger(value, fallback, errorMessage) {
  if (value === undefined || value === null) return fallback;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number)) {
    throw new Error(errorMessage);
  }
  return number;
}

function normalizeNullableString(value, errorMessage) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error(errorMessage);
  }
  return value;
}

function validateNullableString(value, errorMessage) {
  if (value !== null && typeof value !== "string") {
    throw new Error(errorMessage);
  }
}

function validateNullableNumber(value, errorMessage) {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0)) {
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
