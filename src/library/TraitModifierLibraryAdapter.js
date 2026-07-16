import {
  createTraitModifier,
  isCanonicalPercentageModifier,
  serializeTraitModifier,
  validateTraitModifier,
} from "../domain/character/TraitModifiers.js";
import { isKnownTraitRole } from "../domain/character/Traits.js";
import { createLibraryAdapter } from "./LibraryAdapter.js";
import {
  createLibraryDefinition,
  serializeLibraryDefinition,
} from "./LibraryDefinition.js";

export const TRAIT_MODIFIER_LIBRARY_DOMAIN = "trait-modifier";
export const TRAIT_MODIFIER_LIBRARY_SCHEMA_VERSION = 1;

const COMPATIBILITY_MODES = new Set(["unrestricted", "declared"]);
const SELECTION_ACTION_TYPE = "trait-modifier.select";

export function createTraitModifierLibraryDefinition(input = {}) {
  requirePlainObject(input, "Trait modifier Library definition input");
  const payloadInput = input.payload ?? {
    modifier: input.modifier,
    compatibility: input.compatibility,
  };

  return createLibraryDefinition({
    ...input,
    domain: TRAIT_MODIFIER_LIBRARY_DOMAIN,
    schemaVersion: TRAIT_MODIFIER_LIBRARY_SCHEMA_VERSION,
    payload: createTraitModifierLibraryPayload(payloadInput),
  });
}

export function createTraitModifierLibraryPayload(input = {}) {
  requirePlainObject(input, "Trait modifier Library payload");
  if (!hasOwn(input, "modifier")) {
    throw new Error("Trait modifier Library payload modifier is required");
  }
  if (!hasOwn(input, "compatibility")) {
    throw new Error(
      "Trait modifier Library payload compatibility declaration is required",
    );
  }

  const payload = {
    modifier: createTraitModifier(input.modifier),
    compatibility: normalizeCompatibility(input.compatibility),
  };
  requireCanonicalModifier(payload.modifier);
  validateTraitModifierLibraryPayload(payload);
  return deepFreeze(payload);
}

export function validateTraitModifierLibraryPayload(payload) {
  requirePlainObject(payload, "Trait modifier Library payload");
  validateTraitModifier(payload.modifier);
  requireCanonicalModifier(payload.modifier);
  validateCompatibility(payload.compatibility);
  return true;
}

export function serializeTraitModifierLibraryPayload(payload) {
  validateTraitModifierLibraryPayload(payload);
  return {
    modifier: serializeTraitModifier(payload.modifier),
    compatibility: clonePortableValue(
      payload.compatibility,
      "Trait modifier Library compatibility",
    ),
  };
}

export function createTraitModifierLibraryAdapter() {
  return createLibraryAdapter({
    domain: TRAIT_MODIFIER_LIBRARY_DOMAIN,
    supportedSchemaVersions: [TRAIT_MODIFIER_LIBRARY_SCHEMA_VERSION],
    validateDefinitionPayload(payload) {
      return validateTraitModifierLibraryPayload(payload);
    },
    serializeDefinitionPayload(payload) {
      return serializeTraitModifierLibraryPayload(payload);
    },
    analyzeInstantiation({ definition, context }) {
      const targetTrait = readTargetTrait(context);
      if (targetTrait === null) {
        return {
          status: "ready-with-warnings",
          diagnostics: [{
            code: "trait-modifier-compatibility-not-evaluated",
            severity: "warning",
            definitionId: definition.id,
          }],
        };
      }

      const mismatches = findCompatibilityMismatches(
        definition.payload.compatibility,
        targetTrait,
      );
      if (mismatches.length > 0) {
        return {
          status: "blocked",
          diagnostics: mismatches.map(code => ({
            code,
            severity: "blocked",
            definitionId: definition.id,
            traitId: targetTrait.id,
          })),
        };
      }

      return { status: "ready", diagnostics: [] };
    },
    planInstantiation({ definition, analysisResults }) {
      const analysis = analysisResults.find(
        result => result.definitionId === definition.id,
      );
      return {
        status: analysis?.status ?? "ready",
        actions: [{
          id: `select-${definition.id}`,
          definitionId: definition.id,
          domain: TRAIT_MODIFIER_LIBRARY_DOMAIN,
          type: SELECTION_ACTION_TYPE,
          payload: createSelection(definition),
        }],
        diagnostics: [],
      };
    },
    executeInstantiationPlan({ action }) {
      if (action.type !== SELECTION_ACTION_TYPE) {
        throw new Error("Trait modifier Library action type is invalid");
      }
      return clonePortableValue(
        action.payload,
        "Trait modifier Library selection",
      );
    },
  });
}

function requireCanonicalModifier(modifier) {
  if (!isCanonicalPercentageModifier(modifier)) {
    throw new Error(
      "Trait modifier Library payload modifier must use the canonical percentage contract",
    );
  }
}

function createSelection(definition) {
  const portableDefinition = serializeLibraryDefinition(definition);
  const payload = serializeTraitModifierLibraryPayload(definition.payload);
  return {
    schemaVersion: TRAIT_MODIFIER_LIBRARY_SCHEMA_VERSION,
    kind: "trait-modifier-library-selection",
    definitionId: definition.id,
    modifier: payload.modifier,
    compatibility: payload.compatibility,
    origin: {
      externalIds: portableDefinition.externalIds,
      version: portableDefinition.version,
      source: portableDefinition.source,
      importMeta: portableDefinition.importMeta,
      raw: portableDefinition.raw,
    },
  };
}

function normalizeCompatibility(input) {
  requirePlainObject(input, "Trait modifier Library compatibility");
  const compatibility = {
    mode: normalizeCompatibilityMode(input.mode),
    traitRoles: normalizeUniqueStrings(
      input.traitRoles,
      "Trait modifier Library compatibility traitRoles",
    ),
    traitIds: normalizeUniqueStrings(
      input.traitIds,
      "Trait modifier Library compatibility traitIds",
    ),
    requiredTags: normalizeUniqueStrings(
      input.requiredTags,
      "Trait modifier Library compatibility requiredTags",
    ),
    excludedTags: normalizeUniqueStrings(
      input.excludedTags,
      "Trait modifier Library compatibility excludedTags",
    ),
  };
  validateCompatibility(compatibility);
  return compatibility;
}

function validateCompatibility(compatibility) {
  requirePlainObject(compatibility, "Trait modifier Library compatibility");
  const mode = normalizeCompatibilityMode(compatibility.mode);
  const traitRoles = validateUniqueStrings(
    compatibility.traitRoles,
    "Trait modifier Library compatibility traitRoles",
  );
  validateUniqueStrings(
    compatibility.traitIds,
    "Trait modifier Library compatibility traitIds",
  );
  validateUniqueStrings(
    compatibility.requiredTags,
    "Trait modifier Library compatibility requiredTags",
  );
  validateUniqueStrings(
    compatibility.excludedTags,
    "Trait modifier Library compatibility excludedTags",
  );

  for (const role of traitRoles) {
    if (!isKnownTraitRole(role)) {
      throw new Error(
        `Trait modifier Library compatibility role is invalid: ${role}`,
      );
    }
  }

  const constraints = [
    compatibility.traitRoles,
    compatibility.traitIds,
    compatibility.requiredTags,
    compatibility.excludedTags,
  ];
  const hasConstraint = constraints.some(values => values.length > 0);
  if (mode === "unrestricted" && hasConstraint) {
    throw new Error(
      "Unrestricted Trait modifier Library compatibility cannot declare constraints",
    );
  }
  if (mode === "declared" && !hasConstraint) {
    throw new Error(
      "Declared Trait modifier Library compatibility requires a constraint",
    );
  }
  return true;
}

function readTargetTrait(context) {
  if (!isPlainObject(context)) return null;
  const target = isPlainObject(context.request)
    ? context.request.targetTrait
    : context.targetTrait;
  if (target === undefined || target === null) return null;
  requirePlainObject(target, "Trait modifier Library target Trait");
  const id = normalizeRequiredString(
    target.id,
    "Trait modifier Library target Trait id",
  );
  const role = normalizeRequiredString(
    target.role,
    "Trait modifier Library target Trait role",
  );
  if (!isKnownTraitRole(role)) {
    throw new Error("Trait modifier Library target Trait role is invalid");
  }
  return {
    id,
    role,
    tags: normalizeUniqueStrings(
      target.tags,
      "Trait modifier Library target Trait tags",
    ),
  };
}

function findCompatibilityMismatches(compatibility, trait) {
  validateCompatibility(compatibility);
  if (compatibility.mode === "unrestricted") return [];
  const tags = new Set(trait.tags);
  const mismatches = [];

  if (
    compatibility.traitRoles.length > 0 &&
    !compatibility.traitRoles.includes(trait.role)
  ) {
    mismatches.push("trait-modifier-incompatible-role");
  }
  if (
    compatibility.traitIds.length > 0 &&
    !compatibility.traitIds.includes(trait.id)
  ) {
    mismatches.push("trait-modifier-incompatible-trait");
  }
  if (compatibility.requiredTags.some(tag => !tags.has(tag))) {
    mismatches.push("trait-modifier-missing-required-tag");
  }
  if (compatibility.excludedTags.some(tag => tags.has(tag))) {
    mismatches.push("trait-modifier-excluded-tag");
  }
  return mismatches;
}

function normalizeCompatibilityMode(value) {
  if (!COMPATIBILITY_MODES.has(value)) {
    throw new Error("Trait modifier Library compatibility mode is invalid");
  }
  return value;
}

function normalizeUniqueStrings(value, label) {
  if (value === undefined || value === null) return [];
  validateUniqueStrings(value, label);
  return value.map(item => item.trim());
}

function validateUniqueStrings(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  const normalized = value.map(item => normalizeRequiredString(item, label));
  if (new Set(normalized).size !== normalized.length) {
    throw new Error(`${label} must not contain duplicates`);
  }
  return normalized;
}

function normalizeRequiredString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function clonePortableValue(value, label, seen = new WeakMap()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${label} must be JSON portable`);
    return value;
  }
  if (typeof value !== "object") throw new Error(`${label} must be JSON portable`);
  if (seen.has(value)) throw new Error(`${label} must not contain cycles`);
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    value.forEach(item => clone.push(clonePortableValue(item, label, seen)));
    seen.delete(value);
    return clone;
  }
  requirePlainObject(value, label);
  const clone = {};
  seen.set(value, clone);
  Object.entries(value).forEach(([key, item]) => {
    clone[key] = clonePortableValue(item, `${label}.${key}`, seen);
  });
  seen.delete(value);
  return clone;
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) throw new Error(`${label} must be a plain object`);
}

function isPlainObject(value) {
  return value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
