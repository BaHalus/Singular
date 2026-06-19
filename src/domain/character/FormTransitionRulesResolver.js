import { createCharacter } from "./Character.js";
import { createFormTransitionRules } from "./FormTransitionRules.js";
import { collectFormStateEvidence } from "./FormStatePolicyResolver.js";

const SCALAR_PATHS = [
  "activation.baseTimeSeconds",
  "activation.timeStepsDelta",
  "activation.maneuver",
  "activation.involuntary",
  "activation.interruptible",
  "deactivation.baseTimeSeconds",
  "deactivation.timeStepsDelta",
  "deactivation.maneuver",
  "deactivation.involuntary",
  "deactivation.interruptible",
  "duration.minimumSeconds",
  "duration.maximumSeconds",
  "return.mode",
  "return.targetFormId",
];

const COLLECTION_PATHS = [
  "activation.costs",
  "activation.tests",
  "activation.requirements",
  "activation.triggers",
  "deactivation.costs",
  "deactivation.tests",
  "deactivation.requirements",
  "deactivation.triggers",
  "return.triggers",
  "impediments",
];

const SOURCE_PRIORITIES = {
  existing: 0,
  builtin: 100,
  campaign: 200,
  explicit: 300,
  manual: 10000,
};

export function analyzeFormTransitionRules(character, formSetId, options = {}) {
  validateCharacterShape(character);

  const set = findFormSet(character, formSetId);

  if (!set) {
    throw new Error("Alternate form set not found");
  }

  const evidence = collectFormStateEvidence(character, set);
  const scalarSignals = [];
  const collectionSignals = [];
  const diagnostics = [];

  for (const item of evidence) {
    if (!item.enabled) continue;

    if (item.kind === "modifier") {
      pushBuiltinSignals(item, scalarSignals, collectionSignals);
    }

    for (const value of [item.value, item.value?.raw]) {
      const explicit = readExplicitTransitionRules(value);
      if (explicit === null) continue;

      pushPartialSignals(explicit, {
        source: "explicit",
        priority: SOURCE_PRIORITIES.explicit,
        collectionMode: "merge",
        derivedFrom: [summarizeEvidence(item, "explicit-transition-rules")],
      }, scalarSignals, collectionSignals);
    }
  }

  for (const rule of normalizeCampaignRules([
    ...readOptionalRules(options.rules),
    ...readOptionalRules(options.campaignRules),
  ])) {
    if (!rule.enabled) continue;
    if (!matchesRule(rule, evidence, set)) continue;

    pushPartialSignals(rule.transitionRules, {
      source: "campaign",
      priority: rule.priority,
      collectionMode: rule.collectionMode,
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
    }, scalarSignals, collectionSignals);
  }

  const manualOverride = Object.hasOwn(options, "manualOverride")
    ? options.manualOverride
    : set.transitionRulesOverride;

  if (manualOverride !== undefined && manualOverride !== null) {
    pushPartialSignals(manualOverride, {
      source: "manual",
      priority: SOURCE_PRIORITIES.manual,
      collectionMode: "replace",
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
    }, scalarSignals, collectionSignals);
  }

  const baseRules = createFormTransitionRules(
    set.transitionRulesResolution?.baseRules ?? set.transitionRules,
  );
  const result = resolveSignals(
    baseRules,
    scalarSignals,
    collectionSignals,
    diagnostics,
  );

  return {
    setId: set.id,
    baseRules,
    transitionRules: result.transitionRules,
    decisions: result.decisions,
    diagnostics,
    evidence: evidence.map(item => summarizeEvidence(item)),
  };
}

export function resolveFormTransitionRules(character, formSetId, options = {}) {
  const analysis = analyzeFormTransitionRules(character, formSetId, options);

  return {
    ...analysis,
    resolvedAt: normalizeTimestamp(options.now),
  };
}

export function applyResolvedFormTransitionRules(character, formSetId, options = {}) {
  const set = findFormSet(character, formSetId);

  if (!set) {
    throw new Error("Alternate form set not found");
  }

  const resolution = resolveFormTransitionRules(character, formSetId, options);
  const persistedOverride = Object.hasOwn(options, "manualOverride")
    ? cloneValue(options.manualOverride)
    : set.transitionRulesOverride;
  const nextSets = character.alternateFormSets.map(candidate => (
    candidate.id === formSetId
      ? {
        ...candidate,
        transitionRules: resolution.transitionRules,
        transitionRulesOverride: persistedOverride ?? null,
        transitionRulesResolution: resolution,
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

export function applyResolvedFormTransitionRulesToAll(character, options = {}) {
  let current = character;
  const resolutions = [];

  for (const set of character.alternateFormSets) {
    const perSetOptions = { ...options };
    const hasPerSetOverride = (
      options.manualOverrides !== undefined &&
      options.manualOverrides !== null &&
      Object.hasOwn(options.manualOverrides, set.id)
    );

    if (hasPerSetOverride) {
      perSetOptions.manualOverride = options.manualOverrides[set.id];
    } else if (Object.hasOwn(options, "manualOverride")) {
      perSetOptions.manualOverride = options.manualOverride;
    } else {
      delete perSetOptions.manualOverride;
    }

    const applied = applyResolvedFormTransitionRules(
      current,
      set.id,
      perSetOptions,
    );
    current = applied.character;
    resolutions.push(applied.resolution);
  }

  return {
    character: current,
    resolutions,
  };
}

function pushBuiltinSignals(item, scalarSignals, collectionSignals) {
  const name = normalizeText(item.name);
  const levels = readLevels(item.value);
  const evidence = [summarizeEvidence(item)];

  if (["custa fadiga", "costs fatigue"].includes(name)) {
    collectionSignals.push({
      path: "activation.costs",
      items: [{
        id: `cost-fatigue-${sanitizeId(item.id ?? item.sourceTraitId ?? "form")}`,
        resource: "FP",
        amount: levels ?? 1,
        timing: "activation",
        intervalSeconds: null,
        notes: item.value?.notes ?? "",
      }],
      source: "builtin",
      priority: SOURCE_PRIORITIES.builtin,
      strategy: "merge",
      derivedFrom: evidence.map(entry => ({
        ...entry,
        ruleId: "gurps.costs-fatigue",
      })),
    });
  }

  if (["gasto adicional de tempo", "takes extra time"].includes(name)) {
    scalarSignals.push({
      path: "activation.timeStepsDelta",
      value: levels ?? 1,
      operation: "add",
      source: "builtin",
      priority: SOURCE_PRIORITIES.builtin,
      derivedFrom: evidence.map(entry => ({
        ...entry,
        ruleId: "gurps.takes-extra-time",
      })),
    });
  }

  if (["tempo reduzido", "reduced time"].includes(name)) {
    scalarSignals.push({
      path: "activation.timeStepsDelta",
      value: -(levels ?? 1),
      operation: "add",
      source: "builtin",
      priority: SOURCE_PRIORITIES.builtin,
      derivedFrom: evidence.map(entry => ({
        ...entry,
        ruleId: "gurps.reduced-time",
      })),
    });
  }

  if (["gatilho", "trigger"].includes(name)) {
    collectionSignals.push(createConditionSignal(
      "activation.triggers",
      item,
      "trigger",
      "gurps.trigger",
      evidence,
    ));
  }

  if (["preparacao necessaria", "preparation required"].includes(name)) {
    collectionSignals.push(createConditionSignal(
      "activation.requirements",
      item,
      "preparation",
      "gurps.preparation-required",
      evidence,
    ));
  }

  if (["impedimento", "hindrance"].includes(name)) {
    collectionSignals.push(createConditionSignal(
      "impediments",
      item,
      "hindrance",
      "gurps.hindrance",
      evidence,
    ));
  }

  if (["incontrolavel", "uncontrollable"].includes(name)) {
    scalarSignals.push({
      path: "activation.involuntary",
      value: true,
      operation: "set",
      source: "builtin",
      priority: SOURCE_PRIORITIES.builtin,
      derivedFrom: evidence.map(entry => ({
        ...entry,
        ruleId: "gurps.uncontrollable",
      })),
    });
  }
}

function createConditionSignal(path, item, kind, ruleId, evidence) {
  return {
    path,
    items: [{
      id: `${kind}-${sanitizeId(item.id ?? item.sourceTraitId ?? "form")}`,
      kind,
      description: cleanDescription(item.value?.notes) || item.name || kind,
      notes: item.value?.notes ?? "",
    }],
    source: "builtin",
    priority: SOURCE_PRIORITIES.builtin,
    strategy: "merge",
    derivedFrom: evidence.map(entry => ({ ...entry, ruleId })),
  };
}

function readExplicitTransitionRules(value) {
  if (!isPlainObject(value)) return null;

  const direct = value.formTransitionRules ?? value.form_transition_rules ?? null;
  if (direct !== null) return direct;

  const type = normalizeText(value.type);

  if (["form_transition_rule", "alternate_form_transition_rule"].includes(type)) {
    if (isPlainObject(value.rules)) return value.rules;

    const path = value.path ?? value.target;
    if (typeof path !== "string") return null;

    const partial = {};
    setPath(partial, path, value.value);
    return partial;
  }

  return null;
}

function pushPartialSignals(
  input,
  metadata,
  scalarSignals,
  collectionSignals,
) {
  const partial = normalizePartialTransitionRules(input);

  for (const path of SCALAR_PATHS) {
    const value = getPath(partial, path);
    if (value === undefined) continue;

    scalarSignals.push({
      path,
      value,
      operation: "set",
      source: metadata.source,
      priority: metadata.priority,
      derivedFrom: metadata.derivedFrom,
    });
  }

  for (const path of COLLECTION_PATHS) {
    const items = getPath(partial, path);
    if (items === undefined) continue;

    collectionSignals.push({
      path,
      items,
      source: metadata.source,
      priority: metadata.priority,
      strategy: metadata.collectionMode,
      derivedFrom: metadata.derivedFrom,
    });
  }
}

function resolveSignals(baseRules, scalarSignals, collectionSignals, diagnostics) {
  const transitionRules = createFormTransitionRules(baseRules);
  const decisions = createBaselineDecisions(transitionRules);

  for (const signal of scalarSignals) {
    const current = getPath(decisions.scalars, signal.path);

    if (signal.operation === "add") {
      if (signal.priority > current.priority) {
        const baseValue = getPath(baseRules, signal.path) ?? 0;
        const value = baseValue + signal.value;
        setPath(transitionRules, signal.path, value);
        setPath(decisions.scalars, signal.path, createDecision(
          value,
          signal,
          false,
        ));
      } else if (signal.priority === current.priority) {
        const value = getPath(transitionRules, signal.path) + signal.value;
        setPath(transitionRules, signal.path, value);
        setPath(decisions.scalars, signal.path, {
          ...current,
          value,
          derivedFrom: mergeEvidence(current.derivedFrom, signal.derivedFrom),
        });
      }
      continue;
    }

    if (signal.priority > current.priority) {
      setPath(transitionRules, signal.path, signal.value);
      setPath(decisions.scalars, signal.path, createDecision(
        signal.value,
        signal,
        false,
      ));
      continue;
    }

    if (signal.priority === current.priority && deepEqual(signal.value, current.value)) {
      setPath(decisions.scalars, signal.path, {
        ...current,
        derivedFrom: mergeEvidence(current.derivedFrom, signal.derivedFrom),
      });
      continue;
    }

    if (signal.priority === current.priority) {
      diagnostics.push(createConflictDiagnostic(signal.path, current, signal));
      setPath(decisions.scalars, signal.path, {
        ...current,
        conflict: true,
      });
    }
  }

  for (const signal of collectionSignals) {
    const current = getPath(decisions.collections, signal.path);

    if (signal.priority > current.priority) {
      const items = signal.strategy === "replace"
        ? cloneValue(signal.items)
        : mergeItems(getPath(transitionRules, signal.path), signal.items);
      setPath(transitionRules, signal.path, items);
      setPath(decisions.collections, signal.path, createDecision(
        items,
        signal,
        false,
      ));
      continue;
    }

    if (signal.priority === current.priority && signal.strategy === "merge") {
      const items = mergeItems(getPath(transitionRules, signal.path), signal.items);
      setPath(transitionRules, signal.path, items);
      setPath(decisions.collections, signal.path, {
        ...current,
        value: items,
        derivedFrom: mergeEvidence(current.derivedFrom, signal.derivedFrom),
      });
      continue;
    }

    if (
      signal.priority === current.priority &&
      signal.strategy === "replace" &&
      deepEqual(signal.items, current.value)
    ) {
      setPath(decisions.collections, signal.path, {
        ...current,
        derivedFrom: mergeEvidence(current.derivedFrom, signal.derivedFrom),
      });
      continue;
    }

    if (signal.priority === current.priority) {
      diagnostics.push(createConflictDiagnostic(signal.path, current, signal));
      setPath(decisions.collections, signal.path, {
        ...current,
        conflict: true,
      });
    }
  }

  return {
    transitionRules: createFormTransitionRules(transitionRules),
    decisions,
  };
}

function createBaselineDecisions(rules) {
  const decisions = {
    scalars: {},
    collections: {},
  };

  for (const path of SCALAR_PATHS) {
    setPath(decisions.scalars, path, {
      value: cloneValue(getPath(rules, path)),
      source: "existing",
      priority: SOURCE_PRIORITIES.existing,
      derivedFrom: [],
      overridden: false,
      conflict: false,
    });
  }

  for (const path of COLLECTION_PATHS) {
    setPath(decisions.collections, path, {
      value: cloneValue(getPath(rules, path)),
      source: "existing",
      priority: SOURCE_PRIORITIES.existing,
      derivedFrom: [],
      overridden: false,
      conflict: false,
    });
  }

  return decisions;
}

function createDecision(value, signal, conflict) {
  return {
    value: cloneValue(value),
    source: signal.source,
    priority: signal.priority,
    derivedFrom: cloneValue(signal.derivedFrom),
    overridden: signal.source === "manual",
    conflict,
  };
}

function createConflictDiagnostic(path, current, signal) {
  return {
    type: "conflict",
    path,
    keptValue: cloneValue(current.value),
    rejectedValue: cloneValue(signal.value ?? signal.items),
    priority: signal.priority,
    keptSource: current.source,
    rejectedSource: signal.source,
    derivedFrom: cloneValue(signal.derivedFrom),
  };
}

function normalizePartialTransitionRules(input) {
  if (!isPlainObject(input)) {
    throw new Error("Form transition rules directive must be object");
  }

  const partial = {};

  for (const path of SCALAR_PATHS) {
    const value = getPath(input, path);
    if (value === undefined) continue;
    setPath(partial, path, normalizeScalar(path, value));
  }

  for (const path of COLLECTION_PATHS) {
    const value = getPath(input, path);
    if (value === undefined) continue;
    if (!Array.isArray(value)) {
      throw new Error(`Form transition collection must be array for ${path}`);
    }
    const complete = createFormTransitionRules(setPathClone(path, value));
    setPath(partial, path, getPath(complete, path));
  }

  return partial;
}

function normalizeScalar(path, value) {
  const complete = createFormTransitionRules(setPathClone(path, value));
  return getPath(complete, path);
}

function setPathClone(path, value) {
  const result = {};
  setPath(result, path, cloneValue(value));
  return result;
}

function normalizeCampaignRules(rules) {
  return rules.map((rule, index) => {
    if (!isPlainObject(rule)) {
      throw new Error("Form transition campaign rule must be object");
    }

    return {
      id: rule.id ?? `transition-rule-${index + 1}`,
      name: rule.name ?? rule.id ?? `Transition rule ${index + 1}`,
      enabled: rule.enabled !== false,
      priority: normalizePriority(rule.priority),
      collectionMode: normalizeCollectionMode(rule.collectionMode),
      when: isPlainObject(rule.when) ? rule.when : {},
      transitionRules: normalizePartialTransitionRules(
        rule.transitionRules ?? rule.rules ?? {},
      ),
    };
  });
}

function matchesRule(rule, evidence, set) {
  const when = rule.when;

  if (when.setIds && !normalizeStringArray(when.setIds).includes(set.id)) return false;
  if (
    when.mechanisms &&
    !normalizeStringArray(when.mechanisms).includes(set.mechanism)
  ) return false;
  if (
    when.modifierNames &&
    !matchesEvidenceNames(evidence, "modifier", when.modifierNames)
  ) return false;
  if (
    when.featureTypes &&
    !matchesEvidenceTypes(evidence, "feature", when.featureTypes)
  ) return false;
  if (
    when.traitNames &&
    !matchesEvidenceNames(evidence, "trait", when.traitNames)
  ) return false;

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

function readLevels(value) {
  const raw = value?.levels ?? value?.level ?? null;
  if (raw === null || raw === undefined || raw === "") return null;
  const number = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(number) || number <= 0) return null;
  return number;
}

function cleanDescription(value) {
  if (typeof value !== "string") return "";
  return value.replace(/^@|@$/g, "").trim();
}

function mergeItems(first, second) {
  const result = [];
  const seen = new Set();

  for (const item of [...first, ...second]) {
    const key = item.id ?? JSON.stringify(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cloneValue(item));
  }

  return result;
}

function summarizeEvidence(item, ruleId = null) {
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
    result.push(cloneValue(item));
  }
  return result;
}

function readOptionalRules(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error("Form transition campaign rules must be array");
  }
  return value;
}

function normalizePriority(value) {
  if (value === undefined || value === null) return SOURCE_PRIORITIES.campaign;
  if (
    typeof value !== "number" ||
    Number.isNaN(value) ||
    value >= SOURCE_PRIORITIES.manual
  ) {
    throw new Error("Form transition rule priority must be below manual priority");
  }
  return value;
}

function normalizeCollectionMode(value) {
  const mode = value ?? "merge";
  if (!["merge", "replace"].includes(mode)) {
    throw new Error("Form transition collection mode is invalid");
  }
  return mode;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value) || value.some(item => typeof item !== "string")) {
    throw new Error("Form transition matcher must be string array");
  }
  return value;
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "") {
    throw new Error("Form transition resolution timestamp must be string, Date or null");
  }
  return value;
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
  return object;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function sanitizeId(value) {
  return String(value ?? "item")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";
}

function deepEqual(first, second) {
  return JSON.stringify(first) === JSON.stringify(second);
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
    throw new Error("Character must be object");
  }
  if (!Array.isArray(character.alternateFormSets)) {
    throw new Error("Character alternateFormSets must be array");
  }
  if (!Array.isArray(character.templates)) {
    throw new Error("Character templates must be array");
  }
}
