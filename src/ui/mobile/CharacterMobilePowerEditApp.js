import {
  bootstrapCharacterMobileSpellEditApp,
} from "./CharacterMobileSpellEditApp.js";
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
  splitTextList,
} from "./MobileInlineEditHelpers.js";

export async function bootstrapCharacterMobilePowerEditApp(options = {}) {
  const postRenderLifecycle = resolvePostRenderLifecycle(options.postRenderLifecycle);
  const app = await bootstrapCharacterMobileSpellEditApp(Object.freeze({
    ...options,
    postRenderLifecycle,
  }));
  const mounted = mountCharacterMobilePowerEditApp(
    exposePostRenderLifecycle(app, postRenderLifecycle),
    options,
  );
  const previousDestroy = app.spellEdit?.destroy;

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
    powerEdit: Object.freeze({
      destroy() {
        mounted.powerEdit.destroy();
        previousDestroy?.();
      },
    }),
  });
}

export function mountCharacterMobilePowerEditApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(
    options.document,
    "Character mobile power edit bootstrap root was not found",
  );
  const postRenderLifecycle = resolvePostRenderLifecycle(app.postRenderLifecycle);
  const lifecycleApp = exposePostRenderLifecycle(app, postRenderLifecycle);
  const useDomMount = canMountPowerControlsWithDom(root, lifecycleApp.character);

  const mountPowerEditors = context => {
    injectCurrentPowerControls(context.root, {
      character: context.character,
      mode: context.mode,
      modeSync: lifecycleApp.modeSync,
    });
  };
  const unregisterPostRender = postRenderLifecycle.register(mountPowerEditors);

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
    : (renderOptions = {}) => renderLegacyPowerControls(root, lifecycleApp, renderOptions);

  if (useDomMount) {
    mountPowerEditors(readPostRenderContext(root, lifecycleApp));
  } else {
    render();
  }

  const handleClick = event => {
    const target = findDataTarget(event?.target, "action");
    const action = target === null ? null : readDataset(target, "action");
    if (!["power-update", "power-move"].includes(action)) return null;
    event.preventDefault?.();
    if (lifecycleApp.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (lifecycleApp.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const powerId = readDataset(target, "powerId");
    const powers = lifecycleApp.character.powers ?? [];
    const currentIndex = powers.findIndex(power => power.id === powerId);
    if (currentIndex === -1) {
      root.setAttribute?.("data-last-command-status", "rejected");
      return Object.freeze({ status: "rejected" });
    }

    let result;
    if (action === "power-move") {
      const delta = Number(readDataset(target, "moveDelta"));
      const targetIndex = Math.max(0, Math.min(powers.length - 1, currentIndex + delta));
      result = lifecycleApp.commands.reorderPower({ powerId, targetIndex });
    } else {
      const patch = readPowerPatch(root, powerId);
      result = lifecycleApp.commands.updatePower({
        powerId,
        patch: toPowerCommandPatch(patch),
      });
    }

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
    powerEdit: Object.freeze({
      destroy() {
        unregisterPostRender();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectMobilePowerEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const power of character.powers ?? []) {
    nextHtml = appendPowerInlineEditor(nextHtml, power);
  }
  return nextHtml;
}

export function readPowerPatchFromValues(values = {}) {
  return Object.freeze({
    name: values.name ?? "",
    source: values.source ?? "",
    powerModifierName: values.powerModifierName ?? "",
    powerModifierValuePercent: values.powerModifierValuePercent ?? null,
    powerModifierNotes: values.powerModifierNotes ?? "",
    talentTraitId: normalizeOptionalText(values.talentTraitId),
    memberTraitIds: splitTextList(values.memberTraitIds),
    tags: splitTextList(values.tags),
    notes: values.notes ?? "",
  });
}

function injectCurrentPowerControls(root, { character, mode, modeSync }) {
  const mounted = mode === "creation"
    ? (character.powers ?? [])
      .map(power => appendPowerInlineEditorNode(root, power))
      .every(Boolean)
    : true;
  modeSync.sync();
  return mounted;
}

function appendPowerInlineEditorNode(root, power) {
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: power.id,
    markerAttribute: "data-power-id",
    editorRole: "power-inline-editor",
    renderEditor: () => renderEditor(power),
  });
}

function appendPowerInlineEditor(html, power) {
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: power.id,
    markerAttribute: "data-power-id",
    editorRole: "power-inline-editor",
    renderEditor: () => renderEditor(power),
  });
}

function renderEditor(power) {
  const id = escapeAttribute(power.id);
  return [
    `<div class="singular-mobile-sheet__power-inline-editor" data-role="power-inline-editor" data-power-id="${id}">`,
    `<label>Nome <input type="text" data-role="power-edit-name-${id}" value="${escapeAttribute(power.name ?? "")}" autocomplete="off"></label>`,
    `<label>Fonte <input type="text" data-role="power-edit-source-${id}" value="${escapeAttribute(power.source ?? "")}" autocomplete="off"></label>`,
    `<label>Modificador <input type="text" data-role="power-edit-modifier-name-${id}" value="${escapeAttribute(power.powerModifier?.name ?? "")}" autocomplete="off"></label>`,
    `<label>% Mod. <input type="number" step="1" data-role="power-edit-modifier-value-${id}" value="${escapeAttribute(power.powerModifier?.valuePercent ?? "")}"></label>`,
    `<label>Notas mod. <input type="text" data-role="power-edit-modifier-notes-${id}" value="${escapeAttribute(power.powerModifier?.notes ?? "")}" autocomplete="off"></label>`,
    `<label>Talento <input type="text" data-role="power-edit-talent-${id}" value="${escapeAttribute(power.talentTraitId ?? "")}" autocomplete="off"></label>`,
    `<label>Membros <input type="text" data-role="power-edit-members-${id}" value="${escapeAttribute((power.memberTraitIds ?? []).join(", "))}" autocomplete="off"></label>`,
    `<label>Tags <input type="text" data-role="power-edit-tags-${id}" value="${escapeAttribute((power.tags ?? []).join(", "))}" autocomplete="off"></label>`,
    `<label class="singular-mobile-sheet__power-inline-editor-notes">Notas <textarea data-role="power-edit-notes-${id}" autocomplete="off">${escapeTextContent(power.notes ?? "")}</textarea></label>`,
    `<div class="singular-mobile-sheet__power-inline-editor-actions">`,
    `<button type="button" data-action="power-move" data-move-delta="-1" data-power-id="${id}" aria-label="Mover poder acima">↑</button>`,
    `<button type="button" data-action="power-move" data-move-delta="1" data-power-id="${id}" aria-label="Mover poder abaixo">↓</button>`,
    `<button type="button" data-action="power-update" data-power-id="${id}">Salvar poder</button>`,
    `</div>`,
    "</div>",
  ].join("");
}

function readPowerPatch(root, powerId) {
  const suffix = escapeSelectorValue(powerId);
  return readPowerPatchFromValues({
    name: readInputValue(root, `[data-role="power-edit-name-${suffix}"]`),
    source: readInputValue(root, `[data-role="power-edit-source-${suffix}"]`),
    powerModifierName: readInputValue(root, `[data-role="power-edit-modifier-name-${suffix}"]`),
    powerModifierValuePercent: readNumberInputValue(root, `[data-role="power-edit-modifier-value-${suffix}"]`, null),
    powerModifierNotes: readInputValue(root, `[data-role="power-edit-modifier-notes-${suffix}"]`),
    talentTraitId: readInputValue(root, `[data-role="power-edit-talent-${suffix}"]`),
    memberTraitIds: readInputValue(root, `[data-role="power-edit-members-${suffix}"]`),
    tags: readInputValue(root, `[data-role="power-edit-tags-${suffix}"]`),
    notes: readInputValue(root, `[data-role="power-edit-notes-${suffix}"]`),
  });
}

function toPowerCommandPatch(patch) {
  const modifierIsEmpty = patch.powerModifierName === ""
    && patch.powerModifierValuePercent === null
    && patch.powerModifierNotes === "";
  return {
    name: patch.name,
    source: patch.source,
    powerModifier: modifierIsEmpty ? null : {
      name: patch.powerModifierName,
      valuePercent: patch.powerModifierValuePercent,
      notes: patch.powerModifierNotes,
    },
    talentTraitId: patch.talentTraitId,
    memberTraitIds: patch.memberTraitIds,
    tags: patch.tags,
    notes: patch.notes,
  };
}

function canMountPowerControlsWithDom(root, character) {
  const firstPower = (character.powers ?? [])[0] ?? null;
  if (firstPower === null) return true;
  const selectorId = escapeSelectorValue(firstPower.id);
  const item = root.querySelector?.(`[data-power-id="${selectorId}"]`) ?? null;
  return item !== null &&
    typeof item.querySelector === "function" &&
    (item.ownerDocument?.createElement ?? root.ownerDocument?.createElement ?? globalThis.document?.createElement) !== undefined;
}

function renderLegacyPowerControls(root, app, renderOptions = {}) {
  const mode = renderOptions.mode ?? app.mode;
  const session = typeof app.persistence?.getActiveSession === "function"
    ? app.persistence.getActiveSession()
    : app.session;
  root.innerHTML = injectMobilePowerEditControls(
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
    throw new Error("Character mobile power edit requires a post-render lifecycle");
  }
  if (typeof postRenderLifecycle.register !== "function") {
    throw new Error("Character mobile power edit post-render lifecycle must register enhancers");
  }
  if (typeof postRenderLifecycle.run !== "function") {
    throw new Error("Character mobile power edit post-render lifecycle must run enhancers");
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
