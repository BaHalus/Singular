import { createMorphKnownForm } from "./MorphProfile.js";

const MATCH_PRIORITY = ["knownFormId", "templateId", "externalIds"];

export function resolveMorphKnownFormIdentity(set, candidate, hints = {}) {
  if (!plain(set?.morphProfile) || !Array.isArray(set.morphProfile.knownForms)) {
    throw new Error("Morfose identity resolution requires morph profile");
  }
  if (!plain(candidate)) {
    throw new Error("Morfose identity candidate must be object");
  }

  const knownForms = set.morphProfile.knownForms;
  const signals = [];
  const reasons = [];
  const conflictingKnownFormIds = Array.isArray(hints.conflictingKnownFormIds)
    ? [...new Set(hints.conflictingKnownFormIds.filter(nonEmptyString))]
    : [];

  if (conflictingKnownFormIds.length > 1) {
    reasons.push({
      code: "morph-known-form-id-input-conflict",
      knownFormIds: conflictingKnownFormIds,
    });
  }

  const explicitKnownFormId = nullableString(hints.explicitKnownFormId);
  if (explicitKnownFormId !== null) {
    signals.push(createSignal(
      "knownFormId",
      explicitKnownFormId,
      knownForms.filter(form => form.id === explicitKnownFormId),
    ));
  }

  if (candidate.templateId !== null) {
    signals.push(createSignal(
      "templateId",
      candidate.templateId,
      knownForms.filter(form => form.templateId === candidate.templateId),
    ));
  }

  for (const [source, value] of externalIdEntries(candidate.externalIds)) {
    signals.push(createSignal(
      "externalIds",
      { source, value: clone(value) },
      knownForms.filter(form => exactEqual(form.externalIds?.[source], value)),
    ));
  }

  for (const signal of signals) {
    if (signal.knownFormIds.length > 1) {
      reasons.push({
        code: "morph-known-form-identity-ambiguous",
        signal: signal.kind,
        value: clone(signal.value),
        knownFormIds: [...signal.knownFormIds],
      });
    }
  }

  const matchedIds = [...new Set(signals.flatMap(signal => signal.knownFormIds))];
  if (matchedIds.length > 1) {
    reasons.push({
      code: "morph-known-form-identity-conflict",
      knownFormIds: matchedIds,
    });
  }

  if (reasons.length > 0) {
    return {
      status: reasons.some(reason => reason.code.includes("ambiguous"))
        ? "ambiguous"
        : "conflict",
      matchedKnownFormId: null,
      matchedBy: null,
      signals,
      reasons,
    };
  }

  if (matchedIds.length === 0) {
    return {
      status: "new",
      matchedKnownFormId: null,
      matchedBy: null,
      signals,
      reasons: [],
    };
  }

  const matchedKnownFormId = matchedIds[0];
  const existing = knownForms.find(form => form.id === matchedKnownFormId);
  const evidenceConflicts = findEvidenceConflicts(existing, candidate);
  if (evidenceConflicts.length > 0) {
    return {
      status: "conflict",
      matchedKnownFormId: null,
      matchedBy: null,
      signals,
      reasons: evidenceConflicts,
    };
  }

  const matchedBy = MATCH_PRIORITY.find(kind => (
    signals.some(signal => (
      signal.kind === kind && signal.knownFormIds.includes(matchedKnownFormId)
    ))
  )) ?? null;

  return {
    status: "matched",
    matchedKnownFormId,
    matchedBy,
    signals,
    reasons: [],
  };
}

export function mergeMorphKnownFormEvidence(existing, incoming, context = {}) {
  if (!plain(existing) || !plain(incoming)) {
    throw new Error("Morfose known form evidence merge requires objects");
  }

  const acquiredAt = earliestTimestamp(existing.acquiredAt, incoming.acquiredAt);
  const memorizedAt = context.memorized === true
    ? earliestTimestamp(existing.memorizedAt, incoming.memorizedAt, context.occurredAt)
    : earliestTimestamp(existing.memorizedAt, incoming.memorizedAt);
  const lastObservedAt = context.observed === true
    ? latestTimestamp(existing.lastObservedAt, incoming.lastObservedAt, context.occurredAt)
    : latestTimestamp(existing.lastObservedAt, incoming.lastObservedAt);

  return createMorphKnownForm({
    ...existing,
    id: existing.id,
    templateId: existing.templateId ?? incoming.templateId,
    externalIds: mergeExternalIds(existing.externalIds, incoming.externalIds),
    name: existing.name || incoming.name,
    acquisitionMethod: existing.acquisitionMethod === "unknown"
      ? incoming.acquisitionMethod
      : existing.acquisitionMethod,
    acquiredAt,
    memorizedAt,
    lastObservedAt,
    state: context.retain === true ? "available" : existing.state,
    notes: mergeNotes(existing.notes, incoming.notes),
    tags: [...new Set([...(existing.tags ?? []), ...(incoming.tags ?? [])])],
    importMeta: mergeObjects(existing.importMeta, incoming.importMeta),
    raw: existing.raw ?? clone(incoming.raw),
  });
}

export function findMorphKnownFormsByExternalId(set, source, value) {
  if (!plain(set?.morphProfile) || !Array.isArray(set.morphProfile.knownForms)) {
    throw new Error("Morfose external identity lookup requires morph profile");
  }
  if (!nonEmptyString(source)) {
    throw new Error("Morfose external identity source must be non-empty string");
  }
  return set.morphProfile.knownForms.filter(form => (
    exactEqual(form.externalIds?.[source], value)
  ));
}

export function morphKnownFormOccupancyDelta(set, identityResolution) {
  if (identityResolution?.status !== "matched") return 1;
  const existing = set.morphProfile.knownForms.find(
    form => form.id === identityResolution.matchedKnownFormId,
  );
  return existing?.state === "forgotten" ? 1 : 0;
}

function findEvidenceConflicts(existing, incoming) {
  const reasons = [];
  if (
    existing.templateId !== null &&
    incoming.templateId !== null &&
    existing.templateId !== incoming.templateId
  ) {
    reasons.push({
      code: "morph-known-form-template-identity-conflict",
      existingTemplateId: existing.templateId,
      incomingTemplateId: incoming.templateId,
    });
  }

  for (const [source, value] of externalIdEntries(incoming.externalIds)) {
    if (
      Object.hasOwn(existing.externalIds ?? {}, source) &&
      !exactEqual(existing.externalIds[source], value)
    ) {
      reasons.push({
        code: "morph-known-form-external-id-conflict",
        source,
        existingValue: clone(existing.externalIds[source]),
        incomingValue: clone(value),
      });
    }
  }
  return reasons;
}

function createSignal(kind, value, matches) {
  return {
    kind,
    value: clone(value),
    knownFormIds: matches.map(form => form.id),
  };
}

function mergeExternalIds(existing = {}, incoming = {}) {
  const merged = clone(existing);
  for (const [source, value] of externalIdEntries(incoming)) {
    if (!Object.hasOwn(merged, source)) merged[source] = clone(value);
  }
  return merged;
}

function mergeObjects(existing, incoming) {
  if (existing === null || existing === undefined) return clone(incoming ?? null);
  if (incoming === null || incoming === undefined) return clone(existing);
  if (!plain(existing) || !plain(incoming)) return clone(incoming);
  const merged = clone(existing);
  for (const [key, value] of Object.entries(incoming)) {
    if (plain(merged[key]) && plain(value)) merged[key] = mergeObjects(merged[key], value);
    else merged[key] = clone(value);
  }
  return merged;
}

function mergeNotes(existing = "", incoming = "") {
  const values = [existing, incoming]
    .filter(value => typeof value === "string" && value.trim() !== "")
    .map(value => value.trim());
  return [...new Set(values)].join("\n\n");
}

function externalIdEntries(value) {
  if (!plain(value)) return [];
  return Object.entries(value)
    .filter(([source, item]) => nonEmptyString(source) && item !== null && item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
}

function earliestTimestamp(...values) {
  const timestamps = values.filter(validTimestamp).sort();
  return timestamps[0] ?? null;
}

function latestTimestamp(...values) {
  const timestamps = values.filter(validTimestamp).sort();
  return timestamps.at(-1) ?? null;
}

function validTimestamp(value) {
  return typeof value === "string" && value !== "" && !Number.isNaN(Date.parse(value));
}

function nullableString(value) {
  return nonEmptyString(value) ? value : null;
}

function nonEmptyString(value) {
  return typeof value === "string" && value !== "";
}

function exactEqual(left, right) {
  return stableStringify(left) === stableStringify(right);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (plain(value)) {
    return `{${Object.keys(value).sort().map(key => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, clone(item)]),
    );
  }
  return value;
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
