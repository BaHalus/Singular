const NO_MEMORIZATION_REQUIRED = "gurps.morph.no-memorization-required";
const CANNOT_MEMORIZE_FORMS = "gurps.morph.cannot-memorize-forms";

export function resolveMorphMemorizationPolicy(character, set) {
  if (!plain(character)) throw new Error("Character must be object");
  if (!plain(set) || set.mechanism !== "morph" || !plain(set.morphProfile)) {
    throw new Error("Morfose memorization policy requires morph form set");
  }

  const recognized = new Set(
    (set.morphProfileResolution?.recognizedModifiers ?? [])
      .filter(item => item?.enabled !== false)
      .map(item => item.ruleId),
  );
  const hasAutomatic = recognized.has(NO_MEMORIZATION_REQUIRED);
  const hasForbidden = recognized.has(CANNOT_MEMORIZE_FORMS);

  if (hasAutomatic && hasForbidden) {
    return {
      mode: "unknown",
      capacityBasis: "unknown",
      declaredCapacity: null,
      effectiveCapacity: null,
      durationSeconds: null,
      retention: "conflict",
      originalRequired: true,
      source: "modifier-conflict",
      conflicts: [NO_MEMORIZATION_REQUIRED, CANNOT_MEMORIZE_FORMS],
    };
  }

  if (hasAutomatic) {
    return {
      mode: "permanent",
      capacityBasis: "unlimited",
      declaredCapacity: null,
      effectiveCapacity: null,
      durationSeconds: 0,
      retention: "automatic",
      originalRequired: true,
      source: "modifier",
      conflicts: [],
    };
  }

  if (hasForbidden) {
    return {
      mode: "none",
      capacityBasis: "notApplicable",
      declaredCapacity: null,
      effectiveCapacity: null,
      durationSeconds: null,
      retention: "forbidden",
      originalRequired: true,
      source: "modifier",
      conflicts: [],
    };
  }

  const declared = set.morphProfile.memorization;
  if (declared.mode === "permanent") {
    return {
      mode: "permanent",
      capacityBasis: "unlimited",
      declaredCapacity: null,
      effectiveCapacity: null,
      durationSeconds: declared.durationSeconds ?? 0,
      retention: "automatic",
      originalRequired: true,
      source: "profile",
      conflicts: [],
    };
  }

  if (declared.mode === "none") {
    return {
      mode: "none",
      capacityBasis: "notApplicable",
      declaredCapacity: null,
      effectiveCapacity: null,
      durationSeconds: null,
      retention: "forbidden",
      originalRequired: true,
      source: "profile",
      conflicts: [],
    };
  }

  if (declared.mode === "limited") {
    const capacityBasis = normalizeCapacityBasis(declared);
    return {
      mode: "limited",
      capacityBasis,
      declaredCapacity: declared.capacity,
      effectiveCapacity: resolveCapacity(character, declared, capacityBasis),
      durationSeconds: declared.durationSeconds ?? 60,
      retention: "memorized",
      originalRequired: true,
      source: "profile",
      conflicts: [],
    };
  }

  if (hasResolvedMorphSource(set)) {
    return {
      mode: "limited",
      capacityBasis: "iq",
      declaredCapacity: null,
      effectiveCapacity: effectiveIq(character),
      durationSeconds: 60,
      retention: "memorized",
      originalRequired: true,
      source: "gurps-basic-set",
      conflicts: [],
    };
  }

  return {
    mode: "unknown",
    capacityBasis: "unknown",
    declaredCapacity: declared.capacity ?? null,
    effectiveCapacity: null,
    durationSeconds: declared.durationSeconds ?? null,
    retention: "unknown",
    originalRequired: true,
    source: "undeclared",
    conflicts: [],
  };
}

export function countOccupiedMorphMemorySlots(set) {
  if (!plain(set?.morphProfile)) {
    throw new Error("Morfose memory count requires morph profile");
  }
  return set.morphProfile.knownForms.filter(form => form.state !== "forgotten").length;
}

function normalizeCapacityBasis(declared) {
  if (declared.capacityBasis && declared.capacityBasis !== "unknown") {
    return declared.capacityBasis;
  }
  if (declared.capacity !== null && declared.capacity !== undefined) return "fixed";
  return "iq";
}

function resolveCapacity(character, declared, basis) {
  if (basis === "iq") return effectiveIq(character);
  if (basis === "fixed") return declared.capacity;
  if (["unlimited", "notApplicable"].includes(basis)) return null;
  return null;
}

function effectiveIq(character) {
  const iq = character.attributes?.IQ;
  if (!plain(iq)) return null;
  const value = iq.override ?? iq.base;
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function hasResolvedMorphSource(set) {
  return ["existing-link", "unique-name-match"].includes(
    set.morphProfileResolution?.sourceTraitResolution,
  );
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
