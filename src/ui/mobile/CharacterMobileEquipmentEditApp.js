import {
  bootstrapCharacterMobileAttackEditApp,
} from "./CharacterMobileAttackEditApp.js";

export async function bootstrapCharacterMobileEquipmentEditApp(options = {}) {
  const app = await bootstrapCharacterMobileAttackEditApp(options);
  const root = options.root ?? options.document?.querySelector?.("[data-singular-mobile-root]") ?? globalThis.document?.querySelector?.("[data-singular-mobile-root]");
  if (!root) throw new Error("Character mobile equipment edit bootstrap root was not found");

  const render = () => {
    app.render();
    injectCurrentEquipmentControls(root, app);
  };

  injectCurrentEquipmentControls(root, app);

  const handleClick = event => {
    const target = findDataTarget(event?.target, "action");
    const action = target?.dataset?.action;
    if (action !== "equipment-update") return null;
    event.preventDefault?.();
    const blockedStatus = shouldBlockMobileEquipmentEdit(app);
    if (blockedStatus !== null) {
      root.setAttribute?.("data-last-command-status", blockedStatus);
      return null;
    }
    const itemId = target.dataset.equipmentId;
    const result = applyEquipmentPatch(app, itemId, readEquipmentPatch(root, itemId));
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
    equipmentEdit: Object.freeze({ destroy() { root.removeEventListener?.("click", handleClick); } }),
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
  if (patch.name !== current.name) nextPatch.name = patch.name;
  if (!Object.is(patch.quantity, current.quantity)) nextPatch.quantity = patch.quantity;
  if (patch.state !== current.state) nextPatch.state = patch.state;
  if (!Object.is(patch.weightKg, current.weightKg)) nextPatch.weightKg = patch.weightKg;
  if (!Object.is(patch.cost, current.cost)) nextPatch.cost = patch.cost;
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

function injectCurrentEquipmentControls(root, app) {
  root.innerHTML = injectMobileEquipmentEditControls(root.innerHTML, app.character, app.mode);
  app.modeSync.sync();
}

function appendEditor(html, item) {
  const id = String(item.id);
  const markerIndex = html.indexOf(`data-equipment-id="${escapeAttribute(id)}"`);
  if (markerIndex < 0) return html;
  const ddEnd = html.indexOf("</dd>", markerIndex);
  if (ddEnd < 0) return html;
  const existing = html.indexOf(`data-role="equipment-inline-editor" data-equipment-id="${escapeAttribute(id)}"`, markerIndex);
  if (existing >= 0 && existing < ddEnd) return html;
  return html.slice(0, ddEnd) + renderEditor(item) + html.slice(ddEnd);
}

function renderEditor(item) {
  const id = escapeAttribute(item.id);
  return [
    `<div class="singular-mobile-sheet__equipment-inline-editor" data-role="equipment-inline-editor" data-equipment-id="${id}">`,
    `<label>Nome <input type="text" data-role="equipment-edit-name-${id}" value="${escapeAttribute(item.name ?? "")}" autocomplete="off"></label>`,
    `<label>Qtd <input type="number" min="0" step="1" data-role="equipment-edit-quantity-${id}" value="${escapeAttribute(item.quantity ?? 1)}"></label>`,
    `<label>Peso kg <input type="number" min="0" step="0.001" data-role="equipment-edit-weight-${id}" value="${escapeAttribute(item.weightKg ?? 0)}"></label>`,
    `<label>Custo <input type="number" min="0" step="0.01" data-role="equipment-edit-cost-${id}" value="${escapeAttribute(item.cost ?? 0)}"></label>`,
    `<label>Estado <select data-role="equipment-edit-state-${id}">${stateOptions(item.state)}</select></label>`,
    `<label>Notas <textarea data-role="equipment-edit-notes-${id}" autocomplete="off">${renderTextareaText(item.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="equipment-update" data-equipment-id="${id}">Salvar equipamento</button>`,
    "</div>",
  ].join("");
}

function stateOptions(active) {
  return [["equipped", "Equipado"], ["carried", "Carregado"], ["stored", "Guardado"], ["dropped", "Largado"], ["ignored", "Ignorado"]]
    .map(([value, label]) => `<option value="${value}"${value === active ? " selected" : ""}>${label}</option>`)
    .join("");
}

function readEquipmentPatch(root, itemId) {
  const suffix = String(itemId).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  return {
    name: readValue(root, `[data-role="equipment-edit-name-${suffix}"]`),
    quantity: readNumber(root, `[data-role="equipment-edit-quantity-${suffix}"]`, 1),
    weightKg: readNumber(root, `[data-role="equipment-edit-weight-${suffix}"]`, 0),
    cost: readNumber(root, `[data-role="equipment-edit-cost-${suffix}"]`, 0),
    state: readValue(root, `[data-role="equipment-edit-state-${suffix}"]`) || "carried",
    notes: readValue(root, `[data-role="equipment-edit-notes-${suffix}"]`),
  };
}

function applyLegacyEquipmentPatch(commands, payload) {
  const unsupportedKeys = Object.keys(payload.patch).filter(key => !["name", "quantity", "state"].includes(key));
  if (unsupportedKeys.length > 0) return Object.freeze({ status: "unsupported", unsupportedKeys });

  let result = null;
  if (Object.hasOwn(payload.patch, "name")) {
    if (typeof commands.renameEquipment !== "function") return Object.freeze({ status: "unsupported" });
    result = commands.renameEquipment({ itemId: payload.itemId, name: payload.patch.name });
  }
  if (Object.hasOwn(payload.patch, "quantity")) {
    if (typeof commands.setEquipmentQuantity !== "function") return Object.freeze({ status: "unsupported" });
    result = commands.setEquipmentQuantity({ itemId: payload.itemId, quantity: payload.patch.quantity });
  }
  if (Object.hasOwn(payload.patch, "state")) {
    if (typeof commands.setEquipmentState !== "function") return Object.freeze({ status: "unsupported" });
    result = commands.setEquipmentState({ itemId: payload.itemId, state: payload.patch.state });
  }
  return result ?? Object.freeze({ status: "no-op" });
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

function findDataTarget(target, key) {
  let current = target ?? null;
  while (current !== null) {
    if (current.dataset?.[key]) return current;
    current = current.parentElement ?? null;
  }
  return null;
}

function readValue(root, selector) {
  const input = root.querySelector?.(selector);
  return typeof input?.value === "string" ? input.value : "";
}

function readNumber(root, selector, fallback) {
  const raw = readValue(root, selector);
  if (raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function renderTextareaText(value) {
  return `\n${escapeText(value)}`;
}

function escapeText(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
