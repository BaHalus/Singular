import {
  bootstrapCharacterMobileAttackEditApp,
} from "./CharacterMobileAttackEditApp.js";
import {
  createCharacterMobilePostRenderLifecycle,
} from "./CharacterMobilePostRenderLifecycle.js";
import {
  appendInlineEditorToDefinitionListItem,
  appendInlineEditorToDefinitionListItemNode,
  escapeAttribute,
  escapeSelectorValue,
  escapeTextContent as escapeText,
  findDataTarget,
  readDataset,
  readInputValue,
  readNumberInputValue as readNumber,
  renderTextareaText,
  requirePlainObject,
  resolveMobileRoot,
} from "./MobileInlineEditHelpers.js";

export async function bootstrapCharacterMobileEquipmentEditApp(options = {}) {
  requirePlainObject(options, "Character mobile equipment edit bootstrap options");
  const postRenderLifecycle = resolvePostRenderLifecycle(options.postRenderLifecycle);
  const bootstrapOptions = Object.freeze({
    ...disableObserverConstructorOption(options),
    postRenderLifecycle,
  });
  const app = await bootstrapCharacterMobileAttackEditApp(bootstrapOptions);
  const mounted = mountCharacterMobileEquipmentEditApp(
    exposePostRenderLifecycle(app, postRenderLifecycle),
    options,
  );
  const previousDestroy = app.attackEdit?.destroy;

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
    equipmentEdit: Object.freeze({
      destroy() {
        mounted.equipmentEdit.destroy();
        previousDestroy?.();
      },
    }),
  });
}

export function mountCharacterMobileEquipmentEditApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(
    options.document,
    "Character mobile equipment edit bootstrap root was not found",
  );
  const postRenderLifecycle = resolvePostRenderLifecycle(app.postRenderLifecycle);
  const lifecycleApp = exposePostRenderLifecycle(app, postRenderLifecycle);
  const useDomMount = canMountEquipmentControlsWithDom(root, lifecycleApp.character);

  const mountEquipmentEditors = context => {
    injectCurrentEquipmentControls(context.root, {
      character: context.character,
      mode: context.mode,
      modeSync: lifecycleApp.modeSync,
    });
  };
  const unregisterPostRender = postRenderLifecycle.register(mountEquipmentEditors);

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
    : (renderOptions = {}) => renderLegacyEquipmentControls(root, lifecycleApp, renderOptions);

  if (useDomMount) {
    mountEquipmentEditors(readPostRenderContext(root, lifecycleApp));
  } else {
    render();
  }

  const handleClick = event => {
    const target = findDataTarget(event?.target, "action");
    const action = target === null ? null : readDataset(target, "action");
    if (action !== "equipment-update") return null;
    event.preventDefault?.();
    const blockedStatus = shouldBlockMobileEquipmentEdit(lifecycleApp);
    if (blockedStatus !== null) {
      root.setAttribute?.("data-last-command-status", blockedStatus);
      return null;
    }
    const itemId = readDataset(target, "equipmentId");
    const result = applyEquipmentPatch(lifecycleApp, itemId, readEquipmentPatch(root, itemId));
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
    equipmentEdit: Object.freeze({
      destroy() {
        unregisterPostRender();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function shouldBlockMobileEquipmentEdit(app) {
  if (app.mode !== "creation") return "blocked-by-mode";
  if (app.ui.getState().busy) return "busy";
  return null;
}

export function injectMobileEquipmentEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const item of flattenEquipment(character.equipment ?? [])) {
    nextHtml = appendEditor(nextHtml, item);
  }
  return nextHtml;
}

export function buildEquipmentUpdatePayload(current, itemId, patch) {
  const nextPatch = {};
  if (patch.name !== (current.name ?? "")) nextPatch.name = patch.name;
  if (!Object.is(patch.quantity, current.quantity ?? 1)) nextPatch.quantity = patch.quantity;
  if (patch.state !== (current.state ?? "carried")) nextPatch.state = patch.state;
  if (!Object.is(patch.weightKg, current.weightKg ?? 0)) nextPatch.weightKg = patch.weightKg;
  if (!Object.is(patch.cost, current.cost ?? 0)) nextPatch.cost = patch.cost;
  if (patch.notes !== (current.notes ?? "")) nextPatch.notes = patch.notes;
  return Object.freeze({ itemId, patch: nextPatch });
}

export function applyEquipmentPatch(app, itemId, patch) {
  const current = findEquipmentItem(app.character.equipment ?? [], itemId);
  if (current === null) return Object.freeze({ status: "rejected" });
  const payload = buildEquipmentUpdatePayload(current, itemId, patch);
  if (Object.keys(payload.patch).length === 0) return Object.freeze({ status: "no-op" });
  if (typeof app.commands.updateEquipment === "function") {
    return app.commands.updateEquipment(payload);
  }
  return applyLegacyEquipmentPatch(app.commands, payload);
}

function injectCurrentEquipmentControls(root, { character, mode, modeSync }) {
  const mounted = mode === "creation"
    ? flattenEquipment(character.equipment ?? [])
      .map(item => appendEditorNode(root, item))
      .every(Boolean)
    : true;
  modeSync.sync();
  return mounted;
}

function appendEditor(html, item) {
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: item.id,
    markerAttribute: "data-equipment-id",
    editorRole: "equipment-inline-editor",
    renderEditor: () => renderEditor(item),
  });
}

function appendEditorNode(root, item) {
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: item.id,
    markerAttribute: "data-equipment-id",
    editorRole: "equipment-inline-editor",
    renderEditor: () => renderEditor(item),
  });
}

function canMountEquipmentControlsWithDom(root, character) {
  const firstItem = flattenEquipment(character.equipment ?? [])[0] ?? null;
  if (firstItem === null) return true;
  const selectorId = escapeSelectorValue(firstItem.id);
  const item = root.querySelector?.(`[data-equipment-id="${selectorId}"]`) ?? null;
  return item !== null &&
    typeof item.querySelector === "function" &&
    (item.ownerDocument?.createElement ?? root.ownerDocument?.createElement ?? globalThis.document?.createElement) !== undefined;
}

function renderEditor(item) {
  const id = escapeAttribute(item.id);
  const state = item.state ?? "carried";
  return [
    `<div class="singular-mobile-sheet__equipment-inline-editor" data-role="equipment-inline-editor" data-equipment-id="${id}">`,
    `<label>Nome <input type="text" data-role="equipment-edit-name-${id}" value="${escapeAttribute(item.name ?? "")}" autocomplete="off"></label>`,
    `<label>Qtd <input type="number" min="0" step="1" data-role="equipment-edit-quantity-${id}" value="${escapeAttribute(item.quantity ?? 1)}"></label>`,
    `<label>Peso kg <input type="number" min="0" step="0.001" data-role="equipment-edit-weight-${id}" value="${escapeAttribute(item.weightKg ?? 0)}"></label>`,
    `<label>Custo <input type="number" min="0" step="0.01" data-role="equipment-edit-cost-${id}" value="${escapeAttribute(item.cost ?? 0)}"></label>`,
    `<label>Estado <select data-role="equipment-edit-state-${id}">${stateOptions(state)}</select></label>`,
    `<label>Notas <textarea data-role="equipment-edit-notes-${id}" autocomplete="off">${renderTextareaText(item.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="equipment-update" data-equipment-id="${id}">Salvar equipamento</button>`,
    "</div>",
  ].join("");
}

function stateOptions(active) {
  return [["equipped", "Equipado"], ["carried", "Carregado"], ["stored", "Guardado"], ["dropped", "Largado"], ["ignored", "Ignorado"]]
    .map(([value, label]) => `<option value="${value}"${value === active ? " selected" : ""}>${escapeText(label)}</option>`)
    .join("");
}

function readEquipmentPatch(root, itemId) {
  const suffix = escapeSelectorValue(itemId);
  return {
    name: readInputValue(root, `[data-role="equipment-edit-name-${suffix}"]`),
    quantity: readNumber(root, `[data-role="equipment-edit-quantity-${suffix}"]`, 1),
    weightKg: readNumber(root, `[data-role="equipment-edit-weight-${suffix}"]`, 0),
    cost: readNumber(root, `[data-role="equipment-edit-cost-${suffix}"]`, 0),
    state: readInputValue(root, `[data-role="equipment-edit-state-${suffix}"]`) || "carried",
    notes: readInputValue(root, `[data-role="equipment-edit-notes-${suffix}"]`),
  };
}

function applyLegacyEquipmentPatch(commands, payload) {
  const unsupportedKeys = Object.keys(payload.patch).filter(key => !["name", "quantity", "state"].includes(key));
  if (unsupportedKeys.length > 0) return Object.freeze({ status: "unsupported", unsupportedKeys });

  const results = [];
  if (hasOwn(payload.patch, "name")) {
    if (typeof commands.renameEquipment !== "function") return Object.freeze({ status: "unsupported" });
    results.push(commands.renameEquipment({ itemId: payload.itemId, name: payload.patch.name }));
  }
  if (hasOwn(payload.patch, "quantity")) {
    if (typeof commands.setEquipmentQuantity !== "function") return Object.freeze({ status: "unsupported" });
    results.push(commands.setEquipmentQuantity({ itemId: payload.itemId, quantity: payload.patch.quantity }));
  }
  if (hasOwn(payload.patch, "state")) {
    if (typeof commands.setEquipmentState !== "function") return Object.freeze({ status: "unsupported" });
    results.push(commands.setEquipmentState({ itemId: payload.itemId, state: payload.patch.state }));
  }
  const failed = results.find(result => !["applied", "no-op"].includes(result.status));
  return failed ?? Object.freeze({ status: results.some(result => result.status === "applied") ? "applied" : "no-op" });
}

function flattenEquipment(items, output = []) {
  for (const item of items) {
    output.push(item);
    flattenEquipment(item.children ?? [], output);
  }
  return output;
}

function findEquipmentItem(items, itemId) {
  for (const item of items) {
    if (item.id === itemId) return item;
    const child = findEquipmentItem(item.children ?? [], itemId);
    if (child !== null) return child;
  }
  return null;
}

function renderLegacyEquipmentControls(root, app, renderOptions = {}) {
  const mode = renderOptions.mode ?? app.mode;
  const session = typeof app.persistence?.getActiveSession === "function"
    ? app.persistence.getActiveSession()
    : app.session;
  root.innerHTML = injectMobileEquipmentEditControls(
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
    throw new Error("Character mobile equipment edit requires a post-render lifecycle");
  }
  if (typeof postRenderLifecycle.register !== "function") {
    throw new Error("Character mobile equipment edit post-render lifecycle must register enhancers");
  }
  if (typeof postRenderLifecycle.run !== "function") {
    throw new Error("Character mobile equipment edit post-render lifecycle must run enhancers");
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

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
