import {
  bootstrapCharacterMobileEquipmentEditApp,
} from "./CharacterMobileEquipmentEditApp.js";

export async function bootstrapCharacterMobileSpellEditApp(options = {}) {
  const app = await bootstrapCharacterMobileEquipmentEditApp(options);
  const root = options.root ?? options.document?.querySelector?.("[data-singular-mobile-root]") ?? globalThis.document?.querySelector?.("[data-singular-mobile-root]");
  if (!root) throw new Error("Character mobile spell edit bootstrap root was not found");

  const render = () => {
    app.render();
    injectCurrentSpellControls(root, app);
  };

  injectCurrentSpellControls(root, app);

  const handleClick = event => {
    const target = findDataTarget(event?.target, "action");
    const action = target?.dataset?.action;
    if (action !== "spell-update") return null;
    event.preventDefault?.();
    if (app.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (app.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const spellId = target.dataset.spellId;
    const result = app.commands.updateSpell({
      spellId,
      patch: readSpellPatch(root, spellId),
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
    spellEdit: Object.freeze({
      destroy() {
        root.removeEventListener?.("click", handleClick);
        app.equipmentEdit?.destroy?.();
      },
    }),
  });
}

export function injectMobileSpellEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const spell of character.spells ?? []) {
    nextHtml = appendEditor(nextHtml, spell);
  }
  return nextHtml;
}

function injectCurrentSpellControls(root, app) {
  root.innerHTML = injectMobileSpellEditControls(root.innerHTML, app.character, app.mode);
  app.modeSync.sync();
}

function appendEditor(html, spell) {
  const id = String(spell.id);
  const markerIndex = html.indexOf(`data-spell-id="${escapeAttribute(id)}"`);
  if (markerIndex < 0) return html;
  const ddEnd = html.indexOf("</dd>", markerIndex);
  if (ddEnd < 0) return html;
  const existing = html.indexOf(`data-role="spell-inline-editor" data-spell-id="${escapeAttribute(id)}"`, markerIndex);
  if (existing >= 0 && existing < ddEnd) return html;
  return html.slice(0, ddEnd) + renderEditor(spell) + html.slice(ddEnd);
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
    `<label>Notas <input type="text" data-role="spell-edit-notes-${id}" value="${escapeAttribute(spell.notes ?? "")}" autocomplete="off"></label>`,
    `<button type="button" data-action="spell-update" data-spell-id="${id}">Salvar magia</button>`,
    "</div>",
  ].join("");
}

function spellTypeOptions(active) {
  return [["standard", "Padrão"], ["ritualMagic", "Ritualística"]]
    .map(([value, label]) => `<option value="${value}"${value === active ? " selected" : ""}>${label}</option>`)
    .join("");
}

function readSpellPatch(root, spellId) {
  const suffix = escapeSelectorValue(spellId);
  return {
    name: readValue(root, `[data-role="spell-edit-name-${suffix}"]`),
    spellType: readValue(root, `[data-role="spell-edit-type-${suffix}"]`) || "standard",
    attribute: normalizeOptionalText(readValue(root, `[data-role="spell-edit-attribute-${suffix}"]`)),
    difficulty: normalizeOptionalText(readValue(root, `[data-role="spell-edit-difficulty-${suffix}"]`)),
    points: readNumber(root, `[data-role="spell-edit-points-${suffix}"]`, 0),
    spellClass: readValue(root, `[data-role="spell-edit-class-${suffix}"]`),
    resistance: readValue(root, `[data-role="spell-edit-resistance-${suffix}"]`),
    castingCost: readValue(root, `[data-role="spell-edit-casting-cost-${suffix}"]`),
    maintenanceCost: readValue(root, `[data-role="spell-edit-maintenance-cost-${suffix}"]`),
    castingTime: readValue(root, `[data-role="spell-edit-casting-time-${suffix}"]`),
    duration: readValue(root, `[data-role="spell-edit-duration-${suffix}"]`),
    notes: readValue(root, `[data-role="spell-edit-notes-${suffix}"]`),
  };
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

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function escapeSelectorValue(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeAttribute(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
