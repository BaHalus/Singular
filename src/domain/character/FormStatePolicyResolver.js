import { createCharacter } from "./Character.js";
import { createAlternateFormStatePolicy } from "./AlternateFormState.js";

const POLICY_PATHS = [
  "pools.HP",
  "pools.FP",
  "pools.EnergyReserve",
  "injuries",
  "conditions",
  "effects",
  "equipment",
];

const SOURCE_PRIORITIES = {
  existing: 0,
  builtin: 100,
  campaign: 200,
  explicit: 300,
  manual: 10000,
};

const BUILTIN_RULES = [
  {
    id: "gurps.non-reciprocal-damage",
    names: ["Dano Não-Recíproco", "Non-Reciprocal Damage"],
    policy: {
      pools: { HP: "perForm" },
      injuries: "perForm",
    },
  },
];

export function analyzeFormStatePolicy(character, formSetId, options = {}) {
  validateCharacterShape(character);

  const set = findFormSet(character, formSetId);

  if (!set) {
    throw new Error("Alternate form set not found");
  }

  const evidence = collectFormStateEvidence(character, set);
  const signals = [];
  const diagnostics = [];

  for (const item of evidence) {
    if (!item.enabled) continue;

    if (item.kind === "modifier") {
      for (const rule of BUILTIN_RULES) {
        if (rule.names.some(name => normalizeText(name) === normalizeText(item.name))) {
          signals.push(...policyToSignals(rule.policy, {
            source: "builtin",
            priority: SOURCE_PRIORITIES.builtin,
            derivedFrom: [summarizeEvidence(item, rule.id)],
          }));
        }
      }
    }

    const explicitPolicy = readExplicitPolicy(item.value);

    if (explicitPolicy !== null) {
      signals.push(...policyToSignals(explicitPolicy, {
        source: "explicit",
        priority: SOURCE_PRIORITIES.explicit,
        derivedFrom: [summarizeEvidence(item, "explicit-policy")],
      }));
    }
  }

  for (const rule of normalizeRules([
    ...readOptionalRules(options.rules),
    ...readOptionalRules(options.campaignRules),
  ])) {
    if (!rule.enabled) continue;
    if (!matchesRule(rule, evidence, set)) continue;

    signals.push(...policyToSignals(rule.policy, {
      source: "campaign",
      priority: rule.priority,
      derivedFrom: [{
        kind: "campaignRule",
        id: rule.id,
        name: rule.name,
        type: null,
        location: "campaign",
        sourceTraitId: null,
        templateId: null,
        enabled: true,
        ruleId: rule.id,
      }],
    }));
  }

  const manualOverride = options.manualOverride ?? set.statePolicyOverride;

  if (manualOverride !== undefined && manualOverride !== null) {
    signals.push(...policyToSignals(manualOverride, {
      source: "manual",
      priority: SOURCE_PRIORITIES.manual,
      derivedFrom: [{
        kind: "manualOverride",
        id: options.overrideId ?? "manual",
        name: options.overrideName ?? "Manual override",
        type: null,
        location: "character",
        sourceTraitId: null,
        templateId: null,
        enabled: true,
        ruleId: null,
      }],
    }));
  }

  const basePolicy = createAlternateFormStatePolicy(
    set.statePolicyResolution?.basePolicy ?? set.statePolicy,
  );
  const result = resolveSignals(basePolicy, signals, diagnostics);

  return {
    setId: set.id,
    basePolicy,
    policy: result.policy,
    decisions: result.decisions,
    diagnostics,
    evidence: evidence.map(item => summarizeEvidence(item)),
  };
}

export function resolveFormStatePolicy(character, formSetId, options = {}) {
  const analysis = analyzeFormStatePolicy(character, formSetId, options);

  return {
    ...analysis,
    resolvedAt: normalizeTimestamp(options.now),
  };
}

export function applyResolvedFormStatePolicy(character, formSetId, options = {}) {
  const set = findFormSet(character, formSetId);

  if (!set) {
    throw new Error("Alternate form set not found");
  }

  const resolution = resolveFormStatePolicy(character, formSetId, options);
  const persistedOverride = options.manualOverride !== undefined
    ? cloneValue(options.manualOverride)
    : set.statePolicyOverride;
  const nextSets = character.alternateFormSets.map(candidate => (
    candidate.id === formSetId
      ? {
        ...candidate,
        statePolicy: resolution.policy,
        statePolicyOverride: persistedOverride ?? null,
        statePolicyResolution: resolution,
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

export function applyResolvedFormStatePolicies(character, options = {}) {
  let current = character;
  const resolutions = [];

  for (const set of character.alternateFormSets) {
    const perSetOverride = options.manualOverrides?.[set.id];
    const perSetOptions = {
      ...options,
      manualOverride: perSetOverride ?? options.manualOverride,
    };
    const applied = applyResolvedFormStatePolicy(current, set.id, perSetOptions);
    current = applied.character;
    resolutions.push(applied.resolution);
  }

  return {
    character: current,
    resolutions,
  };
}

export function collectFormStateEvidence(character, set) {
  const evidence = [];
  const sourceTraitIds = new Set([
    set.sourceTraitId,
    ...set.forms.map(form => form.sourceTraitId),
  ].filter(Boolean));
  const templateIds = new Set(
    set.forms.map(form => form.templateId).filter(Boolean),
  );
  const traitCollections = [
    character.advantages,
    character.perks,
    character.disadvantages,
    character.quirks,
  ];

  for (const collection of traitCollections) {
    for (const trait of collection) {
      if (sourceTraitIds.has(trait.id)) {
        pushTraitEvidence(evidence, trait, {
          location: "character",
          sourceTraitId: trait.id,
          templateId: null,
        });
      }
    }
  }

  for (const template of character.templates) {
    if (!templateIds.has(template.id)) continue;

    const templateContext = {
      location: "template",
      sourceTraitId: null,
      templateId: template.id,
    };

    evidence.push(createEvidence(
      "template",
      template,
      templateContext,
      true,
    ));
    pushExplicitRawEvidence(evidence, template, templateContext);

    const templateTraits = [
      ...(template.traits?.advantages ?? []),
      ...(template.traits?.perks ?? []),
      ...(template.traits?.disadvantages ?? []),
      ...(template.traits?.quirks ?? []),
    ];

    for (const trait of templateTraits) {
      pushTraitEvidence(evidence, trait, {
        location: "template",
        sourceTraitId: trait.id,
        templateId: template.id,
      });
    }
  }

  return evidence;
}

function pushTraitEvidence(evidence, trait, context) {
  evidence.push(createEvidence("trait", trait, context, true));
  pushExplicitRawEvidence(evidence, trait, context);

  for (const modifier of trait.modifiers ?? []) {
    pushNestedEvidence(evidence, "modifier", modifier, context);
  }

  for (const feature of trait.features ?? []) {
    pushNestedEvidence(evidence, "feature", feature, context);
  }
}

function pushNestedEvidence(evidence, kind, value, context) {
  const enabled = value?.disabled !== true && value?.enabled !== false;
  evidence.push(createEvidence(kind, value, context, enabled));
  pushExplicitRawEvidence(evidence, value, context, kind, enabled);

  for (const modifier of value?.modifiers ?? []) {
    pushNestedEvidence(evidence, "modifier", modifier, context);
  }

  for (const feature of value?.features ?? []) {
    pushNestedEvidence(evidence, "feature", feature, context);
  }
}

function pushExplicitRawEvidence(
  evidence,
  value,
  context,
  parentKind = "raw",
  enabled = true,
) {
  if (!isPlainObject(value?.raw)) return;
  if (readExplicitPolicy(value.raw) === null) return;

  evidence.push(createEvidence(
    `${parentKind}Raw`,
    value.raw,
    context,
    enabled,
  ));
}

function createEvidence(kind, value, context, enabled) {
  return {
    kind,
    id: value?.id ?? null,
    name: value?.name ?? value?.type ?? "",
    type: value?.type ?? value?.templateType ?? null,
    enabled,
    ...context,
    value,
  };
}

function resolveSignals(basePolicy, signals, diagnostics) {
  const policy = createAlternateFormStatePolicy(basePolicy);
  const decisions = createBaselineDecisions(policy);

  for (const signal of signals) {
    const current = getPath(decisions, signal.path);

    if (signal.priority > current.priority) {
      setPath(policy, signal.path, signal.mode);
      setPath(decisions, signal.path, {
        mode: signal.mode,
        source: signal.source,
        priority: signal.priority,
        derivedFrom: [...signal.derivedFrom],
        overridden: signal.source === "manual",
        conflict: false,
      });
      continue;
    }

    if (signal.priority === current.priority && signal.mode === current.mode) {
      setPath(decisions, signal.path, {
        ...current,
        derivedFrom: mergeEvidence(current.derivedFrom, signal.derivedFrom),
      });
      continue;
    }

    if (signal.priority === current.priority && signal.mode !== current.mode) {
      diagnostics.push({
        type: "conflict",
        path: signal.path,
        keptMode: current.mode,
        rejectedMode: signal.mode,
        priority: signal.priority,
        keptSource: current.source,
        rejectedSource: signal.source,
        derivedFrom: signal.derivedFrom,
      });

      setPath(decisions, signal.path, {
        ...current,
        conflict: true,
      });
    }
  }

  return { policy, decisions };
}

function createBaselineDecisions(policy) {
  const decisions = { pools: {} };

  for (const path of POLICY_PATHS) {
    setPath(decisions, path, {
      mode: getPath(policy, path),
      source: "existing",
      priority: SOURCE_PRIORITIES.existing,
      derivedFrom: [],
      overridden: false,
      conflict: false,
    });
  }

  return decisions;
}

function policyToSignals(policyInput, metadata) {
  const partial = normalizePartialPolicy(policyInput);
  const signals = [];

  for (const path of POLICY_PATHS) {
    const mode = getPath(partial, path);
    if (mode === undefined) continue;

    signals.push({
      path,
      mode,
      source: metadata.source,
      priority: metadata.priority,
      derivedFrom: metadata.derivedFrom,
    });
  }

  return signals;
}

function normalizePartialPolicy(input) {
  if (!isPlainObject(input)) {
    throw new Error("Form state policy directive must be object");
  }

  const output = { pools: {} };

  for (const path of POLICY_PATHS) {
    const value = getPath(input, path);
    if (value === undefined) continue;

    const mode = isPlainObject(value) ? value.mode : value;

    if (!["shared", "perForm"].includes(mode)) {
      throw new Error(`Form state policy mode is invalid for ${path}`);
    }

    setPath(output, path, mode);
  }

  return output;
}

function readExplicitPolicy(value) {
  if (!isPlainObject(value)) return null;

  const direct = value.formStatePolicy ?? value.form_state_policy ?? null;
  if (direct !== null) return direct;

  const type = normalizeText(value.type);

  if (["form_state_policy", "alternate_form_state_policy"].includes(type)) {
    if (isPlainObject(value.policy)) return value.policy;

    const path = normalizeTargetPath(value.target ?? value.path);
    const mode = value.mode;

    if (path !== null && mode !== undefined) {
      const policy = { pools: {} };
      setPath(policy, path, mode);
      return policy;
    }
  }

  return null;
}

function readOptionalRules(value) {
  if (value === undefined || value === null) return [];

  if (!Array.isArray(value)) {
    throw new Error("Form state policy rules must be an array");
  }

  return value;
}

function normalizeRules(rules) {
  return rules.map((rule, index) => {
    if (!isPlainObject(rule)) {
      throw new Error("Form state policy rule must be object");
    }

    return {
      id: rule.id ?? `campaign-rule-${index + 1}`,
      name: rule.name ?? rule.id ?? `Campaign rule ${index + 1}`,
      enabled: rule.enabled !== false,
      priority: normalizePriority(rule.priority),
      when: isPlainObject(rule.when) ? rule.when : {},
      policy: normalizePartialPolicy(rule.policy ?? {}),
    };
  });
}

function matchesRule(rule, evidence, set) {
  const when = rule.when;

  if (when.setIds && !normalizeStringArray(when.setIds).includes(set.id)) {
    return false;
  }

  if (
    when.mechanisms &&
    !normalizeStringArray(when.mechanisms).includes(set.mechanism)
  ) {
    return false;
  }

  if (
    when.modifierNames &&
    !matchesEvidenceNames(evidence, "modifier", when.modifierNames)
  ) {
    return false;
  }

  if (
    when.featureTypes &&
    !matchesEvidenceTypes(evidence, "feature", when.featureTypes)
  ) {
    return false;
  }

  if (
    when.traitNames &&
    !matchesEvidenceNames(evidence, "trait", when.traitNames)
  ) {
    return false;
  }

  if (when.templateIds) {
    const templateIds = new Set(evidence.map(item => item.templateId).filter(Boolean));

    if (!normalizeStringArray(when.templateIds).some(id => templateIds.has(id))) {
      return false;
    }
  }

  return true;
}

function matchesEvidenceNames(evidence, kind, expected) {
  const names = new Set(normalizeStringArray(expected).map(normalizeText));

  return evidence.some(item => (
    item.kind === kind &&
    item.enabled &&
    names.has(normalizeText(item.name))
  ));
}

function matchesEvidenceTypes(evidence, kind, expected) {
  const types = new Set(normalizeStringArray(expected).map(normalizeText));

  return evidence.some(item => (
    item.kind === kind &&
    item.enabled &&
    types.has(normalizeText(item.type))
  ));
}

function normalizeTargetPath(value) {
  const normalized = normalizeText(value).replace(/[ _-]+/g, "");
  const aliases = {
    hp: "pools.HP",
    pv: "pools.HP",
    fp: "pools.FP",
    pf: "pools.FP",
    energyreserve: "pools.EnergyReserve",
    reservadeenergia: "pools.EnergyReserve",
    er: "pools.EnergyReserve",
    injuries: "injuries",
    ferimentos: "injuries",
    conditions: "conditions",
    condicoes: "conditions",
    effects: "effects",
    efeitos: "effects",
    equipment: "equipment",
    equipamento: "equipment",
  };

  return aliases[normalized] ?? null;
}

function summarizeEvidence(item, ruleId = null) {
  if (!item) return null;

  return {
    kind: item.kind,
    id: item.id ?? null,
    name: item.name ?? "",
    type: item.type ?? null,
    location: item.location ?? null,
    sourceTraitId: item.sourceTraitId ?? null,
    templateId: item.templateId ?? null,
    enabled: item.enabled ?? true,
    ruleId,
  };
}

function mergeEvidence(first, second) {
  const result = [];
  const seen = new Set();

  for (const item of [...first, ...second]) {
    const key = JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

function findFormSet(character, formSetId) {
  return character.alternateFormSets.find(set => set.id === formSetId) ?? null;
}

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const keys = path.split(".");
  let cursor = object;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    cursor[key] ??= {};
    cursor = cursor[key];
  }

  cursor[keys.at(-1)] = value;
}

function normalizePriority(value) {
  if (value === undefined || value === null) return SOURCE_PRIORITIES.campaign;

  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    value >= SOURCE_PRIORITIES.manual
  ) {
    throw new Error("Form state policy rule priority must be number below manual priority");
  }

  return value;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error("Form state policy rule matcher must be string array");
  }

  return value;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();

  if (typeof value !== "string" || value === "") {
    throw new Error("Form state policy resolution timestamp must be string, Date or null");
  }

  return value;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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

function validateCharacterShape(character) {
  if (!isPlainObject(character)) {
    throw new Error("Character must be an object");
  }

  if (!Array.isArray(character.alternateFormSets)) {
    throw new Error("Character alternateFormSets must be an array");
  }

  if (!Array.isArray(character.templates)) {
    throw new Error("Character templates must be an array");
  }
}
