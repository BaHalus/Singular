import {
  serializeCharacterMobileProjection,
} from "./CharacterMobileProjection.js";

const RENDER_MODEL_SCHEMA_VERSION = 1;
const RENDER_MODEL_KEYS = Object.freeze([
  "schemaVersion",
  "title",
  "subtitle",
  "toolbar",
  "summary",
  "cards",
  "sections",
]);
const CARD_STATUSES = Object.freeze(["available", "declared-only", "pending", "external-front"]);
const TOOLBAR_ACTION_STATUSES = Object.freeze(["pending"]);

/**
 * Prepara a primeira estrutura portátil para renderização da ficha mobile.
 *
 * Esta camada não calcula regra, ponto, nível, carga ou derivado de GURPS.
 * Ela apenas reorganiza uma CharacterMobileProjection já validada em blocos
 * consumíveis por uma futura tela visual.
 */
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
      {
        id: "mode-creation",
        label: "Criação",
        status: "pending",
      },
      {
        id: "mode-table",
        label: "Mesa",
        status: "pending",
      },
      {
        id: "save",
        label: "Salvar",
        status: "pending",
      },
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
  ];
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
      throw new Error(
        `Character mobile sheet toolbar action ${action.id} status is invalid`,
      );
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
  if (!CARD_STATUSES.includes(status)) {
    throw new Error(`${label} is invalid`);
  }
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
