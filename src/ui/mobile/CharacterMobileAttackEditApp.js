import {
  bootstrapCharacterMobileLanguageCultureEditApp,
} from "./CharacterMobileLanguageCultureEditApp.js";
import {
  appendInlineEditorToDefinitionListItem,
  appendInlineEditorToDefinitionListItemNode,
  escapeAttribute,
  escapeSelectorValue,
  findDataTarget,
  normalizeOptionalText,
  readDataset,
  readInputValue,
  renderTextareaText,
  requirePlainObject,
  resolveMobileRoot,
} from "./MobileInlineEditHelpers.js";

const ATTACK_CORE_RERENDER_ACTIONS = Object.freeze([
  "attack-add",
  "attack-remove",
  "attack-reorder",
  "mode-creation",
  "mode-table",
]);

export async function bootstrapCharacterMobileAttackEditApp(options = {}) {
  requirePlainObject(options, "Character mobile attack edit bootstrap options");
  const app = await bootstrapCharacterMobileLanguageCultureEditApp(options);
  const mounted = mountCharacterMobileAttackEditApp(app, options);
  const previousDestroy = app.languageCultureEdit?.destroy;

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
    render: mounted.render,
    attackEdit: Object.freeze({
      destroy() {
        mounted.attackEdit.destroy();
        previousDestroy?.();
      },
    }),
  });
}

export function mountCharacterMobileAttackEditApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(
    options.document,
    "Character mobile attack edit bootstrap root was not found",
  );
  const pendingInjectionCancels = new Set();

  const render = () => {
    app.render();
    injectCurrentAttackControls(root, app);
  };

  injectCurrentAttackControls(root, app);

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");

    if (ATTACK_CORE_RERENDER_ACTIONS.includes(action)) {
      requestAttackControlInjection(root, app, pendingInjectionCancels, options);
      return null;
    }

    if (action !== "attack-update") return null;
    event.preventDefault?.();

    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const attackId = readDataset(actionTarget, "attackId");
    const result = app.commands.updateAttack({
      attackId,
      patch: readAttackPatch(root, attackId),
    });
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
    render,
    attackEdit: Object.freeze({
      destroy() {
        root.removeEventListener?.("click", handleClick);
        clearPendingAttackControlInjections(pendingInjectionCancels);
      },
    }),
  });
}

export function injectMobileAttackEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const attack of character.attacks ?? []) {
    nextHtml = appendInlineEditorToAttack(nextHtml, attack);
  }
  return nextHtml;
}

function injectCurrentAttackControls(root, app) {
  if (app.mode !== "creation") {
    app.modeSync.sync();
    return;
  }

  for (const attack of app.persistence.getActiveSession().character.attacks ?? []) {
    appendAttackInlineEditorNode(root, attack);
  }
  app.modeSync.sync();
}

function requestAttackControlInjection(root, app, pendingInjectionCancels, options) {
  let cancel = null;
  const run = () => {
    if (cancel !== null) pendingInjectionCancels.delete(cancel);
    injectCurrentAttackControls(root, app);
  };

  cancel = scheduleAttackControlInjection(run, options);
  if (typeof cancel === "function") pendingInjectionCancels.add(cancel);
}

function scheduleAttackControlInjection(callback, options) {
  if (typeof options.deferAttackControlInjection === "function") {
    return options.deferAttackControlInjection(callback);
  }

  const setTimeoutRef = options.setTimeout ?? globalThis.setTimeout;
  const clearTimeoutRef = options.clearTimeout ?? globalThis.clearTimeout;
  if (typeof setTimeoutRef === "function") {
    const timeoutId = setTimeoutRef(callback, 0);
    return () => clearTimeoutRef?.(timeoutId);
  }

  callback();
  return null;
}

function clearPendingAttackControlInjections(pendingInjectionCancels) {
  for (const cancel of pendingInjectionCancels) {
    cancel();
  }
  pendingInjectionCancels.clear();
}

function appendAttackInlineEditorNode(root, attack) {
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: attack.id,
    markerAttribute: "data-attack-id",
    editorRole: "attack-inline-editor",
    renderEditor: () => renderAttackInlineEditor(attack),
  });
}

function appendInlineEditorToAttack(html, attack) {
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: attack.id,
    markerAttribute: "data-attack-id",
    editorRole: "attack-inline-editor",
    renderEditor: () => renderAttackInlineEditor(attack),
  });
}

function renderAttackInlineEditor(attack) {
  const id = escapeAttribute(attack.id);
  return [
    `<div class="singular-mobile-sheet__attack-inline-editor" data-role="attack-inline-editor" data-attack-id="${id}">`,
    `<label>Nome <input type="text" data-role="attack-edit-name-${id}" value="${escapeAttribute(attack.name ?? "")}" autocomplete="off"></label>`,
    `<label>Categoria <select data-role="attack-edit-category-${id}"><option value="melee"${attack.category === "melee" ? " selected" : ""}>Corpo a corpo</option><option value="ranged"${attack.category === "ranged" ? " selected" : ""}>À distância</option></select></label>`,
    `<label>Perícia (ID) <input type="text" data-role="attack-edit-skill-id-${id}" value="${escapeAttribute(attack.skillId ?? "")}" autocomplete="off"></label>`,
    `<label>Dano declarado <input type="text" data-role="attack-edit-damage-value-${id}" value="${escapeAttribute(attack.damage?.value ?? "")}" autocomplete="off"></label>`,
    `<label>Tipo de dano <input type="text" data-role="attack-edit-damage-type-${id}" value="${escapeAttribute(attack.damage?.type ?? "")}" autocomplete="off"></label>`,
    `<label>Reach <input type="text" data-role="attack-edit-reach-${id}" value="${escapeAttribute(attack.reach ?? "")}" autocomplete="off"></label>`,
    `<label>Alcance <input type="text" data-role="attack-edit-range-${id}" value="${escapeAttribute(attack.range ?? "")}" autocomplete="off"></label>`,
    `<label>Notas <textarea data-role="attack-edit-notes-${id}" autocomplete="off">${renderTextareaText(attack.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="attack-update" data-attack-id="${id}">Salvar ataque</button>`,
    "</div>",
  ].join("");
}

function readAttackPatch(root, attackId) {
  const suffix = escapeSelectorValue(attackId);
  return {
    name: readInputValue(root, `[data-role="attack-edit-name-${suffix}"]`),
    category: readInputValue(root, `[data-role="attack-edit-category-${suffix}"]`) || "melee",
    skillId: normalizeOptionalText(readInputValue(root, `[data-role="attack-edit-skill-id-${suffix}"]`)),
    damage: {
      value: readInputValue(root, `[data-role="attack-edit-damage-value-${suffix}"]`),
      type: readInputValue(root, `[data-role="attack-edit-damage-type-${suffix}"]`),
    },
    reach: normalizeOptionalText(readInputValue(root, `[data-role="attack-edit-reach-${suffix}"]`)),
    range: normalizeOptionalText(readInputValue(root, `[data-role="attack-edit-range-${suffix}"]`)),
    notes: readInputValue(root, `[data-role="attack-edit-notes-${suffix}"]`),
  };
}
