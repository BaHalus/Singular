import {
  bootstrapCharacterMobileSecondaryNotesApp,
} from "./CharacterMobileSecondaryNotesApp.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "./CharacterMobilePostRenderLifecycle.js";
import {
  escapeAttribute,
  escapeSelectorValue,
  escapeTextContent as escapeText,
  findDataTarget,
  readDataset,
  readInputValue,
  readNumberInputValue as readInputNumber,
  renderTextareaText,
  requirePlainObject,
  resolveMobileRoot,
  splitTextList,
} from "./MobileInlineEditHelpers.js";

const TRAIT_ROLES = Object.freeze([
  ["advantage", "Vantagem"],
  ["disadvantage", "Desvantagem"],
  ["perk", "Peculiaridade positiva"],
  ["quirk", "Peculiaridade negativa"],
  ["feature", "Característica"],
]);

export async function bootstrapCharacterMobileTraitEditApp(options = {}) {
  requirePlainObject(options, "Character mobile trait edit bootstrap options");
  const postRenderLifecycle = resolvePostRenderLifecycle(options.postRenderLifecycle);
  const bootstrapOptions = Object.freeze({
    ...disableObserverConstructorOption(options),
    postRenderLifecycle,
  });
  const app = await bootstrapCharacterMobileSecondaryNotesApp(bootstrapOptions);
  const mounted = mountCharacterMobileTraitEditApp(
    exposePostRenderLifecycle(app, postRenderLifecycle),
    options,
  );
  const previousDestroy = app.secondaryNotes?.destroy;

  return Object.freeze({
    get character() {
      return mounted.character;
    },
    get session() {
      return mounted.session;
    },
    get html() {
      return mounted.html;
    },
    get mode() {
      return mounted.mode;
    },
    interactions: mounted.interactions,
    modeSync: mounted.modeSync,
    ui: mounted.ui,
    persistence: mounted.persistence,
    commands: mounted.commands,
    repositories: mounted.repositories,
    runtime: mounted.runtime,
    postRenderLifecycle: mounted.postRenderLifecycle,
    render: mounted.render,
    traitEdit: Object.freeze({
      destroy() {
        mounted.traitEdit.destroy();
        previousDestroy?.();
      },
    }),
  });
}

export function mountCharacterMobileTraitEditApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(
    options.document,
    "Character mobile trait edit bootstrap root was not found",
  );
  const postRenderLifecycle = resolvePostRenderLifecycle(app.postRenderLifecycle);
  const lifecycleApp = exposePostRenderLifecycle(app, postRenderLifecycle);

  const mountTraitEditors = context => {
    injectCurrentTraitControls(context.root, {
      character: context.character,
      mode: context.mode,
      modeSync: lifecycleApp.modeSync,
    });
  };
  const unregisterPostRender = postRenderLifecycle.register(mountTraitEditors);

  const render = (renderOptions = {}) => {
    const result = lifecycleApp.render({
      ...renderOptions,
      skipPostRenderLifecycle: true,
    });
    if (!renderOptions.skipPostRenderLifecycle) {
      runPostRenderLifecycle(postRenderLifecycle, root, lifecycleApp, renderOptions);
    }
    return result;
  };

  mountTraitEditors(readPostRenderContext(root, lifecycleApp));

  const handleClick = async event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");

    if (action !== "trait-update") return null;
    event.preventDefault?.();

    if (lifecycleApp.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (lifecycleApp.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const traitId = readDataset(actionTarget, "traitId");
    const result = lifecycleApp.commands.updateTrait({
      traitId,
      patch: readTraitPatch(root, traitId, lifecycleApp.persistence.getActiveSession().character),
    });
    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    get character() {
      return lifecycleApp.character;
    },
    get session() {
      return lifecycleApp.session;
    },
    get html() {
      return root.innerHTML;
    },
    get mode() {
      return lifecycleApp.mode;
    },
    interactions: lifecycleApp.interactions,
    modeSync: lifecycleApp.modeSync,
    ui: lifecycleApp.ui,
    persistence: lifecycleApp.persistence,
    commands: lifecycleApp.commands,
    repositories: lifecycleApp.repositories,
    runtime: lifecycleApp.runtime,
    postRenderLifecycle,
    render,
    traitEdit: Object.freeze({
      destroy() {
        unregisterPostRender();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectMobileTraitEditControls(html, character, mode) {
  const marker = 'data-card="traits"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;

  const sectionStart = html.lastIndexOf("<section", markerIndex);
  const headerEnd = html.indexOf("</h2>", markerIndex);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  if (sectionStart < 0 || headerEnd < 0 || sectionEnd < 0) return html;

  return [
    html.slice(0, sectionStart),
    html.slice(sectionStart, headerEnd + "</h2>".length),
    renderTraitBody(character.traits ?? [], mode),
    "</section>",
    html.slice(sectionEnd + "</section>".length),
  ].join("");
}

function injectCurrentTraitControls(root, { character, mode, modeSync }) {
  const section = root.querySelector?.('[data-card="traits"]') ?? null;
  if (section === null) {
    modeSync.sync();
    return false;
  }

  replaceTraitSectionBody(section, renderTraitBody(character.traits ?? [], mode));
  modeSync.sync();
  return true;
}

function replaceTraitSectionBody(section, bodyHtml) {
  const header = section.querySelector?.("h2") ?? null;
  if (header === null) return false;

  while (header.nextSibling !== null) {
    header.nextSibling.remove();
  }

  const documentRef = section.ownerDocument ?? globalThis.document;
  const template = documentRef?.createElement?.("template") ?? null;
  if (template === null || typeof section.append !== "function") return false;

  template.innerHTML = bodyHtml;
  const nodes = Array.from(template.content?.childNodes ?? []);
  if (nodes.length === 0) return false;
  section.append(...nodes);
  return true;
}

function renderTraitBody(traits, mode) {
  const editor = mode === "creation" ? renderTraitCreationEditor() : "";
  const list = traits.length === 0
    ? '<p class="singular-mobile-sheet__empty">Nenhum traço declarado.</p>'
    : [
      '<dl class="singular-mobile-sheet__trait-list">',
      traits.map((trait, index) => renderTraitItem(trait, mode, index, traits.length)).join(""),
      "</dl>",
    ].join("");
  return `${editor}${list}`;
}

function renderTraitCreationEditor() {
  return [
    '<div class="singular-mobile-sheet__trait-editor" data-role="trait-editor">',
    '<label>Nome<input type="text" data-role="trait-name" autocomplete="off"></label>',
    `<label>Tipo<select data-role="trait-role">${renderRoleOptions("advantage")}</select></label>`,
    '<label>Pontos<input type="number" step="1" data-role="trait-points"></label>',
    '<label>Níveis<input type="number" min="0" step="1" data-role="trait-levels"></label>',
    '<label>Tags<input type="text" data-role="trait-tags" autocomplete="off"></label>',
    '<label>Notas<textarea data-role="trait-notes" autocomplete="off"></textarea></label>',
    '<button type="button" data-action="trait-add">Adicionar traço</button>',
    "</div>",
  ].join("");
}

function renderTraitItem(trait, mode, index, total) {
  const id = escapeAttribute(trait.id);
  const controls = mode === "creation" ? renderTraitControls(trait, index, total) : "";
  const editor = mode === "creation" ? renderTraitInlineEditor(trait) : "";
  return [
    `<div data-trait-id="${id}" data-trait-role="${escapeAttribute(trait.role ?? "trait")}">`,
    `<dt>${escapeText(localizedTraitRole(trait.role))}</dt>`,
    `<dd>${escapeText(trait.name ?? "Traço sem nome")}${renderTraitDetails(trait)}${controls}${editor}</dd>`,
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

function renderTraitInlineEditor(trait) {
  const id = escapeAttribute(trait.id);
  const tags = Array.isArray(trait.tags) ? trait.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__trait-inline-editor" data-role="trait-inline-editor" data-trait-id="${id}">`,
    `<label>Nome <input type="text" data-role="trait-edit-name-${id}" value="${escapeAttribute(trait.name ?? "")}" autocomplete="off"></label>`,
    `<label>Tipo <select data-role="trait-edit-role-${id}">${renderRoleOptions(trait.role)}</select></label>`,
    `<label>Pontos <input type="number" step="1" data-role="trait-edit-points-${id}" value="${escapeAttribute(trait.points ?? "")}"></label>`,
    `<label>Níveis <input type="number" min="0" step="1" data-role="trait-edit-levels-${id}" value="${escapeAttribute(trait.levels ?? "")}"></label>`,
    `<label>Tags <input type="text" data-role="trait-edit-tags-${id}" value="${escapeAttribute(tags)}" autocomplete="off"></label>`,
    `<label>Notas <textarea data-role="trait-edit-notes-${id}" autocomplete="off">${renderTextareaText(trait.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="trait-update" data-trait-id="${id}">Salvar traço</button>`,
    "</div>",
  ].join("");
}

function renderRoleOptions(activeRole) {
  const knownRoles = TRAIT_ROLES.map(([value]) => value);
  const customRoleOption = typeof activeRole === "string" && activeRole !== "" && !knownRoles.includes(activeRole)
    ? [[activeRole, activeRole]]
    : [];
  return [...customRoleOption, ...TRAIT_ROLES].map(([value, label]) => {
    const selected = value === activeRole ? " selected" : "";
    return `<option value="${escapeAttribute(value)}"${selected}>${escapeText(label)}</option>`;
  }).join("");
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

function readTraitPatch(root, traitId, character) {
  const suffix = escapeSelectorValue(traitId);
  const existingTrait = findTrait(character, traitId);
  const points = readInputNumber(root, `[data-role="trait-edit-points-${suffix}"]`, null);
  const levels = readInputNumber(root, `[data-role="trait-edit-levels-${suffix}"]`, null);
  const patch = {
    name: readInputValue(root, `[data-role="trait-edit-name-${suffix}"]`),
    role: readInputValue(root, `[data-role="trait-edit-role-${suffix}"]`) || existingTrait?.role || "advantage",
    points,
    levels,
    notes: readInputValue(root, `[data-role="trait-edit-notes-${suffix}"]`),
    tags: splitTextList(readInputValue(root, `[data-role="trait-edit-tags-${suffix}"]`)),
    pointValue: {
      legacyPoints: points,
      declaredPoints: points,
      levels,
    },
  };

  preserveExistingTraitField(patch, existingTrait, "selfControl");
  preserveExistingTraitField(patch, existingTrait, "frequency");
  preserveExistingTraitField(patch, existingTrait, "roundCostDown");
  preserveExistingTraitField(patch, existingTrait, "source");
  if (Array.isArray(existingTrait?.choices)) patch.choices = [...existingTrait.choices];

  return patch;
}

function preserveExistingTraitField(patch, trait, field) {
  if (
    trait !== null &&
    trait !== undefined &&
    Object.prototype.hasOwnProperty.call(trait, field) &&
    trait[field] !== undefined
  ) {
    patch[field] = trait[field];
  }
}

function findTrait(character, traitId) {
  return (character?.traits ?? []).find(trait => trait.id === traitId) ?? null;
}

function localizedTraitRole(role) {
  if (role === "advantage") return "Vantagem";
  if (role === "disadvantage") return "Desvantagem";
  if (role === "perk") return "Peculiaridade positiva";
  if (role === "quirk") return "Peculiaridade negativa";
  if (role === "feature") return "Característica";
  return role || "Traço";
}

function runPostRenderLifecycle(postRenderLifecycle, root, app, renderOptions = {}) {
  postRenderLifecycle.run(readPostRenderContext(root, app, renderOptions));
}

function readPostRenderContext(root, app, renderOptions = {}) {
  const session = typeof app.persistence?.getActiveSession === "function"
    ? app.persistence.getActiveSession()
    : app.session;
  const character = session?.character ?? app.character;
  return {
    root,
    character,
    session,
    mode: renderOptions.mode ?? app.mode,
  };
}

function resolvePostRenderLifecycle(postRenderLifecycle) {
  if (postRenderLifecycle === undefined) {
    return createCharacterMobilePostRenderLifecycle();
  }
  return requirePostRenderLifecycle(postRenderLifecycle);
}

function requirePostRenderLifecycle(postRenderLifecycle) {
  if (postRenderLifecycle === null || typeof postRenderLifecycle !== "object") {
    throw new Error("Character mobile trait edit requires a post-render lifecycle");
  }
  if (typeof postRenderLifecycle.register !== "function") {
    throw new Error("Character mobile trait edit post-render lifecycle must register enhancers");
  }
  if (typeof postRenderLifecycle.run !== "function") {
    throw new Error("Character mobile trait edit post-render lifecycle must run enhancers");
  }
  return postRenderLifecycle;
}

function exposePostRenderLifecycle(app, postRenderLifecycle) {
  const descriptors = Object.getOwnPropertyDescriptors(app);
  descriptors.postRenderLifecycle = {
    value: postRenderLifecycle,
    enumerable: true,
    configurable: false,
    writable: false,
  };
  return Object.freeze(Object.defineProperties({}, descriptors));
}

function disableObserverConstructorOption(options) {
  return {
    ...options,
    [["Mutation", "Observer"].join("")]: false,
  };
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}
