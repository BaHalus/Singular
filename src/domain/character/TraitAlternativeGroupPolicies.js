const DEFAULT_ALTERNATIVE_FACTOR = 0.2;

export function createTraitAlternativeGroupPolicies(input = [], traits = []) {
  if (!Array.isArray(input)) {
    throw new Error("Trait alternative group policies must be array");
  }
  if (!Array.isArray(traits)) {
    throw new Error("Traits must be array for alternative group policies");
  }

  const policies = input.map(createTraitAlternativeGroupPolicy);
  const known = new Set(policies.map(policy => policy.id));
  for (const trait of traits) {
    const groupId = trait?.alternateGroupId ?? null;
    if (groupId === null || known.has(groupId)) continue;
    policies.push(createTraitAlternativeGroupPolicy({ id: groupId }));
    known.add(groupId);
  }

  validateTraitAlternativeGroupPolicies(policies);
  return deepFreeze(policies);
}

export function createTraitAlternativeGroupPolicy(input = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Trait alternative group policy must be object");
  }

  const id = normalizeRequiredString(input.id, "Trait alternative group id");
  const alternativeFactor = input.alternativeFactor ?? DEFAULT_ALTERNATIVE_FACTOR;
  if (
    typeof alternativeFactor !== "number" ||
    !Number.isFinite(alternativeFactor) ||
    alternativeFactor < 0 ||
    alternativeFactor > 1
  ) {
    throw new Error(
      "Trait alternative group factor must be finite number between 0 and 1",
    );
  }
  const roundCostDown = input.roundCostDown ?? false;
  if (typeof roundCostDown !== "boolean") {
    throw new Error("Trait alternative group roundCostDown must be boolean");
  }

  const policy = {
    id,
    externalIds: normalizeObject(input.externalIds),
    alternativeFactor,
    roundCostDown,
    source: normalizeSource(input.source, input.importMeta),
    importMeta: normalizeNullableObject(input.importMeta),
    raw: cloneValue(input.raw ?? null),
  };

  validateTraitAlternativeGroupPolicy(policy);
  return deepFreeze(policy);
}

export function validateTraitAlternativeGroupPolicies(policies) {
  if (!Array.isArray(policies)) {
    throw new Error("Trait alternative group policies must be array");
  }
  const ids = new Set();
  for (const policy of policies) {
    validateTraitAlternativeGroupPolicy(policy);
    if (ids.has(policy.id)) {
      throw new Error(`Duplicate Trait alternative group id: ${policy.id}`);
    }
    ids.add(policy.id);
  }
  return true;
}

export function validateTraitAlternativeGroupPolicy(policy) {
  if (!isPlainObject(policy)) {
    throw new Error("Trait alternative group policy must be object");
  }
  normalizeRequiredString(policy.id, "Trait alternative group id");
  if (!isPlainObject(policy.externalIds)) {
    throw new Error("Trait alternative group externalIds must be object");
  }
  if (
    typeof policy.alternativeFactor !== "number" ||
    !Number.isFinite(policy.alternativeFactor) ||
    policy.alternativeFactor < 0 ||
    policy.alternativeFactor > 1
  ) {
    throw new Error(
      "Trait alternative group factor must be finite number between 0 and 1",
    );
  }
  if (typeof policy.roundCostDown !== "boolean") {
    throw new Error("Trait alternative group roundCostDown must be boolean");
  }
  if (!isPlainObject(policy.source)) {
    throw new Error("Trait alternative group source must be object");
  }
  validateSource(policy.source);
  if (policy.importMeta !== null && !isPlainObject(policy.importMeta)) {
    throw new Error("Trait alternative group importMeta must be object or null");
  }
  return true;
}

export function validateTraitAlternativeGroupsForCharacter(policies, traits) {
  validateTraitAlternativeGroupPolicies(policies);
  if (!Array.isArray(traits)) {
    throw new Error("Traits must be array for alternative group validation");
  }
  const policyIds = new Set(policies.map(policy => policy.id));
  for (const trait of traits) {
    const groupId = trait?.alternateGroupId ?? null;
    if (groupId !== null && !policyIds.has(groupId)) {
      throw new Error(
        `Trait ${trait.id} references missing alternative group ${groupId}`,
      );
    }
  }
  return true;
}

export function serializeTraitAlternativeGroupPolicies(policies) {
  validateTraitAlternativeGroupPolicies(policies);
  return policies.map(policy => ({
    id: policy.id,
    externalIds: cloneValue(policy.externalIds),
    alternativeFactor: policy.alternativeFactor,
    roundCostDown: policy.roundCostDown,
    source: cloneValue(policy.source),
    importMeta: cloneValue(policy.importMeta),
    raw: cloneValue(policy.raw),
  }));
}

export function projectTraitAlternativeGroupPolicies(policies) {
  validateTraitAlternativeGroupPolicies(policies);
  return Object.fromEntries(
    policies.map(policy => [
      policy.id,
      {
        alternativeFactor: policy.alternativeFactor,
        roundCostDown: policy.roundCostDown,
      },
    ]),
  );
}

export function getDefaultTraitAlternativeFactor() {
  return DEFAULT_ALTERNATIVE_FACTOR;
}

function normalizeSource(source, importMeta) {
  if (source !== undefined && source !== null) {
    if (!isPlainObject(source)) {
      throw new Error("Trait alternative group source must be object");
    }
    const normalized = {
      ...cloneValue(source),
      kind: normalizeRequiredString(
        source.kind ?? "unknown",
        "Trait alternative group source kind",
      ),
      provider: normalizeNullableString(source.provider),
      format: normalizeNullableString(source.format),
      reference: normalizeNullableString(source.reference),
      version: normalizeVersion(source.version),
    };
    validateSource(normalized);
    return normalized;
  }

  const provider = isPlainObject(importMeta) && typeof importMeta.source === "string"
    ? importMeta.source
    : null;
  return {
    kind: provider === null ? "singular" : "imported",
    provider,
    format: provider,
    reference: isPlainObject(importMeta)
      ? normalizeNullableString(importMeta.reference)
      : null,
    version: null,
  };
}

function validateSource(source) {
  normalizeRequiredString(
    source.kind,
    "Trait alternative group source kind",
  );
  normalizeNullableString(source.provider);
  normalizeNullableString(source.format);
  normalizeNullableString(source.reference);
  normalizeVersion(source.version);
}

function normalizeObject(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    throw new Error("Trait alternative group externalIds must be object");
  }
  return cloneValue(value);
}

function normalizeNullableObject(value) {
  if (value === undefined || value === null) return null;
  if (!isPlainObject(value)) {
    throw new Error("Trait alternative group importMeta must be object or null");
  }
  return cloneValue(value);
}

function normalizeNullableString(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new Error("Trait alternative group source field must be string or null");
  }
  return value;
}

function normalizeVersion(value) {
  if (value === undefined || value === null) return null;
  if (!["string", "number"].includes(typeof value)) {
    throw new Error("Trait alternative group source version must be string, number or null");
  }
  return value;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${label} must be non-empty string`);
  }
  return value;
}

function cloneValue(value, seen = new WeakMap()) {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const result = [];
    seen.set(value, result);
    for (const item of value) result.push(cloneValue(item, seen));
    return result;
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return seen.get(value);
    const result = {};
    seen.set(value, result);
    for (const [key, item] of Object.entries(value)) {
      result[key] = cloneValue(item, seen);
    }
    return result;
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
