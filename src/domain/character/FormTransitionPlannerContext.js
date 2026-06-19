const INTENTS = ["voluntary", "involuntary", "automatic"];

export function validateTransitionContext(context) {
  if (!isPlainObject(context)) {
    throw new Error("Form transition context must be object");
  }

  if (!INTENTS.includes(context.intent ?? "voluntary")) {
    throw new Error("Form transition intent is invalid");
  }

  for (const key of [
    "satisfiedRequirements",
    "unsatisfiedRequirements",
    "activeImpediments",
    "inactiveImpediments",
    "activeTriggers",
    "inactiveTriggers",
  ]) {
    const value = context[key];

    if (
      value !== undefined &&
      (!Array.isArray(value) || value.some(item => typeof item !== "string"))
    ) {
      throw new Error(`Form transition context ${key} must be string array`);
    }
  }
}

export function evaluateTransitionConditions(entries, kind, context) {
  const source = selectConditionSource(context, kind);

  return entries.map(entry => ({
    ...cloneValue(entry),
    status: readConditionStatus(source, entry.id, kind),
  }));
}

export function evaluateTransitionTests(tests, context) {
  return tests.map(test => ({
    ...cloneValue(test),
    status: readStatus(
      context.testResults,
      test.id,
      ["passed", "failed", "pending"],
      "pending",
      "test",
    ),
  }));
}

function selectConditionSource(context, kind) {
  if (kind === "requirement") {
    return {
      results: context.requirementResults,
      positive: context.satisfiedRequirements,
      negative: context.unsatisfiedRequirements,
    };
  }

  if (kind === "impediment") {
    return {
      results: context.impedimentResults,
      positive: context.activeImpediments,
      negative: context.inactiveImpediments,
    };
  }

  return {
    results: context.triggerResults,
    positive: context.activeTriggers,
    negative: context.inactiveTriggers,
  };
}

function readConditionStatus(source, id, kind) {
  const allowed = kind === "requirement"
    ? ["satisfied", "unsatisfied", "unknown"]
    : ["active", "inactive", "unknown"];

  if (isPlainObject(source.results) && Object.hasOwn(source.results, id)) {
    return readStatus(
      source.results,
      id,
      allowed,
      "unknown",
      kind,
    );
  }

  if (source.positive?.includes(id)) {
    return kind === "requirement" ? "satisfied" : "active";
  }

  if (source.negative?.includes(id)) {
    return kind === "requirement" ? "unsatisfied" : "inactive";
  }

  return "unknown";
}

function readStatus(source, id, allowed, fallback, kind) {
  if (!isPlainObject(source) || !Object.hasOwn(source, id)) {
    return fallback;
  }

  const raw = source[id];
  const value = isPlainObject(raw) ? raw.status : raw;
  let status = value;

  if (typeof value === "boolean") {
    if (kind === "test") status = value ? "passed" : "failed";
    else if (kind === "requirement") status = value ? "satisfied" : "unsatisfied";
    else status = value ? "active" : "inactive";
  }

  if (!allowed.includes(status)) {
    throw new Error(`Invalid transition context status for ${id}`);
  }

  return status;
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
