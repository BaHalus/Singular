import {
  bootstrapCharacterMobileCompositionRoot as bootstrapBaseCharacterMobileCompositionRoot,
} from "./CharacterMobileCompositionRoot.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";

export async function bootstrapCharacterMobileCompositionRoot(options = {}) {
  const app = await bootstrapBaseCharacterMobileCompositionRoot(options);
  return mountCharacterMobileEquipmentContainerSelector(app, options);
}

export function mountCharacterMobileEquipmentContainerSelector(app, options = {}) {
  const root = resolveOptionalMobileRoot(app, options);
  if (root === null) return app;

  const inject = context => {
    const character = context?.character ?? app.character;
    const mode = context?.mode ?? app.mode;
    injectEquipmentContainerSelector(root, character, mode);
  };
  const unregisterPostRender = app.postRenderLifecycle?.register?.(inject) ?? null;
  inject({ character: app.character, mode: app.mode });

  const handleEquipmentAddCapture = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
    if (action !== "equipment-add") return null;

    event.preventDefault?.();
    event.stopImmediatePropagation?.();

    if (app.mode !== "creation") {
      setCommandStatus(root, "blocked-by-mode");
      return Object.freeze({ status: "blocked-by-mode" });
    }
    if (app.ui?.getState?.().busy) {
      setCommandStatus(root, "busy");
      return Object.freeze({ status: "busy" });
    }

    const result = app.commands.addEquipment(readEquipmentDraft(root));
    setCommandStatus(root, result.status);
    if (["applied", "no-op"].includes(result.status)) app.render?.();
    return result;
  };

  root.addEventListener?.("click", handleEquipmentAddCapture, { capture: true });

  const previousCompositionDestroy = app.compositionRoot?.destroy;
  const selectorHandle = Object.freeze({
    destroy() {
      unregisterPostRender?.();
      root.removeEventListener?.("click", handleEquipmentAddCapture, { capture: true });
    },
  });

  return Object.freeze({
    get character() { return app.character; },
    get session() { return app.session; },
    get html() { return app.html; },
    get mode() { return app.mode; },
    interactions: app.interactions,
    modeSync: app.modeSync,
    ui: app.ui,
    persistence: app.persistence,
    commands: app.commands,
    repositories: app.repositories,
    runtime: app.runtime,
    postRenderLifecycle: app.postRenderLifecycle,
    render: app.render,
    languageCulture: app.languageCulture,
    secondaryNotes: app.secondaryNotes,
    traitEdit: app.traitEdit,
    skillTechniqueEdit: app.skillTechniqueEdit,
    languageCultureEdit: app.languageCultureEdit,
    attackEdit: app.attackEdit,
    equipmentEdit: app.equipmentEdit,
    spellEdit: app.spellEdit,
    powerEdit: app.powerEdit,
    equipmentContainerSelector: selectorHandle,
    compositionRoot: Object.freeze({
      destroy() {
        selectorHandle.destroy();
        previousCompositionDestroy?.();
      },
    }),
  });
}

export function createEquipmentContainerOptions(equipment) {
  return flattenEquipmentContainers(equipment ?? []).map(item => Object.freeze({
    id: item.id,
    label: `${"↳ ".repeat(item.depth)}${item.name || "Recipiente sem nome"}`,
  }));
}

function injectEquipmentContainerSelector(root, character, mode) {
  if (mode !== "creation") return false;
  const editor = root.querySelector?.('[data-role="equipment-editor"]') ?? null;
  if (editor === null || editor.querySelector?.('[data-role="equipment-container-id"]') !== null) return false;

  const documentRef = editor.ownerDocument ?? root.ownerDocument ?? globalThis.document;
  if (!documentRef?.createElement) return false;

  const label = documentRef.createElement("label");
  label.textContent = "Adicionar em";
  const select = documentRef.createElement("select");
  select.setAttribute("data-role", "equipment-container-id");

  const rootOption = documentRef.createElement("option");
  rootOption.value = "";
  rootOption.textContent = "Raiz do inventário";
  select.append(rootOption);

  for (const container of createEquipmentContainerOptions(character?.equipment ?? [])) {
    const option = documentRef.createElement("option");
    option.value = container.id;
    option.textContent = container.label;
    select.append(option);
  }

  label.append(select);
  const button = editor.querySelector?.('[data-action="equipment-add"]') ?? null;
  if (button?.parentElement === editor) {
    editor.insertBefore(label, button);
  } else {
    editor.append(label);
  }
  return true;
}

function readEquipmentDraft(root) {
  return {
    name: readInputValue(root, '[data-role="equipment-name"]'),
    kind: readInputValue(root, '[data-role="equipment-kind"]') || "item",
    quantity: readInputNumber(root, '[data-role="equipment-quantity"]', 1),
    weightKg: readInputNumber(root, '[data-role="equipment-weight-kg"]', 0),
    cost: readInputNumber(root, '[data-role="equipment-cost"]', 0),
    state: readInputValue(root, '[data-role="equipment-state"]') || "carried",
    notes: readInputValue(root, '[data-role="equipment-notes"]'),
    containerId: normalizeOptionalText(readInputValue(root, '[data-role="equipment-container-id"]')),
  };
}

function flattenEquipmentContainers(items, depth = 0, output = []) {
  for (const item of items) {
    if (item?.kind === "container") output.push({ ...item, depth });
    flattenEquipmentContainers(item?.children ?? [], depth + 1, output);
  }
  return output;
}

function resolveOptionalMobileRoot(app, options) {
  if (options.root !== undefined) return options.root;
  if (app.root !== undefined) return app.root;
  const documentRef = options.document ?? globalThis.document;
  if (documentRef === undefined || documentRef === null) return null;
  return documentRef.querySelector?.(MOBILE_ROOT_SELECTOR) ?? null;
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

function readInputNumber(root, selector, fallback) {
  const raw = readInputValue(root, selector);
  if (raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function setCommandStatus(root, value) {
  root.setAttribute?.("data-last-command-status", value);
}
