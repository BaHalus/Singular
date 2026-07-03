import {
  bootstrapCharacterMobileSpellEditApp,
} from "./CharacterMobileSpellEditApp.js";
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
  const app = await bootstrapCharacterMobileSpellEditApp(options);
  const mounted = mountCharacterMobilePowerEditApp(app, options);
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
    postRenderLifecycle: mounted.postRenderLifecycle,
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

  const render = (renderOptions = {}) => {
    app.render(renderOptions);
    injectCurrentPowerControls(root, app);
  };

  injectCurrentPowerControls(root, app);

  const handleClick = event => {
    const target = findDataTarget(event?.target, "action");
    const action = target === null ? null : readDataset(target, "action");
    if (action !== "power-update") return null;
    event.preventDefault?.();
    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const powerId = readDataset(target, "powerId");
    const patch = readPowerPatch(root, powerId);
    const current = app.character.powers.find(power => power.id === powerId);
    if (current === undefined) {
      root.setAttribute?.("data-last-command-status", "rejected");
      return Object.freeze({ status: "rejected" });
    }
    if (patch.name === current.name) {
      root.setAttribute?.("data-last-command-status", "no-op");
      return Object.freeze({ status: "no-op" });
    }
    const result = app.commands.renamePower({ powerId, name: patch.name });
    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    get character() { return app.character; },
    get session() { return app.session; },
    get html() { return root.innerHTML; },
    get mode() { return app.mode; },
    interactions: app.interactions,
    modeSync: app.modeSync,
    ui: app.ui,
    persistence: app.persistence,
    commands: app.commands,
    repositories: app.repositories,
    runtime: app.runtime,
    postRenderLifecycle: app.postRenderLifecycle,
    render,
    powerEdit: Object.freeze({
      destroy() {
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

function injectCurrentPowerControls(root, app) {
  if (app.mode !== "creation") {
    app.modeSync.sync();
    return;
  }

  let allEditorsMounted = true;
  for (const power of app.character.powers ?? []) {
    allEditorsMounted = appendPowerInlineEditorNode(root, power) && allEditorsMounted;
  }
  if (!allEditorsMounted) {
    root.innerHTML = injectMobilePowerEditControls(
      root.innerHTML,
      app.character,
      app.mode,
    );
  }
  app.modeSync.sync();
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
    `<label>Fonte <input type="text" data-role="power-edit-source-${id}" value="${escapeAttribute(power.source ?? "")}" autocomplete="off" disabled></label>`,
    `<label>Modificador <input type="text" data-role="power-edit-modifier-name-${id}" value="${escapeAttribute(power.powerModifier?.name ?? "")}" autocomplete="off" disabled></label>`,
    `<label>% Mod. <input type="number" step="1" data-role="power-edit-modifier-value-${id}" value="${escapeAttribute(power.powerModifier?.valuePercent ?? "")}" disabled></label>`,
    `<label>Notas mod. <input type="text" data-role="power-edit-modifier-notes-${id}" value="${escapeAttribute(power.powerModifier?.notes ?? "")}" autocomplete="off" disabled></label>`,
    `<label>Talento <input type="text" data-role="power-edit-talent-${id}" value="${escapeAttribute(power.talentTraitId ?? "")}" autocomplete="off" disabled></label>`,
    `<label>Membros <input type="text" data-role="power-edit-members-${id}" value="${escapeAttribute((power.memberTraitIds ?? []).join(", "))}" autocomplete="off" disabled></label>`,
    `<label>Tags <input type="text" data-role="power-edit-tags-${id}" value="${escapeAttribute((power.tags ?? []).join(", "))}" autocomplete="off" disabled></label>`,
    `<label class="singular-mobile-sheet__power-inline-editor-notes">Notas <textarea data-role="power-edit-notes-${id}" autocomplete="off" disabled>
${escapeTextContent(power.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="power-update" data-power-id="${id}">Salvar poder</button>`,
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
