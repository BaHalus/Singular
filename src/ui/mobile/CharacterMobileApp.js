import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../../application/session/ApplicationSession.js";
import {
  createAlphaMobilePersistenceBootstrap,
} from "../../application/bootstrap/AlphaMobilePersistenceBootstrap.js";
import {
  createCharacterMobileSheetRenderModelForCharacter,
} from "./CharacterMobileSheetComposition.js";
import { renderCharacterMobileSheetHtml } from "./CharacterMobileSheetHtml.js";
import {
  mountAlphaMobilePersistenceUi,
} from "./AlphaMobilePersistenceUi.js";
import {
  mountCharacterMobileInteractionController,
} from "./CharacterMobileInteractionController.js";
import {
  createCharacterMobileModeSync,
} from "./CharacterMobileModeSync.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const MOBILE_MODES = Object.freeze(["creation", "table"]);

export function mountCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile app options");
  const root = options.root;
  requireMountRoot(root);

  const character = options.character ?? createCharacter();
  const mode = normalizeMode(options.mode ?? "creation");
  const html = renderCharacterMobileApp(character, { mode });

  root.innerHTML = html;
  setRootAttribute(root, "data-singular-mounted", "true");
  setRootAttribute(root, "data-character-id", character.identity.id);
  setRootAttribute(root, "data-mode", mode);

  return Object.freeze({ character, mode, html });
}

export async function bootstrapCharacterMobileApp(options = {}) {
  requirePlainObject(options, "Character mobile bootstrap options");
  const root = options.root ?? resolveMobileRoot(options.document);
  requireInteractiveMountRoot(root);

  let mode = normalizeMode(options.mode ?? "creation");
  const application = createAlphaMobilePersistenceBootstrap({
    initialSession: createInitialSession(options),
    storage: options.storage,
    namespace: options.namespace,
    runtime: options.runtime,
    createImportedSession: options.createImportedSession,
  });
  const ui = await mountAlphaMobilePersistenceUi({
    root,
    persistence: application.persistence,
    downloadText: options.downloadText,
    mode,
  });

  const render = () => {
    const activeSession = application.persistence.getActiveSession();
    root.innerHTML = injectTraitControls(ui.render({ mode }), activeSession.character, mode);
    setRootAttribute(root, "data-singular-mounted", "true");
    setRootAttribute(root, "data-session-id", activeSession.id);
    setRootAttribute(root, "data-character-id", activeSession.character.identity.id);
    setRootAttribute(root, "data-mode", mode);
  };
  const modeSync = createCharacterMobileModeSync({
    root,
    getMode: () => mode,
    render,
    MutationObserver: options.MutationObserver,
  });
  const interactions = mountCharacterMobileInteractionController({
    root,
    commands: application.commands,
    ui,
    getMode: () => mode,
    setMode(nextMode) {
      mode = normalizeMode(nextMode);
    },
    readCharacterSummary() {
      return {
        name: readInputValue(root, '[data-role="character-name"]'),
        concept: readInputValue(root, '[data-role="character-concept"]'),
      };
    },
    readAttackDraft() {
      return {
        name: readInputValue(root, '[data-role="attack-name"]'),
        category: readInputValue(root, '[data-role="attack-category"]') || "melee",
        skillId: readInputValue(root, '[data-role="attack-skill-id"]'),
        damageValue: readInputValue(root, '[data-role="attack-damage-value"]'),
        damageType: readInputValue(root, '[data-role="attack-damage-type"]'),
        reach: readInputValue(root, '[data-role="attack-reach"]'),
        range: readInputValue(root, '[data-role="attack-range"]'),
        notes: readInputValue(root, '[data-role="attack-notes"]'),
      };
    },
    readEquipmentDraft() {
      return {
        name: readInputValue(root, '[data-role="equipment-name"]'),
        kind: readInputValue(root, '[data-role="equipment-kind"]') || "item",
        quantity: readInputNumber(root, '[data-role="equipment-quantity"]', 1),
        weightKg: readInputNumber(root, '[data-role="equipment-weight-kg"]', 0),
        cost: readInputNumber(root, '[data-role="equipment-cost"]', 0),
        state: readInputValue(root, '[data-role="equipment-state"]') || "carried",
        notes: readInputValue(root, '[data-role="equipment-notes"]'),
      };
    },
    readSpellDraft() {
      return {
        name: readInputValue(root, '[data-role="spell-name"]'),
        spellType: readInputValue(root, '[data-role="spell-type"]') || "standard",
        attribute: readInputValue(root, '[data-role="spell-attribute"]'),
        difficulty: readInputValue(root, '[data-role="spell-difficulty"]'),
        points: readInputNumber(root, '[data-role="spell-points"]', 0),
        spellClass: readInputValue(root, '[data-role="spell-class"]'),
        resistance: readInputValue(root, '[data-role="spell-resistance"]'),
        castingCost: readInputValue(root, '[data-role="spell-casting-cost"]'),
        maintenanceCost: readInputValue(root, '[data-role="spell-maintenance-cost"]'),
        castingTime: readInputValue(root, '[data-role="spell-casting-time"]'),
        duration: readInputValue(root, '[data-role="spell-duration"]'),
        notes: readInputValue(root, '[data-role="spell-notes"]'),
      };
    },
    readTraitDraft() {
      const points = readInputNumber(root, '[data-role="trait-points"]', null);
      const levels = readInputNumber(root, '[data-role="trait-levels"]', null);
      return {
        trait: {
          name: readInputValue(root, '[data-role="trait-name"]'),
          role: readInputValue(root, '[data-role="trait-role"]') || "advantage",
          points,
          levels,
          selfControl: createDefaultTraitSelfControl(),
          frequency: createDefaultTraitFrequency(),
          roundCostDown: false,
          choices: [],
          notes: readInputValue(root, '[data-role="trait-notes"]'),
          tags: splitTextList(readInputValue(root, '[data-role="trait-tags"]')),
          source: { kind: "singular" },
          pointValue: {
            declaredPoints: points,
            levels,
          },
        },
      };
    },
    readPowerDraft() {
      return {
        name: readInputValue(root, '[data-role="power-name"]'),
        source: readInputValue(root, '[data-role="power-source"]'),
        powerModifierName: readInputValue(root, '[data-role="power-modifier-name"]'),
        powerModifierValuePercent: readInputNumber(root, '[data-role="power-modifier-value-percent"]', null),
        powerModifierNotes: readInputValue(root, '[data-role="power-modifier-notes"]'),
        talentTraitId: readInputValue(root, '[data-role="power-talent-trait-id"]'),
        memberTraitIds: readInputValue(root, '[data-role="power-member-trait-ids"]'),
        tags: readInputValue(root, '[data-role="power-tags"]'),
        notes: readInputValue(root, '[data-role="power-notes"]'),
      };
    },
    readPowerRenameDraft(powerId) {
      return {
        powerId,
        name: readInputValue(root, `[data-role="power-rename"][data-power-id="${escapeSelectorValue(powerId)}"]`),
      };
    },
    render,
    syncMode: modeSync.sync,
  });
  render();
  modeSync.sync();

  return Object.freeze({
    get character() {
      return application.persistence.getActiveSession().character;
    },
    get session() {
      return application.persistence.getActiveSession();
    },
    get html() {
      return root.innerHTML;
    },
    get mode() {
      return mode;
    },
    interactions,
    modeSync,
    ui,
    persistence: application.persistence,
    commands: application.commands,
    repositories: application.repositories,
    runtime: application.runtime,
  });
}

export function renderCharacterMobileApp(character, options = {}) {
  requirePlainObject(options, "Character mobile render options");
  const mode = normalizeMode(options.mode ?? "creation");
  const renderModel = createCharacterMobileSheetRenderModelForCharacter(character);
  return injectTraitControls(renderCharacterMobileSheetHtml(renderModel, { mode }), character, mode);
}

export function getCharacterMobileRootSelector() {
  return MOBILE_ROOT_SELECTOR;
}

export function getCharacterMobileModes() {
  return [...MOBILE_MODES];
}

function resolveMobileRoot(documentOption) {
  const documentRef = documentOption ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile bootstrap requires a document");
  }
  const root = documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) {
    throw new Error("Character mobile bootstrap root was not found");
  }
  return root;
}

function injectTraitControls(html, character, mode) {
  const marker = 'data-card="traits"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;

  const sectionStart = html.lastIndexOf("<section", markerIndex);
  const headerEnd = html.indexOf("</h2>", markerIndex);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  if (sectionStart < 0 || headerEnd < 0 || sectionEnd < 0) return html;

  const header = html.slice(sectionStart, headerEnd + "</h2>".length);
  const before = html.slice(0, sectionStart);
  const after = html.slice(sectionEnd + "</section>".length);
  return [
    before,
    header,
    renderTraitCardBody(character.traits ?? [], mode),
    "</section>",
    after,
  ].join("");
}

function renderTraitCardBody(traits, mode) {
  const editor = mode === "creation" ? renderTraitEditor() : "";
  const list = traits.length === 0
    ? '<p class="singular-mobile-sheet__empty">Nenhum traço declarado.</p>'
    : [
      '<dl class="singular-mobile-sheet__trait-list">',
      traits.map((trait, index) => renderTraitItem(trait, mode, index, traits.length)).join(""),
      "</dl>",
    ].join("");
  return `${editor}${list}`;
}

function renderTraitEditor() {
  return [
    '<div class="singular-mobile-sheet__trait-editor" data-role="trait-editor">',
    '<label>Nome<input type="text" data-role="trait-name" autocomplete="off"></label>',
    '<label>Tipo<select data-role="trait-role"><option value="advantage">Vantagem</option><option value="disadvantage">Desvantagem</option><option value="perk">Peculiaridade positiva</option><option value="quirk">Peculiaridade negativa</option><option value="feature">Característica</option></select></label>',
    '<label>Pontos<input type="number" step="1" data-role="trait-points"></label>',
    '<label>Níveis<input type="number" min="0" step="1" data-role="trait-levels"></label>',
    '<label>Tags<input type="text" data-role="trait-tags" autocomplete="off"></label>',
    '<label>Notas<input type="text" data-role="trait-notes" autocomplete="off"></label>',
    '<button type="button" data-action="trait-add">Adicionar traço</button>',
    "</div>",
  ].join("");
}

function renderTraitItem(trait, mode, index, total) {
  const id = escapeAttribute(trait.id);
  const name = escapeText(trait.name ?? "Traço sem nome");
  const controls = mode === "creation" ? renderTraitControls(trait, index, total) : "";
  return [
    `<div data-trait-id="${id}" data-trait-role="${escapeAttribute(trait.role ?? "trait")}">`,
    `<dt>${escapeText(localizedTraitRole(trait.role))}</dt>`,
    `<dd>${name}${renderTraitDetails(trait)}${controls}</dd>`,
    "</div>",
  ].join("");
}

function renderTraitControls(trait, index, total) {
  const id = escapeAttribute(trait.id);
  const name = escapeAttribute(trait.name ?? "traço");
  const up = index > 0
    ? `<button type="button" data-action="trait-reorder" data-trait-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="trait-reorder" data-trait-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__trait-actions">',
    up,
    down,
    `<button type="button" data-action="trait-remove" data-trait-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderTraitDetails(trait) {
  const details = [];
  if (trait.points !== undefined && trait.points !== null) details.push(`${formatValue(trait.points)} pts`);
  if (trait.levels !== undefined && trait.levels !== null) details.push(`Nv ${formatValue(trait.levels)}`);
  if (trait.notes) details.push(trait.notes);
  if (Array.isArray(trait.tags) && trait.tags.length > 0) details.push(`Tags ${trait.tags.join(", ")}`);
  if (details.length === 0) return "";
  return ` <small>${escapeText(details.join(" · "))}</small>`;
}

function localizedTraitRole(role) {
  if (role === "advantage") return "Vantagem";
  if (role === "disadvantage") return "Desvantagem";
  if (role === "perk") return "Peculiaridade positiva";
  if (role === "quirk") return "Peculiaridade negativa";
  if (role === "feature") return "Característica";
  return "Traço";
}

function createInitialSession(options) {
  if (options.session !== undefined) {
    if (options.character !== undefined || options.sessionId !== undefined) {
      throw new Error(
        "Character mobile bootstrap session cannot be combined with character or sessionId",
      );
    }
    return options.session;
  }
  const character = options.character ?? createCharacter();
  return createApplicationSession({
    id: options.sessionId ?? `session:${character.identity.id}`,
    character,
    metadata: { source: "alpha-mobile-bootstrap" },
  });
}

function createDefaultTraitSelfControl() {
  return {
    roll: 0,
    status: "none",
    multiplier: 1,
    penalty: 0,
    adjustment: {
      type: "none",
      status: "ready",
      value: 0,
    },
    raw: null,
  };
}

function createDefaultTraitFrequency() {
  return {
    roll: 0,
    status: "none",
    multiplier: 1,
    raw: null,
  };
}

function readInputValue(root, selector) {
  const input = root.querySelector?.(selector);
  return typeof input?.value === "string" ? input.value : "";
}

function readInputNumber(root, selector, fallback) {
  const raw = readInputValue(root, selector);
  if (raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function splitTextList(value) {
  if (typeof value !== "string") return [];
  return value
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

function escapeSelectorValue(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function normalizeMode(value) {
  if (!MOBILE_MODES.includes(value)) {
    throw new Error("Character mobile app mode is invalid");
  }
  return value;
}

function requireMountRoot(root) {
  if (root === null || typeof root !== "object" || !("innerHTML" in root)) {
    throw new Error("Character mobile app root must support innerHTML");
  }
}

function requireInteractiveMountRoot(root) {
  requireMountRoot(root);
  if (typeof root.addEventListener !== "function") {
    throw new Error("Character mobile app root must support addEventListener");
  }
}

function setRootAttribute(root, name, value) {
  root.setAttribute?.(name, value);
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
