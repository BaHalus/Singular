import {
  bootstrapCharacterMobileLanguageCultureEditApp,
} from "./CharacterMobileLanguageCultureEditApp.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";

export async function bootstrapCharacterMobileAttackEditApp(options = {}) {
  requirePlainObject(options, "Character mobile attack edit bootstrap options");
  const app = await bootstrapCharacterMobileLanguageCultureEditApp(options);
  const root = options.root ?? resolveMobileRoot(options.document);

  const render = () => {
    app.render();
    injectCurrentAttackControls(root, app);
  };

  injectCurrentAttackControls(root, app);

  const MutationObserverRef = options.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof MutationObserverRef === "function"
    ? new MutationObserverRef(() => injectCurrentAttackControls(root, app))
    : null;
  observer?.observe?.(root, { childList: true, subtree: true });

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
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
        observer?.disconnect?.();
        root.removeEventListener?.("click", handleClick);
        app.languageCultureEdit?.destroy?.();
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
  root.innerHTML = injectMobileAttackEditControls(
    root.innerHTML,
    app.persistence.getActiveSession().character,
    app.mode,
  );
  app.modeSync.sync();
}

function appendInlineEditorToAttack(html, attack) {
  const id = escapeAttribute(attack.id);
  const marker = `data-attack-id="${id}"`;
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;
  const ddEnd = html.indexOf("</dd>", markerIndex);
  if (ddEnd < 0) return html;
  const existingMarker = `data-role="attack-inline-editor" data-attack-id="${id}"`;
  const existingIndex = html.indexOf(existingMarker, markerIndex);
  if (existingIndex >= 0 && existingIndex < ddEnd) return html;
  return `${html.slice(0, ddEnd)}${renderAttackInlineEditor(attack)}${html.slice(ddEnd)}`;
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

function resolveMobileRoot(documentOption) {
  const documentRef = documentOption ?? globalThis.document;
  if (!documentRef || typeof documentRef.querySelector !== "function") {
    throw new Error("Character mobile attack edit bootstrap requires a document");
  }
  const root = documentRef.querySelector(MOBILE_ROOT_SELECTOR);
  if (root === null) throw new Error("Character mobile attack edit bootstrap root was not found");
  return root;
}

function findDataTarget(target, key) {
  let current = target ?? null;
  while (current !== null) {
    if (readDataset(current, key) !== null) return current;
    current = current.parentElement ?? null;
  }
  return null;
}

function readDataset(target, key) {
  if (!target || typeof target !== "object") return null;
  const value = target.dataset?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function readInputValue(root, selector) {
  const input = root.querySelector?.(selector);
  return typeof input?.value === "string" ? input.value : "";
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function escapeSelectorValue(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function renderTextareaText(value) {
  return `\n${escapeText(value)}`;
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
