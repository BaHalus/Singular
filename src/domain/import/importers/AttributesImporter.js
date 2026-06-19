const ATTRIBUTE_KEYS = ["ST", "DX", "IQ", "HT"];
const SECONDARY_KEYS = ["HP", "FP", "Will", "Per", "BasicSpeed", "BasicMove"];

export function importAttributes(source = {}) {
  const attributes = source.attributes ?? source.profile?.attributes ?? source;
  const result = {};

  for (const key of ATTRIBUTE_KEYS) {
    const value = readNumericValue(attributes, key);

    if (value !== null) {
      result[key] = {
        base: value,
        override: null,
      };
    }
  }

  return result;
}

export function importSecondaryCharacteristics(source = {}) {
  const secondary = source.secondaryCharacteristics ?? source.secondary_characteristics ?? source.profile?.secondaryCharacteristics ?? source.profile?.secondary_characteristics ?? source;
  const result = {};

  for (const key of SECONDARY_KEYS) {
    const value = readNumericValue(secondary, key);

    if (value !== null) {
      result[key] = {
        base: value,
        override: null,
      };
    }
  }

  return result;
}

function readNumericValue(source, key) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const candidates = [
    source[key],
    source[key.toLowerCase()],
    source[key.toUpperCase()],
  ];

  for (const candidate of candidates) {
    const value = normalizeNumericCandidate(candidate);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function normalizeNumericCandidate(candidate) {
  if (candidate === undefined || candidate === null) {
    return null;
  }

  if (typeof candidate === "number") {
    return candidate;
  }

  if (typeof candidate === "string" && candidate.trim() !== "") {
    const parsed = Number(candidate.trim());

    return Number.isNaN(parsed) ? null : parsed;
  }

  if (typeof candidate === "object") {
    if (typeof candidate.base === "number") return candidate.base;
    if (typeof candidate.value === "number") return candidate.value;
    if (typeof candidate.score === "number") return candidate.score;
  }

  return null;
}
