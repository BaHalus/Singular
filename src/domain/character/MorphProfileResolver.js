import { createCharacter } from "./Character.js";
import { createMorphProfile } from "./MorphProfile.js";

const PROFILE_PATHS = [
  "pointLimitMode",
  "pointLimit",
  "pointLimitSource",
  "catalog.mode",
  "catalog.capacity",
  "memorization.mode",
  "memorization.capacity",
  "improvisation.mode",
  "improvisation.pointLimit",
  "improvisation.traitScope",
  "improvisation.availabilityScope",
  "improvisation.compositionScope",
];

const PRIORITY = {
  existing: 0,
  imported: 50,
  builtin: 100,
  campaign: 200,
  explicit: 300,
  manual: 10000,
};

const BUILTIN_MODIFIERS = [
  {
    id: "gurps.morph.unlimited",
    names: ["Ilimitada", "Unlimited"],
    profile: {
      pointLimitMode: "unlimited",
      pointLimit: null,
      pointLimitSource: "modifier",
      improvisation: { compositionScope: "unrestricted" },
    },
  },
  {
    id: "gurps.morph.improvised-forms",
    names: ["Formas Improvisadas", "Improvised Forms"],
    profile: {
      improvisation: {
        mode: "allowed",
        traitScope: "physicalNatural",
        availabilityScope: "settingOnly",
        compositionScope: "sameComposition",
      },
    },
  },
  {
    id: "gurps.morph.cosmic-improvised-forms",
    names: [
      "Cósmica (Para Formas Improvisadas)",
      "Cosmic (For Improvised Forms)",
    ],
    profile: {
      improvisation: { availabilityScope: "unrestricted" },
    },
  },
  {
    id: "gurps.morph.no-memorization-required",
    names: ["Não Exige Memorização", "No Memorization Required"],
    profile: {
      memorization: { mode: "none" },
    },
  },
  {
    id: "gurps.morph.cannot-memorize-forms",
    names: ["Incapaz de Memorizar Formas", "Cannot Memorize Forms"],
    profile: {
      memorization: { mode: "none" },
    },
  },
  {
    id: "gurps.morph.cosmetic",
    names: ["Cosmética", "Cosmetic"],
    profile: null,
  },
  {
    id: "gurps.morph.retains-shape",
    names: ["Mantém a Forma", "Retains Shape"],
    profile: null,
  },
  {
    id: "gurps.morph.mass-conservation",
    names: ["Conservação da Massa", "Mass Conservation"],
    profile: null,
  },
  {
    id: "gurps.morph.active-change",
    names: ["Mudança Ativa", "Active Change"],
    profile: null,
  },
  {
    id: "gurps.morph.imperfect",
    names: ["Imperfeita", "Imperfect"],
    profile: null,
  },
  {
    id: "gurps.morph.nonliving-only",
    names: ["Somente Formas Não-Vivas", "Only Nonliving Forms"],
    profile: null,
  },
];

export function analyzeMorphProfile(character, formSetId, options = {}) {
  validateCharacterShape(character);
  const set = findMorphSet(character, formSetId);
  const diagnostics = [];
  const source = resolveSourceTrait(character, set, diagnostics);
  const evidence = source.trait === null
    ? []
    : collectMorphEvidence(source.trait);
  const signals = [];
  const recognizedModifiers = [];
  const unresolvedModifiers = [];
  const ignoredModifiers = [];

  if (source.trait?.levels !== null && source.trait?.levels !== undefined) {
    const pointLimit = readNonNegativeNumber(source.trait.levels);
    if (pointLimit !== null) {
      pushPartialSignals({
        pointLimitMode: "limited",
        pointLimit,
        pointLimitSource: "imported",
      }, metadata("imported", PRIORITY.imported, [summarizeEvidence({
        kind: "trait",
        value: source.trait,
        enabled: true,
      }, "trait-levels")]), signals);
    }
  }

  const enabledBuiltinIds = new Set();
  for (const item of evidence) {
    const rule = item.kind === "modifier"
      ? findBuiltinModifier(item.name)
      : null;

    if (!item.enabled) {
      ignoredModifiers.push(summarizeEvidence(item, rule?.id ?? null));
      continue;
    }

    if (item.kind === "modifier") {
      if (rule === null) {
        unresolvedModifiers.push(summarizeEvidence(item));
      } else {
        enabledBuiltinIds.add(rule.id);
        const mappedPaths = rule.profile === null
          ? []
          : pathsFromPartial(rule.profile);
        recognizedModifiers.push({
          ...summarizeEvidence(item, rule.id),
          mappedPaths,
        });
        if (rule.profile !== null) {
          pushPartialSignals(
            rule.profile,
            metadata("builtin", PRIORITY.builtin, [summarizeEvidence(item, rule.id)]),
            signals,
          );
        }
      }
    }

    for (const value of [item.value, item.value?.raw]) {
      const explicit = readExplicitProfile(value);
      if (explicit === null) continue;
      pushPartialSignals(
        explicit,
        metadata("explicit", PRIORITY.explicit, [
          summarizeEvidence(item, "explicit-morph-profile"),
        ]),
        signals,
      );
    }
  }

  if (
    enabledBuiltinIds.has("gurps.morph.cosmetic") &&
    enabledBuiltinIds.has("gurps.morph.imperfect")
  ) {
    diagnostics.push({
      type: "incompatible-modifiers",
      ruleIds: ["gurps.morph.cosmetic", "gurps.morph.imperfect"],
      message: "Cosmética e Imperfeita são incompatíveis para Morfose",
    });
  }
  if (
    enabledBuiltinIds.has("gurps.morph.cosmic-improvised-forms") &&
    !enabledBuiltinIds.has("gurps.morph.improvised-forms")
  ) {
    diagnostics.push({
      type: "modifier-dependency",
      ruleId: "gurps.morph.cosmic-improvised-forms",
      requiresRuleId: "gurps.morph.improvised-forms",
      message: "Cósmica para Formas Improvisadas não concede improvisação sozinha",
    });
  }

  for (const rule of normalizeCampaignRules([
    ...optionalRules(options.rules),
    ...optionalRules(options.campaignRules),
  ])) {
    if (!rule.enabled || !matchesCampaignRule(rule, set, source.trait, evidence)) {
      continue;
    }
    pushPartialSignals(
      rule.morphProfile,
      metadata("campaign", rule.priority, [{
        kind: "campaignRule",
        id: rule.id,
        name: rule.name,
        enabled: true,
        sourceTraitId: source.trait?.id ?? null,
        ruleId: rule.id,
      }]),
      signals,
    );
  }

  const manualOverride = Object.hasOwn(options, "manualOverride")
    ? options.manualOverride
    : set.morphProfileOverride;
  if (manualOverride !== undefined && manualOverride !== null) {
    pushPartialSignals(
      manualOverride,
      metadata("manual", PRIORITY.manual, [{
        kind: "manualOverride",
        id: options.overrideId ?? "manual",
        name: options.overrideName ?? "Manual override",
        enabled: true,
        sourceTraitId: source.trait?.id ?? null,
        ruleId: null,
      }]),
      signals,
    );
  }

  const baseProfile = createMorphProfile(
    set.morphProfileResolution?.baseProfile ?? set.morphProfile,
  );
  const resolved = resolveSignals(baseProfile, signals, diagnostics);

  return {
    setId: set.id,
    sourceTraitId: source.trait?.id ?? null,
    sourceTraitResolution: source.resolution,
    baseProfile,
    morphProfile: resolved.profile,
    decisions: resolved.decisions,
    diagnostics,
    evidence: evidence.map(item => summarizeEvidence(item)),
    recognizedModifiers,
    unresolvedModifiers,
    ignoredModifiers,
  };
}

export function resolveMorphProfile(character, formSetId, options = {}) {
  return {
    ...analyzeMorphProfile(character, formSetId, options),
    resolvedAt: normalizeTimestamp(options.now),
  };
}

export function applyResolvedMorphProfile(character, formSetId, options = {}) {
  const set = findMorphSet(character, formSetId);
  const resolution = resolveMorphProfile(character, formSetId, options);
  const persistedOverride = Object.hasOwn(options, "manualOverride")
    ? clone(options.manualOverride)
    : set.morphProfileOverride;
  const nextSets = character.alternateFormSets.map(candidate => (
    candidate.id === formSetId
      ? {
        ...candidate,
        sourceTraitId: resolution.sourceTraitId ?? candidate.sourceTraitId,
        morphProfile: resolution.morphProfile,
        morphProfileOverride: persistedOverride ?? null,
        morphProfileResolution: resolution,
      }
      : candidate
  ));

  return {
    character: createCharacter({
      ...character,
      alternateFormSets: nextSets,
      metadata: {
        ...character.metadata,
        updatedAt: resolution.resolvedAt,
      },
    }),
    resolution,
  };
}

export function applyResolvedMorphProfiles(character, options = {}) {
  let current = character;
  const resolutions = [];

  for (const set of character.alternateFormSets) {
    if (set.mechanism !== "morph") continue;
    const perSetOptions = { ...options };
    const hasOverride = options.manualOverrides &&
      Object.hasOwn(options.manualOverrides, set.id);
    if (hasOverride) {
      perSetOptions.manualOverride = options.manualOverrides[set.id];
    } else if (!Object.hasOwn(options, "manualOverride")) {
      delete perSetOptions.manualOverride;
    }
    const applied = applyResolvedMorphProfile(current, set.id, perSetOptions);
    current = applied.character;
    resolutions.push(applied.resolution);
  }

  return { character: current, resolutions };
}

export function collectMorphEvidence(trait) {
  const evidence = [createEvidence("trait", trait, true)];
  pushExplicitRawEvidence(evidence, trait, "trait", true);
  for (const modifier of trait.modifiers ?? []) {
    pushNestedEvidence(evidence, "modifier", modifier);
  }
  for (const feature of trait.features ?? []) {
    pushNestedEvidence(evidence, "feature", feature);
  }
  return evidence;
}

function resolveSourceTrait(character, set, diagnostics) {
  if (set.sourceTraitId !== null) {
    const trait = character.advantages.find(item => item.id === set.sourceTraitId) ?? null;
    if (trait === null) {
      diagnostics.push({
        type: "source-trait-missing",
        sourceTraitId: set.sourceTraitId,
      });
      return { trait: null, resolution: "missing-explicit" };
    }
    if (!isMorphTrait(trait)) {
      diagnostics.push({
        type: "source-trait-mismatch",
        sourceTraitId: set.sourceTraitId,
        name: trait.name,
      });
      return { trait: null, resolution: "mismatched-explicit" };
    }
    return { trait, resolution: "existing-link" };
  }

  const candidates = character.advantages.filter(isMorphTrait);
  if (candidates.length === 1) {
    return { trait: candidates[0], resolution: "unique-name-match" };
  }
  if (candidates.length === 0) {
    diagnostics.push({ type: "source-trait-not-found", name: "Morfose" });
    return { trait: null, resolution: "not-found" };
  }

  diagnostics.push({
    type: "source-trait-ambiguous",
    candidateIds: candidates.map(item => item.id),
  });
  return { trait: null, resolution: "ambiguous" };
}

function pushNestedEvidence(evidence, kind, value) {
  const enabled = value?.disabled !== true && value?.enabled !== false;
  evidence.push(createEvidence(kind, value, enabled));
  pushExplicitRawEvidence(evidence, value, kind, enabled);
  for (const modifier of value?.modifiers ?? []) {
    pushNestedEvidence(evidence, "modifier", modifier);
  }
  for (const feature of value?.features ?? []) {
    pushNestedEvidence(evidence, "feature", feature);
  }
}

function pushExplicitRawEvidence(evidence, value, parentKind, enabled) {
  if (!plain(value?.raw) || readExplicitProfile(value.raw) === null) return;
  evidence.push(createEvidence(`${parentKind}Raw`, value.raw, enabled));
}

function createEvidence(kind, value, enabled) {
  return {
    kind,
    id: value?.id ?? null,
    name: value?.name ?? value?.type ?? "",
    type: value?.type ?? null,
    enabled,
    sourceTraitId: null,
    value,
  };
}

function findBuiltinModifier(name) {
  const normalized = normalizeText(name);
  return BUILTIN_MODIFIERS.find(rule => (
    rule.names.some(candidate => normalizeText(candidate) === normalized)
  )) ?? null;
}

function pushPartialSignals(input, signalMetadata, signals) {
  const partial = normalizePartialProfile(input, signalMetadata.source);
  for (const path of PROFILE_PATHS) {
    const value = getPath(partial, path);
    if (value === undefined) continue;
    signals.push({
      path,
      value,
      source: signalMetadata.source,
      priority: signalMetadata.priority,
      derivedFrom: signalMetadata.derivedFrom,
    });
  }
}

function normalizePartialProfile(input, source) {
  if (!plain(input)) throw new Error("Morfose profile directive must be object");
  const partial = clone(input);

  if (Object.hasOwn(partial, "pointLimit")) {
    if (partial.pointLimit === null) {
      partial.pointLimitMode ??= "undeclared";
    } else {
      partial.pointLimitMode ??= "limited";
    }
    partial.pointLimitSource ??= sourceToPointLimitSource(source);
  }
  if (partial.pointLimitMode === "unlimited") {
    partial.pointLimit = null;
    partial.pointLimitSource ??= sourceToPointLimitSource(source);
  }
  if (partial.pointLimitMode === "undeclared") {
    partial.pointLimit = null;
    partial.pointLimitSource ??= "undeclared";
  }

  validatePartialPath(partial, "pointLimitMode", ["undeclared", "limited", "unlimited"]);
  validatePartialPath(partial, "pointLimitSource", [
    "undeclared", "manual", "imported", "modifier", "campaign",
  ]);
  validatePartialPath(partial, "catalog.mode", ["unknown", "knownOnly", "open"]);
  validatePartialPath(partial, "memorization.mode", ["unknown", "none", "permanent", "limited"]);
  validatePartialPath(partial, "improvisation.mode", ["unknown", "forbidden", "allowed", "conditional"]);
  validatePartialPath(partial, "improvisation.traitScope", ["unknown", "physicalNatural"]);
  validatePartialPath(partial, "improvisation.availabilityScope", [
    "unknown", "settingOnly", "unrestricted",
  ]);
  validatePartialPath(partial, "improvisation.compositionScope", [
    "unknown", "sameComposition", "unrestricted",
  ]);
  for (const path of [
    "pointLimit",
    "catalog.capacity",
    "memorization.capacity",
    "improvisation.pointLimit",
  ]) {
    const value = getPath(partial, path);
    if (value !== undefined && value !== null && readNonNegativeNumber(value) === null) {
      throw new Error(`Morfose profile value is invalid for ${path}`);
    }
    if (value !== undefined && value !== null) {
      setPath(partial, path, Number(value));
    }
  }
  return partial;
}

function resolveSignals(baseProfile, signals, diagnostics) {
  const values = createMorphProfile(baseProfile);
  const decisions = baselineDecisions(values);

  for (const signal of signals) {
    const current = getPath(decisions, signal.path);
    if (signal.priority > current.priority) {
      setPath(values, signal.path, clone(signal.value));
      setPath(decisions, signal.path, {
        value: clone(signal.value),
        source: signal.source,
        priority: signal.priority,
        derivedFrom: [...signal.derivedFrom],
        overridden: signal.source === "manual",
        conflict: false,
      });
      continue;
    }
    if (signal.priority === current.priority && equal(signal.value, current.value)) {
      current.derivedFrom = mergeEvidence(current.derivedFrom, signal.derivedFrom);
      continue;
    }
    if (signal.priority === current.priority) {
      diagnostics.push({
        type: "conflict",
        path: signal.path,
        keptValue: current.value,
        rejectedValue: signal.value,
        priority: signal.priority,
        keptSource: current.source,
        rejectedSource: signal.source,
        derivedFrom: signal.derivedFrom,
      });
      current.conflict = true;
    }
  }

  harmonizePointLimit(values, decisions);
  return {
    profile: createMorphProfile(values),
    decisions,
  };
}

function harmonizePointLimit(values, decisions) {
  if (values.pointLimitMode === "unlimited") {
    values.pointLimit = null;
  } else if (values.pointLimitMode === "undeclared") {
    values.pointLimit = null;
    if (getPath(decisions, "pointLimitSource").priority === PRIORITY.existing) {
      values.pointLimitSource = "undeclared";
    }
  } else if (values.pointLimit === null) {
    throw new Error("Resolved limited Morfose profile requires pointLimit");
  }
}

function baselineDecisions(profile) {
  const decisions = { catalog: {}, memorization: {}, improvisation: {} };
  for (const path of PROFILE_PATHS) {
    setPath(decisions, path, {
      value: clone(getPath(profile, path)),
      source: "existing",
      priority: PRIORITY.existing,
      derivedFrom: [],
      overridden: false,
      conflict: false,
    });
  }
  return decisions;
}

function readExplicitProfile(value) {
  if (!plain(value)) return null;
  if (plain(value.morphProfile)) return value.morphProfile;
  if (plain(value.morph_profile)) return value.morph_profile;
  if (
    ["morphprofile", "morph-profile", "morph_profile"].includes(
      normalizeText(value.type).replaceAll(" ", ""),
    ) && plain(value.profile)
  ) {
    return value.profile;
  }
  return null;
}

function normalizeCampaignRules(rules) {
  return rules.map((rule, index) => {
    if (!plain(rule)) throw new Error("Morfose campaign rule must be object");
    const profile = rule.morphProfile ?? rule.profile;
    if (!plain(profile)) throw new Error("Morfose campaign rule must define morphProfile");
    return {
      id: rule.id ?? `morph-rule-${index + 1}`,
      name: rule.name ?? "",
      enabled: rule.enabled !== false,
      priority: Number.isFinite(Number(rule.priority))
        ? Number(rule.priority)
        : PRIORITY.campaign,
      match: plain(rule.match) ? rule.match : {},
      morphProfile: profile,
    };
  });
}

function matchesCampaignRule(rule, set, trait, evidence) {
  const match = rule.match;
  if (match.setId !== undefined && match.setId !== set.id) return false;
  if (match.sourceTraitId !== undefined && match.sourceTraitId !== trait?.id) return false;
  if (match.traitName !== undefined && normalizeText(match.traitName) !== normalizeText(trait?.name)) return false;
  if (match.modifierName !== undefined && !evidence.some(item => (
    item.kind === "modifier" &&
    item.enabled &&
    normalizeText(item.name) === normalizeText(match.modifierName)
  ))) return false;
  return true;
}

function optionalRules(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Morfose rules must be array");
  return value;
}

function pathsFromPartial(input) {
  const partial = normalizePartialProfile(input, "builtin");
  return PROFILE_PATHS.filter(path => getPath(partial, path) !== undefined);
}

function metadata(source, priority, derivedFrom) {
  return { source, priority, derivedFrom };
}

function sourceToPointLimitSource(source) {
  if (["manual", "imported", "modifier", "campaign"].includes(source)) {
    return source;
  }
  if (source === "builtin") return "modifier";
  if (source === "explicit") return "imported";
  return "undeclared";
}

function summarizeEvidence(item, ruleId = null) {
  return {
    kind: item.kind,
    id: item.id ?? item.value?.id ?? null,
    name: item.name ?? item.value?.name ?? item.value?.type ?? "",
    type: item.type ?? item.value?.type ?? null,
    enabled: item.enabled !== false,
    sourceTraitId: item.sourceTraitId ?? null,
    ruleId,
  };
}

function mergeEvidence(left, right) {
  const merged = [...left];
  for (const item of right) {
    if (!merged.some(candidate => equal(candidate, item))) merged.push(item);
  }
  return merged;
}

function validatePartialPath(partial, path, allowed) {
  const value = getPath(partial, path);
  if (value !== undefined && !allowed.includes(value)) {
    throw new Error(`Morfose profile value is invalid for ${path}`);
  }
}

function findMorphSet(character, formSetId) {
  const set = character.alternateFormSets.find(item => item.id === formSetId);
  if (!set) throw new Error("Alternate form set not found");
  if (set.mechanism !== "morph") {
    throw new Error("Morfose resolver requires a morph form set");
  }
  return set;
}

function isMorphTrait(trait) {
  return normalizeText(trait?.name) === "morfose";
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

function readNonNegativeNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function getPath(object, path) {
  return path.split(".").reduce((current, key) => current?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  let current = object;
  for (const key of keys.slice(0, -1)) {
    current[key] ??= {};
    current = current[key];
  }
  current[keys.at(-1)] = value;
}

function validateCharacterShape(character) {
  if (!plain(character)) throw new Error("Character must be object");
  if (!Array.isArray(character.advantages)) throw new Error("Character advantages must be array");
  if (!Array.isArray(character.alternateFormSets)) {
    throw new Error("Character alternateFormSets must be array");
  }
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Morfose resolution timestamp must be valid");
  }
  return value;
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

function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function plain(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
