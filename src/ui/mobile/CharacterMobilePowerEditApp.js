import {
  bootstrapCharacterMobileSpellEditApp,
} from "./CharacterMobileSpellEditApp.js";

export async function bootstrapCharacterMobilePowerEditApp(options = {}) {
  const app = await bootstrapCharacterMobileSpellEditApp(options);
  const root = options.root ?? options.document?.querySelector?.("[data-singular-mobile-root]") ?? globalThis.document?.querySelector?.("[data-singular-mobile-root]");
  if (!root) throw new Error("Character mobile power edit bootstrap root was not found");

  const render = () => {
    app.render();
    injectCurrentPowerControls(root, app);
  };

  injectCurrentPowerControls(root, app);

  const handleClick = event => {
    const target = findDataTarget(event?.target, "action");
    const action = target?.dataset?.action;
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

    const powerId = target.dataset.powerId;
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
    render,
    powerEdit: Object.freeze({
      destroy() {
        root.removeEventListener?.("click", handleClick);
        app.spellEdit?.destroy?.();
      },
    }),
  });
}

export function injectMobilePowerEditControls(html, character, mode) {
  if (mode !== "creation") return html;
  let nextHtml = html;
  for (const power of character.powers ?? []) {
    nextHtml = appendEditor(nextHtml, power);
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
  root.innerHTML = injectMobilePowerEditControls(root.innerHTML, app.character, app.mode);
  app.modeSync.sync();
}

function appendEditor(html, power) {
  const id = String(power.id);
  const markerIndex = html.indexOf(`data-power-id="${escapeAttribute(id)}"`);
  if (markerIndex < 0) return html;
  const ddEnd = html.indexOf("</dd>", markerIndex);
  if (ddEnd < 0) return html;
  const existing = html.indexOf(`data-role="power-inline-editor" data-power-id="${escapeAttribute(id)}"`, markerIndex);
  if (existing >= 0 && existing < ddEnd) return html;
  return html.slice(0, ddEnd) + renderEditor(power) + html.slice(ddEnd);
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
    `<label>Notas <input type="text" data-role="power-edit-notes-${id}" value="${escapeAttribute(power.notes ?? "")}" autocomplete="off" disabled></label>`,
    `<button type="button" data-action="power-update" data-power-id="${id}">Salvar poder</button>`,
    "</div>",
  ].join("");
}

function readPowerPatch(root, powerId) {
  const suffix = escapeSelectorValue(powerId);
  return readPowerPatchFromValues({
    name: readValue(root, `[data-role="power-edit-name-${suffix}"]`),
    source: readValue(root, `[data-role="power-edit-source-${suffix}"]`),
    powerModifierName: readValue(root, `[data-role="power-edit-modifier-name-${suffix}"]`),
    powerModifierValuePercent: readNumber(root, `[data-role="power-edit-modifier-value-${suffix}"]`, null),
    powerModifierNotes: readValue(root, `[data-role="power-edit-modifier-notes-${suffix}"]`),
    talentTraitId: readValue(root, `[data-role="power-edit-talent-${suffix}"]`),
    memberTraitIds: readValue(root, `[data-role="power-edit-members-${suffix}"]`),
    tags: readValue(root, `[data-role="power-edit-tags-${suffix}"]`),
    notes: readValue(root, `[data-role="power-edit-notes-${suffix}"]`),
  });
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

function splitTextList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value.split(",").map(item => item.trim()).filter(Boolean);
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
