import {
  createTemplateEntry,
  serializeTemplateEntry,
  validateTemplate,
  validateTemplateEntry,
} from "./Templates.js";

const STANDARD_DOMAINS = [
  "attribute",
  "secondaryCharacteristic",
  "trait",
  "skill",
  "magic",
  "language",
  "culture",
  "equipment",
  "template",
  "rule",
  "unknown",
];

const DOMAIN_BY_ENTRY_TYPE = {
  attributeContribution: "attribute",
  secondaryCharacteristicContribution: "secondaryCharacteristic",
  traitReference: "trait",
  skillReference: "skill",
  techniqueReference: "skill",
  spellReference: "magic",
  languageReference: "language",
  cultureReference: "culture",
  equipmentReference: "equipment",
  templateReference: "template",
  specialRule: "rule",
};

const REFERENCE_ENTRY_TYPES = new Set([
  "attributeContribution",
  "secondaryCharacteristicContribution",
  "traitReference",
  "skillReference",
  "techniqueReference",
  "spellReference",
  "languageReference",
  "cultureReference",
  "equipmentReference",
  "templateReference",
]);

const INLINE_ENTRY_TYPES = new Set([
  "advantage",
  "perk",
  "disadvantage",
  "quirk",
  "traitContainer",
  "skill",
  "technique",
  "skillContainer",
  "techniqueNode",
  "spell",
  "spellContainer",
  "language",
  "languageNode",
  "familiarity",
  "familiarityNode",
  "equipment",
]);

const RULE_ENTRY_TYPES = new Set(["rule", "specialRule"]);

export function createTemplateContribution(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Template contribution must be object");
  }

  const entryType = requiredString(
    input.entryType ?? input.type,
    "Template contribution entryType must be non-empty string",
  );
  const expectedDomain = DOMAIN_BY_ENTRY_TYPE[entryType] ?? null;
  const domain = input.domain ?? expectedDomain ?? "unknown";

  if (expectedDomain !== null && domain !== expectedDomain) {
    throw new Error(
      `Template contribution ${entryType} must use ${expectedDomain} domain`,
    );
  }

  const entry = createTemplateEntry({
    ...input,
    domain,
    entryType,
    payload: cloneValue(input.payload ?? input.declaration ?? {}),
  }, options);

  validateTemplateContribution(entry);
  return deepFreeze(entry);
}

export function createAttributeContribution(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Attribute contribution must be object");
  }

  return createTemplateContribution({
    ...input,
    domain: "attribute",
    entryType: "attributeContribution",
    referenceId: requiredString(
      input.attributeId ?? input.referenceId,
      "Attribute contribution attributeId must be non-empty string",
    ),
    payload: cloneValue(input.declaration ?? input.payload ?? {}),
  }, options);
}

export function createSecondaryCharacteristicContribution(
  input = {},
  options = {},
) {
  if (!isPlainObject(input)) {
    throw new Error("Secondary characteristic contribution must be object");
  }

  return createTemplateContribution({
    ...input,
    domain: "secondaryCharacteristic",
    entryType: "secondaryCharacteristicContribution",
    referenceId: requiredString(
      input.secondaryCharacteristicId ?? input.referenceId,
      "Secondary characteristic contribution id must be non-empty string",
    ),
    payload: cloneValue(input.declaration ?? input.payload ?? {}),
  }, options);
}

export function createReferenceContribution(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Reference contribution must be object");
  }

  return createTemplateContribution({
    ...input,
    domain: requiredString(
      input.domain,
      "Reference contribution domain must be non-empty string",
    ),
    entryType: requiredString(
      input.entryType,
      "Reference contribution entryType must be non-empty string",
    ),
    referenceId: requiredString(
      input.referenceId,
      "Reference contribution referenceId must be non-empty string",
    ),
    payload: cloneValue(input.declaration ?? input.payload ?? {}),
  }, options);
}

export function createTemplateReferenceContribution(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Template reference contribution must be object");
  }

  return createTemplateContribution({
    ...input,
    domain: "template",
    entryType: "templateReference",
    referenceId: requiredString(
      input.templateId ?? input.referenceId,
      "Template reference contribution templateId must be non-empty string",
    ),
    payload: cloneValue(input.declaration ?? input.payload ?? {}),
  }, options);
}

export function createSpecialRuleContribution(input = {}, options = {}) {
  if (!isPlainObject(input)) {
    throw new Error("Special rule contribution must be object");
  }

  return createTemplateContribution({
    ...input,
    domain: "rule",
    entryType: "specialRule",
    referenceId: null,
    payload: cloneValue(input.declaration ?? input.payload ?? {}),
  }, options);
}

export function validateTemplateContribution(entry) {
  validateTemplateEntry(entry);

  const expectedDomain = DOMAIN_BY_ENTRY_TYPE[entry.entryType] ?? null;
  if (expectedDomain !== null && entry.domain !== expectedDomain) {
    throw new Error(
      `Template contribution ${entry.entryType} must use ${expectedDomain} domain`,
    );
  }

  if (REFERENCE_ENTRY_TYPES.has(entry.entryType) && entry.referenceId === null) {
    throw new Error(
      `Template contribution ${entry.entryType} requires explicit referenceId`,
    );
  }

  if (
    (REFERENCE_ENTRY_TYPES.has(entry.entryType) ||
      RULE_ENTRY_TYPES.has(entry.entryType)) &&
    !isPlainObject(entry.payload)
  ) {
    throw new Error(
      `Template contribution ${entry.entryType} payload must be object`,
    );
  }

  return true;
}

export function createTemplateComposition(template) {
  validateTemplate(template);

  const byDomain = Object.fromEntries(
    STANDARD_DOMAINS.map(domain => [domain, []]),
  );
  const references = [];
  const inlineEntryIds = [];
  const ruleEntryIds = [];
  const opaqueEntryIds = [];

  for (const entry of template.entries) {
    validateTemplateContribution(entry);

    if (!Object.hasOwn(byDomain, entry.domain)) {
      byDomain[entry.domain] = [];
    }
    byDomain[entry.domain].push(entry.id);

    const kind = classifyContribution(entry);
    if (kind === "reference") {
      references.push({
        entryId: entry.id,
        domain: entry.domain,
        entryType: entry.entryType,
        referenceId: entry.referenceId,
        declaration: cloneValue(entry.payload),
      });
    } else if (kind === "inline") {
      inlineEntryIds.push(entry.id);
    } else if (kind === "rule") {
      ruleEntryIds.push(entry.id);
    } else {
      opaqueEntryIds.push(entry.id);
    }
  }

  const composition = {
    templateId: template.id,
    entryIds: template.entries.map(entry => entry.id),
    byDomain,
    references,
    inlineEntryIds,
    ruleEntryIds,
    opaqueEntryIds,
  };

  validateTemplateComposition(composition);
  return deepFreeze(composition);
}

export function validateTemplateComposition(composition) {
  if (!isPlainObject(composition)) {
    throw new Error("Template composition must be object");
  }

  requiredString(
    composition.templateId,
    "Template composition templateId must be non-empty string",
  );
  validateUniqueStringArray(
    composition.entryIds,
    "Template composition entryIds must be unique string array",
  );

  if (!isPlainObject(composition.byDomain)) {
    throw new Error("Template composition byDomain must be object");
  }

  const groupedIds = [];
  for (const [domain, ids] of Object.entries(composition.byDomain)) {
    requiredString(domain, "Template composition domain must be non-empty string");
    validateUniqueStringArray(
      ids,
      `Template composition ${domain} ids must be unique string array`,
    );
    groupedIds.push(...ids);
  }

  if (!sameStringSet(groupedIds, composition.entryIds)) {
    throw new Error("Template composition byDomain must contain every entry once");
  }

  if (!Array.isArray(composition.references)) {
    throw new Error("Template composition references must be array");
  }
  for (const reference of composition.references) {
    if (!isPlainObject(reference)) {
      throw new Error("Template composition reference must be object");
    }
    requiredString(
      reference.entryId,
      "Template composition reference entryId must be non-empty string",
    );
    requiredString(
      reference.domain,
      "Template composition reference domain must be non-empty string",
    );
    requiredString(
      reference.entryType,
      "Template composition reference entryType must be non-empty string",
    );
    requiredString(
      reference.referenceId,
      "Template composition reference referenceId must be non-empty string",
    );
  }

  for (const key of ["inlineEntryIds", "ruleEntryIds", "opaqueEntryIds"]) {
    validateUniqueStringArray(
      composition[key],
      `Template composition ${key} must be unique string array`,
    );
  }

  const classifiedIds = [
    ...composition.references.map(reference => reference.entryId),
    ...composition.inlineEntryIds,
    ...composition.ruleEntryIds,
    ...composition.opaqueEntryIds,
  ];
  if (!sameStringSet(classifiedIds, composition.entryIds)) {
    throw new Error("Template composition must classify every entry once");
  }

  return true;
}

export function serializeTemplateComposition(composition) {
  validateTemplateComposition(composition);
  return cloneValue(composition);
}

export function getTemplateCompositionEntries(template, domain) {
  validateTemplate(template);
  requiredString(domain, "Template composition domain must be non-empty string");

  return deepFreeze(template.entries
    .filter(entry => entry.domain === domain)
    .map(entry => serializeTemplateEntry(entry)));
}

export function getTemplateContributionDomains() {
  return [...STANDARD_DOMAINS];
}

function classifyContribution(entry) {
  if (entry.referenceId !== null) return "reference";
  if (RULE_ENTRY_TYPES.has(entry.entryType)) return "rule";
  if (INLINE_ENTRY_TYPES.has(entry.entryType)) return "inline";
  return "opaque";
}

function validateUniqueStringArray(value, message) {
  if (
    !Array.isArray(value) ||
    value.some(item => typeof item !== "string" || item === "") ||
    new Set(value).size !== value.length
  ) {
    throw new Error(message);
  }
}

function sameStringSet(left, right) {
  if (left.length !== right.length) return false;
  const leftSet = new Set(left);
  return leftSet.size === right.length && right.every(item => leftSet.has(item));
}

function requiredString(value, message) {
  if (typeof value !== "string" || value === "") throw new Error(message);
  return value;
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

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
