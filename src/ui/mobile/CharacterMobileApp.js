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
import { createCharacterMobilePostRenderLifecycle } from "./CharacterMobilePostRenderLifecycle.js";

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
  const postRenderLifecycle = options.postRenderLifecycle ?? createCharacterMobilePostRenderLifecycle();
  const application = createAlphaMobilePersistenceBootstrap({
    initialSession: createInitialSession(options),
    storage: options.storage,
    namespace: options.namespace,
    runtime: options.runtime,
    createImportedSession: options.createImportedSession,
  });
  const render = (renderOptions = {}) => {
    const renderMode = normalizeMode(renderOptions.mode ?? mode);
    const activeSession = application.persistence.getActiveSession();
    const renderer = renderOptions.ui ?? ui;
    root.innerHTML = injectMobileCreationControls(
      renderer.render({ mode: renderMode }),
      activeSession.character,
      renderMode,
    );
    setRootAttribute(root, "data-singular-mounted", "true");
    setRootAttribute(root, "data-session-id", activeSession.id);
    setRootAttribute(root, "data-character-id", activeSession.character.identity.id);
    setRootAttribute(root, "data-mode", renderMode);
    if (!renderOptions.skipPostRenderLifecycle) {
      postRenderLifecycle.run({
        root,
        character: activeSession.character,
        session: activeSession,
        mode: renderMode,
      });
    }
  };
  const ui = await mountAlphaMobilePersistenceUi({
    root,
    persistence: application.persistence,
    downloadText: options.downloadText,
    getMode: () => mode,
    render({ ui: mountedUi, mode: renderMode }) {
      render({ ui: mountedUi, mode: renderMode });
    },
  });

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
    readSkillDraft() {
      return {
        skill: {
          name: readInputValue(root, '[data-role="skill-name"]'),
          specialization: readInputValue(root, '[data-role="skill-specialization"]'),
          techLevel: normalizeOptionalText(readInputValue(root, '[data-role="skill-tech-level"]')),
          attribute: normalizeOptionalText(readInputValue(root, '[data-role="skill-attribute"]')),
          difficulty: normalizeOptionalText(readInputValue(root, '[data-role="skill-difficulty"]')),
          points: readInputNumber(root, '[data-role="skill-points"]', 0),
          notes: readInputValue(root, '[data-role="skill-notes"]'),
          tags: splitTextList(readInputValue(root, '[data-role="skill-tags"]')),
        },
      };
    },
    readTechniqueDraft() {
      return {
        technique: {
          name: readInputValue(root, '[data-role="technique-name"]'),
          specialization: readInputValue(root, '[data-role="technique-specialization"]'),
          skillId: normalizeOptionalText(readInputValue(root, '[data-role="technique-skill-id"]')),
          skillName: readInputValue(root, '[data-role="technique-skill-name"]'),
          skillSpecialization: readInputValue(root, '[data-role="technique-skill-specialization"]'),
          difficulty: normalizeOptionalText(readInputValue(root, '[data-role="technique-difficulty"]')),
          points: readInputNumber(root, '[data-role="technique-points"]', 0),
          defaultPenalty: readInputNumber(root, '[data-role="technique-default-penalty"]', null),
          maximumRelativeLevel: readInputNumber(root, '[data-role="technique-maximum-relative-level"]', null),
          notes: readInputValue(root, '[data-role="technique-notes"]'),
          tags: splitTextList(readInputValue(root, '[data-role="technique-tags"]')),
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
    postRenderLifecycle,
    render,
  });
}

export function renderCharacterMobileApp(character, options = {}) {
  requirePlainObject(options, "Character mobile render options");
  const mode = normalizeMode(options.mode ?? "creation");
  const renderModel = createCharacterMobileSheetRenderModelForCharacter(character);
  return injectMobileCreationControls(renderCharacterMobileSheetHtml(renderModel, { mode }), character, mode);
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

function injectMobileCreationControls(html, character, mode) {
  return injectSkillTechniqueControls(
    injectTraitControls(html, character, mode),
    character,
    mode,
  );
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

function injectSkillTechniqueControls(html, character, mode) {
  const marker = 'data-card="skills-techniques"';
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
    renderSkillTechniqueCardBody(character.skills ?? [], character.techniques ?? [], mode),
    "</section>",
    after,
  ].join("");
}

function renderSkillTechniqueCardBody(skills, techniques, mode) {
  const editor = mode === "creation" ? renderSkillTechniqueEditors() : "";
  const empty = skills.length === 0 && techniques.length === 0;
  const list = empty
    ? '<p class="singular-mobile-sheet__empty">Nenhuma perícia ou técnica declarada.</p>'
    : [
      '<dl class="singular-mobile-sheet__skill-technique-list">',
      skills.map((skill, index) => renderSkillItem(skill, mode, index, skills.length)).join(""),
      techniques.map((technique, index) => renderTechniqueItem(
        technique,
        mode,
        index,
        techniques.length,
      )).join(""),
      "</dl>",
    ].join("");
  return `${editor}${list}`;
}

function renderSkillTechniqueEditors() {
  return [
    '<div class="singular-mobile-sheet__skill-editor" data-role="skill-editor">',
    '<h3>Nova perícia</h3>',
    '<label>Nome<input type="text" data-role="skill-name" autocomplete="off"></label>',
    '<label>Especialização<input type="text" data-role="skill-specialization" autocomplete="off"></label>',
    '<label>TL<input type="text" data-role="skill-tech-level" autocomplete="off"></label>',
    '<label>Atributo<input type="text" data-role="skill-attribute" autocomplete="off"></label>',
    '<label>Dif<input type="text" data-role="skill-difficulty" autocomplete="off"></label>',
    '<label>Pontos<input type="number" min="0" step="1" data-role="skill-points" value="0"></label>',
    '<label>Tags<input type="text" data-role="skill-tags" autocomplete="off"></label>',
    '<label>Notas<input type="text" data-role="skill-notes" autocomplete="off"></label>',
    '<button type="button" data-action="skill-add">Adicionar perícia</button>',
    "</div>",
    '<div class="singular-mobile-sheet__technique-editor" data-role="technique-editor">',
    '<h3>Nova técnica</h3>',
    '<label>Nome<input type="text" data-role="technique-name" autocomplete="off"></label>',
    '<label>Especialização<input type="text" data-role="technique-specialization" autocomplete="off"></label>',
    '<label>Perícia base (ID)<input type="text" data-role="technique-skill-id" autocomplete="off"></label>',
    '<label>Perícia base<input type="text" data-role="technique-skill-name" autocomplete="off"></label>',
    '<label>Especialização base<input type="text" data-role="technique-skill-specialization" autocomplete="off"></label>',
    '<label>Dif<input type="text" data-role="technique-difficulty" autocomplete="off"></label>',
    '<label>Pontos<input type="number" min="0" step="1" data-role="technique-points" value="0"></label>',
    '<label>PD<input type="number" step="1" data-role="technique-default-penalty"></label>',
    '<label>Máx rel.<input type="number" step="1" data-role="technique-maximum-relative-level"></label>',
    '<label>Tags<input type="text" data-role="technique-tags" autocomplete="off"></label>',
    '<label>Notas<input type="text" data-role="technique-notes" autocomplete="off"></label>',
    '<button type="button" data-action="technique-add">Adicionar técnica</button>',
    "</div>",
  ].join("");
}

function renderSkillItem(skill, mode, index, total) {
  const id = escapeAttribute(skill.id);
  const name = escapeText(formatNamedSpecialization(skill.name, skill.specialization) || "Perícia sem nome");
  const controls = mode === "creation" ? renderSkillControls(skill, index, total) : "";
  return [
    `<div data-skill-id="${id}">`,
    "<dt>Perícia</dt>",
    `<dd>${name}${renderSkillDetails(skill)}${controls}</dd>`,
    "</div>",
  ].join("");
}

function renderSkillControls(skill, index, total) {
  const id = escapeAttribute(skill.id);
  const name = escapeAttribute(formatNamedSpecialization(skill.name, skill.specialization) || "perícia");
  const up = index > 0
    ? `<button type="button" data-action="skill-reorder" data-skill-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="skill-reorder" data-skill-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__skill-actions">',
    up,
    down,
    `<button type="button" data-action="skill-remove" data-skill-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderTechniqueItem(technique, mode, index, total) {
  const id = escapeAttribute(technique.id);
  const name = escapeText(
    formatNamedSpecialization(technique.name, technique.specialization) || "Técnica sem nome",
  );
  const controls = mode === "creation" ? renderTechniqueControls(technique, index, total) : "";
  return [
    `<div data-technique-id="${id}">`,
    "<dt>Técnica</dt>",
    `<dd>${name}${renderTechniqueDetails(technique)}${controls}</dd>`,
    "</div>",
  ].join("");
}

function renderTechniqueControls(technique, index, total) {
  const id = escapeAttribute(technique.id);
  const name = escapeAttribute(
    formatNamedSpecialization(technique.name, technique.specialization) || "técnica",
  );
  const up = index > 0
    ? `<button type="button" data-action="technique-reorder" data-technique-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="technique-reorder" data-technique-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__technique-actions">',
    up,
    down,
    `<button type="button" data-action="technique-remove" data-technique-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderSkillDetails(skill) {
  const details = [];
  if (skill.attribute || skill.difficulty) details.push([skill.attribute, skill.difficulty].filter(Boolean).join("/"));
  if (skill.points !== undefined && skill.points !== null) details.push(`${formatValue(skill.points)} pts`);
  if (skill.importedLevel !== undefined && skill.importedLevel !== null) details.push(`NH importado ${formatValue(skill.importedLevel)}`);
  if (skill.importedRelativeLevel !== undefined && skill.importedRelativeLevel !== null) details.push(`rel. importado ${formatSignedNumber(skill.importedRelativeLevel)}`);
  if (skill.notes) details.push(skill.notes);
  if (Array.isArray(skill.tags) && skill.tags.length > 0) details.push(`Tags ${skill.tags.join(", ")}`);
  if (details.length === 0) return "";
  return ` <small>${escapeText(details.join(" · "))}</small>`;
}

function renderTechniqueDetails(technique) {
  const details = [];
  const baseSkill = formatNamedSpecialization(technique.skillName, technique.skillSpecialization);
  if (baseSkill) details.push(`base ${baseSkill}`);
  if (technique.difficulty) details.push(technique.difficulty);
  if (technique.points !== undefined && technique.points !== null) details.push(`${formatValue(technique.points)} pts`);
  if (technique.defaultPenalty !== undefined && technique.defaultPenalty !== null) details.push(`pd ${formatSignedNumber(technique.defaultPenalty)}`);
  if (technique.maximumRelativeLevel !== undefined && technique.maximumRelativeLevel !== null) details.push(`máx ${formatSignedNumber(technique.maximumRelativeLevel)}`);
  if (technique.importedLevel !== undefined && technique.importedLevel !== null) details.push(`NH importado ${formatValue(technique.importedLevel)}`);
  if (technique.importedRelativeLevel !== undefined && technique.importedRelativeLevel !== null) details.push(`rel. importado ${formatSignedNumber(technique.importedRelativeLevel)}`);
  if (technique.notes) details.push(technique.notes);
  if (Array.isArray(technique.tags) && technique.tags.length > 0) details.push(`Tags ${technique.tags.join(", ")}`);
  if (details.length === 0) return "";
  return ` <small>${escapeText(details.join(" · "))}</small>`;
}

function formatNamedSpecialization(name, specialization) {
  if (specialization === null || specialization === undefined || specialization === "") {
    return name ?? "";
  }
  return `${name ?? ""} (${specialization})`;
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

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
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

function formatSignedNumber(value) {
  if (value === undefined || value === null || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number > 0 ? `+${number}` : String(number);
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