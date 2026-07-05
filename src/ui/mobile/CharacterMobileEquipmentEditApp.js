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
    if (!["equipment-update", "equipment-state-update", "equipment-uses-update"].includes(action)) return null;
    event.preventDefault?.();

    const itemId = readDataset(target, "equipmentId");
    const result = action === "equipment-state-update"
      ? handleEquipmentStateUpdate(lifecycleApp, target, itemId)
      : action === "equipment-uses-update"
        ? handleEquipmentUsesUpdate(lifecycleApp, target, itemId)
        : handleEquipmentStructuralUpdate(lifecycleApp, root, itemId);
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

export function shouldBlockMobileEquipmentTransientEdit(app) {
  if (app.ui.getState().busy) return "busy";
  return null;
}

export function injectMobileEquipmentEditControls(html, character, mode) {
  let nextHtml = html;
  if (mode === "creation") {
    for (const item of flattenEquipment(character.equipment ?? [])) {
      nextHtml = appendEditor(nextHtml, item);
    }
    return nextHtml;
  }
  if (mode === "table") {
    for (const item of flattenEquipment(character.equipment ?? [])) {
      nextHtml = appendStateControls(nextHtml, item);
      nextHtml = appendUsesControls(nextHtml, item);
    }
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

export function buildEquipmentStateUpdatePayload(current, itemId, state) {
  const patch = state === (current.state ?? "carried") ? {} : { state };
  return Object.freeze({ itemId, patch });
}

export function buildEquipmentUsesUpdatePayload(current, itemId, uses) {
  const normalizedUses = normalizeUses(uses, "Equipment uses transient");
  const patch = Object.is(normalizedUses, current.uses ?? null)
    ? {}
    : { uses: normalizedUses };
  return Object.freeze({ itemId, patch });
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

export function applyEquipmentStatePatch(app, itemId, state) {
  const current = findEquipmentItem(app.character.equipment ?? [], itemId);
  if (current === null) return Object.freeze({ status: "rejected" });
  const payload = buildEquipmentStateUpdatePayload(current, itemId, state);
  if (Object.keys(payload.patch).length === 0) return Object.freeze({ status: "no-op" });
  if (typeof app.commands.updateEquipment === "function") {
    return app.commands.updateEquipment(payload);
  }
  return applyLegacyEquipmentPatch(app.commands, payload);
}

export function applyEquipmentUsesPatch(app, itemId, uses) {
  const current = findEquipmentItem(app.character.equipment ?? [], itemId);
  if (current === null) return Object.freeze({ status: "rejected" });
  const payload = buildEquipmentUsesUpdatePayload(current, itemId, uses);
  if (Object.keys(payload.patch).length === 0) return Object.freeze({ status: "no-op" });
  if (typeof app.commands.updateEquipment === "function") {
    return app.commands.updateEquipment(payload);
  }
  return applyLegacyEquipmentPatch(app.commands, payload);
}

function handleEquipmentStructuralUpdate(app, root, itemId) {
  const blockedStatus = shouldBlockMobileEquipmentEdit(app);
  if (blockedStatus !== null) return Object.freeze({ status: blockedStatus });
  return applyEquipmentPatch(app, itemId, readEquipmentPatch(root, itemId));
}

function handleEquipmentStateUpdate(app, target, itemId) {
  const blockedStatus = shouldBlockMobileEquipmentTransientEdit(app);
  if (blockedStatus !== null) return Object.freeze({ status: blockedStatus });
  return applyEquipmentStatePatch(app, itemId, readDataset(target, "equipmentState") || "carried");
}

function handleEquipmentUsesUpdate(app, target, itemId) {
  const blockedStatus = shouldBlockMobileEquipmentTransientEdit(app);
  if (blockedStatus !== null) return Object.freeze({ status: blockedStatus });
  const current = findEquipmentItem(app.character.equipment ?? [], itemId);
  if (current === null) return Object.freeze({ status: "rejected" });
  const delta = readNumberDataset(target, "equipmentUsesDelta", 0);
  const uses = normalizeUses((current.uses ?? 0) + delta, "Equipment uses transient");
  const boundedUses = Number.isFinite(current.maxUses) ? Math.min(uses, current.maxUses) : uses;
  return applyEquipmentUsesPatch(app, itemId, boundedUses);
}

function injectCurrentEquipmentControls(root, { character, mode, modeSync }) {
  const items = flattenEquipment(character.equipment ?? []);
  const mounted = mode === "creation"
    ? items.map(item => appendEditorNode(root, item)).every(Boolean)
    : mode === "table"
      ? items.map(item => appendTableTransientControlsNode(root, item)).every(Boolean)
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

function appendStateControls(html, item) {
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: item.id,
    markerAttribute: "data-equipment-id",
    editorRole: "equipment-state-controls",
    renderEditor: () => renderStateControls(item),
  });
}

function appendUsesControls(html, item) {
  if (!hasEquipmentUsesCounter(item)) return html;
  return appendInlineEditorToDefinitionListItem(html, {
    entityId: item.id,
    markerAttribute: "data-equipment-id",
    editorRole: "equipment-uses-controls",
    renderEditor: () => renderUsesControls(item),
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

function appendStateControlsNode(root, item) {
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: item.id,
    markerAttribute: "data-equipment-id",
    editorRole: "equipment-state-controls",
    renderEditor: () => renderStateControls(item),
  });
}

function appendUsesControlsNode(root, item) {
  if (!hasEquipmentUsesCounter(item)) return true;
  return appendInlineEditorToDefinitionListItemNode(root, {
    entityId: item.id,
    markerAttribute: "data-equipment-id",
    editorRole: "equipment-uses-controls",
    renderEditor: () => renderUsesControls(item),
  });
}

function appendTableTransientControlsNode(root, item) {
  return appendStateControlsNode(root, item) && appendUsesControlsNode(root, item);
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

function renderStateControls(item) {
  const id = escapeAttribute(item.id);
  const active = item.state ?? "carried";
  const buttons = equipmentStates().map(([state, label]) => {
    const pressed = state === active ? "true" : "false";
    return `<button type="button" data-action="equipment-state-update" data-equipment-id="${id}" data-equipment-state="${escapeAttribute(state)}" aria-pressed="${pressed}">${escapeText(label)}</button>`;
  }).join("");
  return `<div class="singular-mobile-sheet__equipment-state-controls" data-role="equipment-state-controls" data-equipment-id="${id}">${buttons}</div>`;
}

function renderUsesControls(item) {
  const id = escapeAttribute(item.id);
  const uses = normalizeUses(item.uses ?? 0, "Equipment uses transient");
  const maxUses = item.maxUses === null ? null : normalizeUses(item.maxUses, "Equipment maxUses");
  const maximum = maxUses === null ? "—" : String(maxUses);
  const decreaseDisabled = uses > 0 ? "false" : "true";
  const increaseDisabled = maxUses === null || uses < maxUses ? "false" : "true";
  return [
    `<div class="singular-mobile-sheet__equipment-uses-controls" data-role="equipment-uses-controls" data-equipment-id="${id}">`,
    `<span data-role="equipment-uses-current-${id}">Usos ${escapeText(String(uses))} / ${escapeText(maximum)}</span>`,
    `<button type="button" data-action="equipment-uses-update" data-equipment-id="${id}" data-equipment-uses-delta="-1" aria-disabled="${decreaseDisabled}">−</button>`,
    `<button type="button" data-action="equipment-uses-update" data-equipment-id="${id}" data-equipment-uses-delta="1" aria-disabled="${increaseDisabled}">+</button>`,
    "</div>",
  ].join("");
}

function stateOptions(active) {
  return equipmentStates()
    .map(([value, label]) => `<option value="${value}"${value === active ? " selected" : ""}>${escapeText(label)}</option>`)
    .join("");
}

function equipmentStates() {
  return [["equipped", "Equipado"], ["carried", "Carregado"], ["stored", "Guardado"], ["dropped", "Largado"], ["ignored", "Ignorado"]];
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

function hasEquipmentUsesCounter(item) {
  return item.uses !== null || item.maxUses !== null;
}

function readNumberDataset(target, key, fallback) {
  const value = readDataset(target, key);
  if (value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeUses(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be non-negative finite number`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}
