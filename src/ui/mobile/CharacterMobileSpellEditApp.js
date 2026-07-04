import {
  bootstrapCharacterMobileEquipmentEditApp,
} from "./CharacterMobileEquipmentEditApp.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "./CharacterMobilePostRenderLifecycle.js";
import {
  appendInlineEditorToDefinitionListItem,
  appendInlineEditorToDefinitionListItemNode,
  escapeAttribute,
  escapeSelectorValue,
  escapeTextContent,
  findDataTarget,
  normalizeOptionalText,
  readDataset,
  readInputValue,
  readNumberInputValue,
  resolveMobileRoot,
} from "./MobileInlineEditHelpers.js";

export async function bootstrapCharacterMobileSpellEditApp(options = {}) {
  const postRenderLifecycle = resolvePostRenderLifecycle(options.postRenderLifecycle);
  const app = await bootstrapCharacterMobileEquipmentEditApp(Object.freeze({
    ...options,
    postRenderLifecycle,
  }));
  const mounted = mountCharacterMobileSpellEditApp(
    exposePostRenderLifecycle(app, postRenderLifecycle),
    options,
  );
  const previousDestroy = app.equipmentEdit?.destroy;

  return Object.freeze({
    get character() { return mounted.character; },
    get session() { return mounted.session; },
    get html() { return mounted.html; },
    get mode() { return mounted.mode; },
    interactions: mounted.interactions,
    modeSync: mounted.modeSync,
    ui: mounted.ui,
    persistence: mounted.persistence,
    commands: mounted.commands,
    repositories: mounted.repositories,
    runtime: mounted.runtime,
    postRenderLifecycle,
    render: mounted.render,
    spellEdit: Object.freeze({
      destroy() {
        mounted.spellEdit.destroy();
        previousDestroy?.();
      },
    }),
  });
}

export function mountCharacterMobileSpellEditApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(
    options.document,
    "Character mobile spell edit bootstrap root was not found",
  );
  const postRenderLifecycle = resolvePostRenderLifecycle(app.postRenderLifecycle);
  const lifecycleApp = exposePostRenderLifecycle(app, postRenderLifecycle);
  const useDomMount = canMountSpellControlsWithDom(root, lifecycleApp.character);

  const mountSpellEditors = context => {
    injectCurrentSpellControls(context.root, {
      character: context.character,
      mode: context.mode,
      modeSync: lifecycleApp.modeSync,
    });
  };
  const unregisterPostRender = postRenderLifecycle.register(mountSpellEditors);

  const render = useDomMount
    ? (renderOptions = {}) => {
      const result = lifecycleApp.render({
        ...renderOptions,
        skipPostRenderLifecycle: true,
      });
      if (!renderOptions.skipPostRenderLifecycle) {
        runPostRenderLifecycle(postRenderLifecycle, root, lifecycleApp, renderOptions);
      }
      return result;
    }
    : (renderOptions = {}) => renderLegacySpellControls(root, lifecycleApp, renderOptions);

  if (useDomMount) {
    mountSpellEditors(readPostRenderContext(root, lifecycleApp));
  } else {
    render();
  }

  const handleClick = event => {
    const target = findDataTarget(event?.target, "action");
    const action = target === null ? null : readDataset(target, "action");
    if (action !== "spell-update") return null;
    event.preventDefault?.();
    if (lifecycleApp.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (lifecycleApp.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const spellId = readDataset(target, "spellId");
    const result = lifecycleApp.commands.updateSpell({
      spellId,
      patch: readSpellPatch(root, spellId),
    });
    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    get character() { return lifecycleApp.character; },
    get session() { return lifecycleApp.session; },
    get html() { return root.innerHTML; },
    get mode() { return lifecycleApp.mode; },
    interactions: lifecycleApp.interactions,
    modeSync: lifecycleApp.modeSync,
    ui: lifecycleApp.ui,
    persistence: lifecycleApp.persistence,
    commands: lifecycleApp.commands,
    repositories: lifecycleApp.repositories,
    runtime: lifecycleApp.runtime,
    postRenderLifecycle,
    render,
    spellEdit: Object.freeze({
      destroy() {
        unregisterPostRender();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectMobileSpellEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const spell of character.spells ?? []) {
    nextHtml = appendSpellInlineEditor(nextHtml, spell);
  }
  return nextHtml;
}

function injectCurrentSpellControls(root, { character, mode, modeSync }) {
  const mounted = mode === "creation"
    ? (character.spells ?? [])
      .map(spell => appendSpellInlineEditorNode(root, spell))
      .every(Boolean)
    : true;
  modeSync.sync();
  return mounted;
}

function appendSpellInlineEditorNode(root, spell) {
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: spell.id,
    markerAttribute: "data-spell-id",
    editorRole: "spell-inline-editor",
    renderEditor: () => renderEditor(spell),
  });
}

function appendSpellInlineEditor(html, spell) {
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: spell.id,
    markerAttribute: "data-spell-id",
    editorRole: "spell-inline-editor",
    renderEditor: () => renderEditor(spell),
  });
}

function renderEditor(spell) {
  const id = escapeAttribute(spell.id);
  return [
    `<div class="singular-mobile-sheet__spell-inline-editor" data-role="spell-inline-editor" data-spell-id="${id}">`,
    `<label>Nome <input type="text" data-role="spell-edit-name-${id}" value="${escapeAttribute(spell.name ?? "")}" autocomplete="off"></label>`,
    `<label>Tipo <select data-role="spell-edit-type-${id}">${spellTypeOptions(spell.spellType)}</select></label>`,
    `<label>Atributo <input type="text" data-role="spell-edit-attribute-${id}" value="${escapeAttribute(spell.attribute ?? "")}" autocomplete="off"></label>`,
    `<label>Dif <input type="text" data-role="spell-edit-difficulty-${id}" value="${escapeAttribute(spell.difficulty ?? "")}" autocomplete="off"></label>`,
    `<label>Pontos <input type="number" min="0" step="1" data-role="spell-edit-points-${id}" value="${escapeAttribute(spell.points ?? 0)}"></label>`,
    `<label>Classe <input type="text" data-role="spell-edit-class-${id}" value="${escapeAttribute(spell.spellClass ?? "")}" autocomplete="off"></label>`,
    `<label>Resistência <input type="text" data-role="spell-edit-resistance-${id}" value="${escapeAttribute(spell.resistance ?? "")}" autocomplete="off"></label>`,
    `<label>PF <input type="text" data-role="spell-edit-casting-cost-${id}" value="${escapeAttribute(spell.castingCost ?? "")}" autocomplete="off"></label>`,
    `<label>Manut <input type="text" data-role="spell-edit-maintenance-cost-${id}" value="${escapeAttribute(spell.maintenanceCost ?? "")}" autocomplete="off"></label>`,
    `<label>TO <input type="text" data-role="spell-edit-casting-time-${id}" value="${escapeAttribute(spell.castingTime ?? "")}" autocomplete="off"></label>`,
    `<label>Duração <input type="text" data-role="spell-edit-duration-${id}" value="${escapeAttribute(spell.duration ?? "")}" autocomplete="off"></label>`,
    `<label class="singular-mobile-sheet__spell-inline-editor-notes">Notas <textarea data-role="spell-edit-notes-${id}" autocomplete="off">
${escapeTextContent(spell.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="spell-update" data-spell-id="${id}">Salvar magia</button>`,
    "</div>",
  ].join("");
}

function spellTypeOptions(active) {
  return [["standard", "Padrão"], ["ritualMagic", "Ritualística"]]
    .map(([value, label]) => `<option value="${value}"${value === active ? " selected" : ""}>${escapeTextContent(label)}</option>`)
    .join("");
}

function readSpellPatch(root, spellId) {
  const suffix = escapeSelectorValue(spellId);
  return {
    name: readInputValue(root, `[data-role="spell-edit-name-${suffix}"]`),
    spellType: readInputValue(root, `[data-role="spell-edit-type-${suffix}"]`) || "standard",
    attribute: normalizeOptionalText(readInputValue(root, `[data-role="spell-edit-attribute-${suffix}"]`)),
    difficulty: normalizeOptionalText(readInputValue(root, `[data-role="spell-edit-difficulty-${suffix}"]`)),
    points: readNumberInputValue(root, `[data-role="spell-edit-points-${suffix}"]`, 0),
    spellClass: readInputValue(root, `[data-role="spell-edit-class-${suffix}"]`),
    resistance: readInputValue(root, `[data-role="spell-edit-resistance-${suffix}"]`),
    castingCost: readInputValue(root, `[data-role="spell-edit-casting-cost-${suffix}"]`),
    maintenanceCost: readInputValue(root, `[data-role="spell-edit-maintenance-cost-${suffix}"]`),
    castingTime: readInputValue(root, `[data-role="spell-edit-casting-time-${suffix}"]`),
    duration: readInputValue(root, `[data-role="spell-edit-duration-${suffix}"]`),
    notes: readInputValue(root, `[data-role="spell-edit-notes-${suffix}"]`),
  };
}

function canMountSpellControlsWithDom(root, character) {
  const firstSpell = (character.spells ?? [])[0] ?? null;
  if (firstSpell === null) return true;
  const selectorId = escapeSelectorValue(firstSpell.id);
  const item = root.querySelector?.(`[data-spell-id="${selectorId}"]`) ?? null;
  return item !== null &&
    typeof item.querySelector === "function" &&
    (item.ownerDocument?.createElement ?? root.ownerDocument?.createElement ?? globalThis.document?.createElement) !== undefined;
}

function renderLegacySpellControls(root, app, renderOptions = {}) {
  const mode = renderOptions.mode ?? app.mode;
  const session = typeof app.persistence?.getActiveSession === "function"
    ? app.persistence.getActiveSession()
    : app.session;
  root.innerHTML = injectMobileSpellEditControls(
    app.ui.render({ mode }),
    session.character,
    mode,
  );
  root.setAttribute?.("data-session-id", session.id);
  root.setAttribute?.("data-character-id", session.character.identity.id);
  root.setAttribute?.("data-mode", mode);
  app.modeSync.sync();
  return root.innerHTML;
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
    throw new Error("Character mobile spell edit requires a post-render lifecycle");
  }
  if (typeof postRenderLifecycle.register !== "function") {
    throw new Error("Character mobile spell edit post-render lifecycle must register enhancers");
  }
  if (typeof postRenderLifecycle.run !== "function") {
    throw new Error("Character mobile spell edit post-render lifecycle must run enhancers");
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
