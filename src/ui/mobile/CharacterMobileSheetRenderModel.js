import {
  serializeCharacterMobileProjection,
} from "./CharacterMobileProjection.js";

const RENDER_MODEL_SCHEMA_VERSION = 5;
const RENDER_MODEL_KEYS = Object.freeze([
  "schemaVersion",
  "title",
  "subtitle",
  "toolbar",
  "summary",
  "cards",
  "sections",
]);
const CARD_STATUSES = Object.freeze([
  "available",
  "declared-only",
  "pending",
  "external-front",
  "empty",
]);
const TOOLBAR_ACTION_STATUSES = Object.freeze(["pending"]);

export function createCharacterMobileSheetRenderModel(projection) {
  const serializedProjection = serializeCharacterMobileProjection(projection);
  const model = {
    schemaVersion: RENDER_MODEL_SCHEMA_VERSION,
    title: serializedProjection.identity.name,
    subtitle: serializedProjection.identity.concept,
    toolbar: createToolbar(serializedProjection),
    summary: createSummary(serializedProjection),
    cards: createCards(serializedProjection),
    sections: createSections(serializedProjection.sections),
  };

  validateCharacterMobileSheetRenderModel(model);
  return deepFreeze(model);
}

export function validateCharacterMobileSheetRenderModel(model) {
  requirePlainObject(model, "Character mobile sheet render model");
  validateExactKeys(model, RENDER_MODEL_KEYS, "Character mobile sheet render model");
  if (model.schemaVersion !== RENDER_MODEL_SCHEMA_VERSION) {
    throw new Error("Character mobile sheet render model schemaVersion is invalid");
  }

  requireString(model.title, "Character mobile sheet title");
  requireString(model.subtitle, "Character mobile sheet subtitle", { allowEmpty: true });
  validateToolbar(model.toolbar);
  validateSummary(model.summary);
  validateCards(model.cards);
  validateSections(model.sections);
  return true;
}

export function serializeCharacterMobileSheetRenderModel(model) {
  validateCharacterMobileSheetRenderModel(model);
  return cloneValue(model);
}

export function getCharacterMobileSheetRenderModelSchemaVersion() {
  return RENDER_MODEL_SCHEMA_VERSION;
}

function createToolbar(projection) {
  return {
    title: projection.identity.name,
    actions: [
      { id: "mode-creation", label: "Criação", status: "pending" },
      { id: "mode-table", label: "Mesa", status: "pending" },
      { id: "save", label: "Salvar", status: "pending" },
    ],
  };
}

function createSummary(projection) {
  return {
    identity: [
      createTextItem("name", "Nome", projection.identity.name),
      createTextItem("concept", "Conceito", projection.identity.concept),
    ],
    attributes: Object.values(projection.attributes).map(attribute => ({
      id: attribute.key,
      label: attribute.key,
      value: attribute.level,
      status: attribute.status,
      source: attribute.source,
      diagnostics: cloneValue(attribute.diagnostics),
    })),
    pools: Object.values(projection.pools).map(pool => ({
      id: pool.key,
      label: pool.key,
      current: pool.current,
      maximum: pool.maximum,
      status: "available",
    })),
  };
}

function createCards(projection) {
  return [
    {
      id: "identity",
      title: "Identidade",
      status: "available",
      items: [
        createTextItem("name", "Nome", projection.identity.name),
        createTextItem("concept", "Conceito", projection.identity.concept),
        createTextItem("playerId", "Jogador", projection.identity.playerId),
        createTextItem("campaignId", "Campanha", projection.identity.campaignId),
      ],
    },
    {
      id: "attributes",
      title: "Atributos",
      status: "available",
      items: Object.values(projection.attributes).map(attribute => ({
        id: attribute.key,
        label: attribute.key,
        value: attribute.level,
        status: attribute.status,
        source: attribute.source,
        diagnostics: cloneValue(attribute.diagnostics),
      })),
    },
    {
      id: "secondary-characteristics",
      title: "Secundários",
      status: "declared-only",
      items: Object.values(projection.secondaryCharacteristics).map(characteristic => ({
        id: characteristic.key,
        label: characteristic.key,
        base: characteristic.base,
        override: characteristic.override,
        status: characteristic.status,
      })),
    },
    {
      id: "pools",
      title: "PV/PF atuais",
      status: "available",
      items: Object.values(projection.pools).map(pool => ({
        id: pool.key,
        label: pool.key,
        current: pool.current,
        maximum: pool.maximum,
        status: "available",
      })),
    },
    createTraitsCard(projection.traits),
    createSkillsTechniquesCard(projection.skills, projection.techniques),
    createLanguagesCultureCard(projection.languages, projection.familiarities),
    createAttacksCard(projection.attacks),
    createEquipmentCard(projection.equipment),
  ];
}

function createTraitsCard(traits) {
  return {
    id: "traits",
    title: "Vantagens e Desvantagens",
    status: traits.length === 0 ? "empty" : "declared-only",
    items: traits.map(trait => ({
      id: trait.id,
      label: traitLabel(trait.role),
      value: trait.name,
      role: trait.role,
      points: trait.points,
      levels: trait.levels,
      notes: trait.notes,
      status: trait.status,
    })),
  };
}

function createSkillsTechniquesCard(skills, techniques) {
  return {
    id: "skills-techniques",
    title: "Perícias e Técnicas",
    status: skills.length === 0 && techniques.length === 0 ? "empty" : "declared-only",
    items: [
      ...skills.map(skill => ({
        id: skill.id,
        label: "Perícia",
        value: formatNamedSpecialization(skill.name, skill.specialization),
        attribute: skill.attribute,
        difficulty: skill.difficulty,
        points: skill.points,
        importedLevel: skill.importedLevel,
        importedRelativeLevel: skill.importedRelativeLevel,
        notes: skill.notes,
        status: skill.status,
      })),
      ...techniques.map(technique => ({
        id: technique.id,
        label: "Técnica",
        value: formatNamedSpecialization(technique.name, technique.specialization),
        skill: formatNamedSpecialization(
          technique.skillName,
          technique.skillSpecialization,
        ),
        difficulty: technique.difficulty,
        points: technique.points,
        importedLevel: technique.importedLevel,
        importedRelativeLevel: technique.importedRelativeLevel,
        defaultPenalty: technique.defaultPenalty,
        maximumRelativeLevel: technique.maximumRelativeLevel,
        notes: technique.notes,
        status: technique.status,
      })),
    ],
  };
}

function createLanguagesCultureCard(languages, familiarities) {
  return {
    id: "languages-culture",
    title: "Idiomas e Cultura",
    status: languages.length === 0 && familiarities.length === 0
      ? "empty"
      : "declared-only",
    items: [
      ...languages.map(language => ({
        id: `language:${language.id}`,
        canonicalId: language.id,
        entryKind: "language",
        label: "Idioma",
        value: language.name || "Idioma sem nome",
        spokenLevel: language.spokenLevel,
        writtenLevel: language.writtenLevel,
        isNative: language.isNative,
        importedCost: language.importedCost,
        reference: language.reference,
        notes: language.notes,
        status: language.status,
      })),
      ...familiarities.map(familiarity => ({
        id: `familiarity:${familiarity.id}`,
        canonicalId: familiarity.id,
        entryKind: "familiarity",
        label: "Familiaridade cultural",
        value: familiarity.name || "Cultura sem nome",
        spokenLevel: null,
        writtenLevel: null,
        isNative: familiarity.isNative,
        importedCost: familiarity.importedCost,
        reference: familiarity.reference,
        notes: familiarity.notes,
        status: familiarity.status,
      })),
    ],
  };
}

function createAttacksCard(attacks) {
  return {
    id: "attacks",
    title: "Ataques",
    status: attacks.items.length === 0 ? "empty" : "declared-only",
    authority: attacks.authority,
    characterId: attacks.characterId,
    items: attacks.items.map(attack => ({
      id: attack.id,
      label: attack.category === "ranged" ? "À distância" : "Corpo a corpo",
      value: attack.name || "Ataque sem nome",
      category: attack.category,
      skillId: attack.skillId,
      sourceKind: attack.source.kind,
      sourceId: attack.source.id,
      damageValue: attack.damage.value,
      damageType: attack.damage.type,
      damageAuthority: attack.damage.authority,
      reach: attack.reach,
      range: attack.range,
      notes: attack.notes,
      status: attack.status,
    })),
  };
}

function createEquipmentCard(equipment) {
  return {
    id: "equipment",
    title: "Equipamentos",
    status: equipment.items.length === 0 ? "empty" : "declared-only",
    totals: cloneValue(equipment.totals),
    items: equipment.items.map(item => ({
      id: item.id,
      label: item.kind === "container" ? "Recipiente" : "Item",
      value: item.name || "Equipamento sem nome",
      parentId: item.parentId,
      depth: item.depth,
      kind: item.kind,
      containerKind: item.containerKind,
      quantity: item.quantity,
      weightKg: item.weightKg,
      cost: item.cost,
      state: item.state,
      uses: item.uses,
      maxUses: item.maxUses,
      notes: item.notes,
      status: item.status,
    })),
  };
}

function createSections(sections) {
  return sections.map(section => ({
    id: section.id,
    title: section.title,
    status: section.status,
    collapsed: false,
  }));
}

function createTextItem(id, label, value) {
  return {
    id,
    label,
    value: value ?? "",
    status: "available",
  };
}

function traitLabel(role) {
  if (role === "advantage") return "Vantagem";
  if (role === "perk") return "Benefício";
  if (role === "disadvantage") return "Desvantagem";
  if (role === "quirk") return "Peculiaridade";
  return "Traço";
}

function formatNamedSpecialization(name, specialization) {
  if (specialization === null || specialization === undefined || specialization === "") {
    return name;
  }
  return `${name} (${specialization})`;
}

function validateToolbar(toolbar) {
  requirePlainObject(toolbar, "Character mobile sheet toolbar");
  requireString(toolbar.title, "Character mobile sheet toolbar title");
  if (!Array.isArray(toolbar.actions)) {
    throw new Error("Character mobile sheet toolbar actions must be an array");
  }
  for (const action of toolbar.actions) {
    requirePlainObject(action, "Character mobile sheet toolbar action");
    requireString(action.id, "Character mobile sheet toolbar action id");
    requireString(action.label, "Character mobile sheet toolbar action label");
    if (!TOOLBAR_ACTION_STATUSES.includes(action.status)) {
      throw new Error(`Character mobile sheet toolbar action ${action.id} status is invalid`);
    }
  }
}

function validateSummary(summary) {
  requirePlainObject(summary, "Character mobile sheet summary");
  for (const key of ["identity", "attributes", "pools"]) {
    if (!Array.isArray(summary[key])) {
      throw new Error(`Character mobile sheet summary ${key} must be an array`);
    }
  }
}

function validateCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    throw new Error("Character mobile sheet cards must be a non-empty array");
  }
  for (const card of cards) {
    requirePlainObject(card, "Character mobile sheet card");
    requireString(card.id, "Character mobile sheet card id");
    requireString(card.title, "Character mobile sheet card title");
    validateStatus(card.status, `Character mobile sheet card ${card.id} status`);
    if (!Array.isArray(card.items)) {
      throw new Error(`Character mobile sheet card ${card.id} items must be an array`);
    }
    if (card.id === "languages-culture") validateLanguagesCultureCard(card);
    if (card.id === "attacks") validateAttacksCard(card);
    if (card.id === "equipment") validateEquipmentCard(card);
  }
}

function validateLanguagesCultureCard(card) {
  const ids = new Set();
  for (const item of card.items) {
    requirePlainObject(item, "Character mobile language or familiarity item");
    requireString(item.id, "Character mobile language or familiarity item id");
    if (ids.has(item.id)) {
      throw new Error("Character mobile language or familiarity item ids must be unique");
    }
    ids.add(item.id);
    requireString(item.canonicalId, `Character mobile item ${item.id} canonicalId`);
    if (!["language", "familiarity"].includes(item.entryKind)) {
      throw new Error(`Character mobile item ${item.id} entryKind is invalid`);
    }
    requireString(item.label, `Character mobile item ${item.id} label`);
    requireString(item.value, `Character mobile item ${item.id} value`);
    if (typeof item.isNative !== "boolean") {
      throw new Error(`Character mobile item ${item.id} isNative is invalid`);
    }
    requireNullableFiniteNumber(
      item.importedCost,
      `Character mobile item ${item.id} importedCost`,
    );
    requireNullableString(item.reference, `Character mobile item ${item.id} reference`);
    if (item.status !== "declared") {
      throw new Error(`Character mobile item ${item.id} status is invalid`);
    }
  }
}

function validateAttacksCard(card) {
  if (card.authority !== "application.attack-read-projection") {
    throw new Error("Character mobile attacks authority is invalid");
  }
  requireString(card.characterId, "Character mobile attacks characterId");
  for (const attack of card.items) {
    requirePlainObject(attack, "Character mobile attack item");
    requireString(attack.id, "Character mobile attack item id");
    requireString(attack.label, `Character mobile attack item ${attack.id} label`);
    requireString(attack.value, `Character mobile attack item ${attack.id} value`);
    if (!["melee", "ranged"].includes(attack.category)) {
      throw new Error(`Character mobile attack item ${attack.id} category is invalid`);
    }
    if (attack.damageAuthority !== "declared") {
      throw new Error(`Character mobile attack item ${attack.id} damage authority is invalid`);
    }
  }
}

function validateEquipmentCard(card) {
  requirePlainObject(card.totals, "Character mobile equipment totals");
  for (const key of ["quantity", "weightKg", "cost"]) {
    if (!Number.isFinite(card.totals[key]) || card.totals[key] < 0) {
      throw new Error(`Character mobile equipment total ${key} is invalid`);
    }
  }
  if (card.totals.authority !== "engine.equipment") {
    throw new Error("Character mobile equipment totals authority is invalid");
  }
  for (const item of card.items) {
    if (!Number.isInteger(item.depth) || item.depth < 0) {
      throw new Error(`Character mobile equipment item ${item.id} depth is invalid`);
    }
  }
}

function validateSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error("Character mobile sheet sections must be a non-empty array");
  }
  for (const section of sections) {
    requirePlainObject(section, "Character mobile sheet section");
    requireString(section.id, "Character mobile sheet section id");
    requireString(section.title, "Character mobile sheet section title");
    validateStatus(section.status, `Character mobile sheet section ${section.id} status`);
    if (typeof section.collapsed !== "boolean") {
      throw new Error(`Character mobile sheet section ${section.id} collapsed must be boolean`);
    }
  }
}

function validateStatus(status, label) {
  if (!CARD_STATUSES.includes(status)) throw new Error(`${label} is invalid`);
}

function validateExactKeys(value, expectedKeys, label) {
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== expectedKeys.length ||
    keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))
  ) {
    throw new Error(`${label} contains unsupported properties`);
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

function requireString(value, label, options = {}) {
  if (typeof value !== "string" || (!options.allowEmpty && value.trim() === "")) {
    throw new Error(`${label} must be a ${options.allowEmpty ? "string" : "non-empty string"}`);
  }
}

function requireNullableString(value, label) {
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
  }
}

function requireNullableFiniteNumber(value, label) {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number or null`);
  }
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
