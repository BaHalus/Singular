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
    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
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

export function injectMobileEquipmentEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const item of flattenEquipment(character.equipment ?? [])) {
    nextHtml = appendEditor(nextHtml, item);
  }
  return nextHtml;
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
    `<label>Estado <select data-role="equipment-edit-state-${id}">${stateOptions(item.state)}</select></label>`,
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
    state: readValue(root, `[data-role="equipment-edit-state-${suffix}"]`) || "carried",
  };
}

function applyEquipmentPatch(app, itemId, patch) {
  const current = findEquipmentItem(app.character.equipment ?? [], itemId);
  if (current === null) return Object.freeze({ status: "rejected" });
  const results = [];
  if (patch.name !== current.name) results.push(app.commands.renameEquipment({ itemId, name: patch.name }));
  if (!Object.is(patch.quantity, current.quantity)) results.push(app.commands.setEquipmentQuantity({ itemId, quantity: patch.quantity }));
  if (patch.state !== current.state) results.push(app.commands.setEquipmentState({ itemId, state: patch.state }));
  if (results.length === 0) return Object.freeze({ status: "no-op" });
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
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
