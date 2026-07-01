import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";
import { mountCharacterMobileLanguageCultureApp } from "./CharacterMobileLanguageCultureApp.js";
import { mountCharacterMobileSecondaryNotesApp } from "./CharacterMobileSecondaryNotesApp.js";
import { mountCharacterMobileTraitEditApp } from "./CharacterMobileTraitEditApp.js";
import { mountCharacterMobileSkillTechniqueEditApp } from "./CharacterMobileSkillTechniqueEditApp.js";
import { mountCharacterMobileLanguageCultureEditApp } from "./CharacterMobileLanguageCultureEditApp.js";
import { mountCharacterMobileAttackEditApp } from "./CharacterMobileAttackEditApp.js";
import { mountCharacterMobileEquipmentEditApp } from "./CharacterMobileEquipmentEditApp.js";
import { mountCharacterMobileSpellEditApp } from "./CharacterMobileSpellEditApp.js";
import { mountCharacterMobilePowerEditApp } from "./CharacterMobilePowerEditApp.js";

const MOBILE_ROOT_SELECTOR = "[data-singular-mobile-root]";
const PERSISTENCE_RENDER_ACTIONS = Object.freeze([
  "persistence-save",
  "persistence-refresh",
  "persistence-open",
  "persistence-remove",
  "persistence-export",
  "persistence-import",
]);

export const CHARACTER_MOBILE_COMPOSITION_MODULES = Object.freeze([
  Object.freeze({
    name: "language-culture",
    destroyKey: "languageCulture",
    mount: mountCharacterMobileLanguageCultureApp,
  }),
  Object.freeze({
    name: "secondary-notes",
    destroyKey: "secondaryNotes",
    mount: mountCharacterMobileSecondaryNotesApp,
  }),
  Object.freeze({
    name: "trait-edit",
    destroyKey: "traitEdit",
    mount: mountCharacterMobileTraitEditApp,
  }),
  Object.freeze({
    name: "skill-technique-edit",
    destroyKey: "skillTechniqueEdit",
    mount: mountCharacterMobileSkillTechniqueEditApp,
  }),
  Object.freeze({
    name: "language-culture-edit",
    destroyKey: "languageCultureEdit",
    mount: mountCharacterMobileLanguageCultureEditApp,
  }),
  Object.freeze({
    name: "attack-edit",
    destroyKey: "attackEdit",
    mount: mountCharacterMobileAttackEditApp,
  }),
  Object.freeze({
    name: "equipment-edit",
    destroyKey: "equipmentEdit",
    mount: mountCharacterMobileEquipmentEditApp,
  }),
  Object.freeze({
    name: "spell-edit",
    destroyKey: "spellEdit",
    mount: mountCharacterMobileSpellEditApp,
  }),
  Object.freeze({
    name: "power-edit",
    destroyKey: "powerEdit",
    mount: mountCharacterMobilePowerEditApp,
  }),
]);

export async function bootstrapCharacterMobileCompositionRoot(options = {}) {
  const app = await bootstrapCharacterMobileApp(options);
  return mountCharacterMobileCompositionRoot(app, options);
}

export function mountCharacterMobileCompositionRoot(
  app,
  options = {},
  modules = CHARACTER_MOBILE_COMPOSITION_MODULES,
) {
  const mountedModules = [];
  let mounted = app;

  for (const module of modules) {
    mounted = module.mount(mounted, options);
    const handle = mounted[module.destroyKey];
    if (typeof handle?.destroy !== "function") {
      throw new Error(`Mobile composition module ${module.name} did not expose ${module.destroyKey}.destroy`);
    }
    mountedModules.push(Object.freeze({
      name: module.name,
      destroyKey: module.destroyKey,
      handle,
    }));
  }

  const featureHandles = Object.fromEntries(
    mountedModules.map(module => [module.destroyKey, module.handle]),
  );
  let destroyed = false;
  const root = resolveOptionalMobileRoot(options);
  const schedulePostPersistenceRender = createPostPersistenceRenderScheduler(options);
  const handlePersistenceCompositionRender = event => {
    if (!isPersistenceRenderAction(readEventAction(event))) return;
    schedulePostPersistenceRender(() => {
      if (!destroyed) mounted.render();
    });
  };
  root?.addEventListener?.("click", handlePersistenceCompositionRender);

  const destroyComposition = () => {
    if (destroyed) return;
    destroyed = true;
    root?.removeEventListener?.("click", handlePersistenceCompositionRender);
    for (const module of [...mountedModules].reverse()) {
      module.handle.destroy();
    }
    app.interactions?.destroy?.();
    app.modeSync?.destroy?.();
  };

  return Object.freeze({
    get character() {
      return app.character;
    },
    get session() {
      return app.session;
    },
    get html() {
      return app.html;
    },
    get mode() {
      return app.mode;
    },
    interactions: app.interactions,
    modeSync: app.modeSync,
    ui: app.ui,
    persistence: app.persistence,
    commands: app.commands,
    repositories: app.repositories,
    runtime: app.runtime,
    render: mounted.render,
    ...featureHandles,
    powerEdit: Object.freeze({
      ...featureHandles.powerEdit,
      destroy: destroyComposition,
    }),
    compositionRoot: Object.freeze({
      destroy: destroyComposition,
    }),
  });
}

function resolveOptionalMobileRoot(options) {
  if (options.root !== undefined) return options.root;
  const documentRef = options.document ?? globalThis.document;
  if (documentRef === undefined || documentRef === null) return null;
  return documentRef.querySelector?.(MOBILE_ROOT_SELECTOR) ?? null;
}

function createPostPersistenceRenderScheduler(options) {
  if (options.schedulePostPersistenceRender !== undefined) {
    if (typeof options.schedulePostPersistenceRender !== "function") {
      throw new Error("Mobile composition post-persistence render scheduler must be a function");
    }
    return options.schedulePostPersistenceRender;
  }
  return task => globalThis.setTimeout(task, 0);
}

function readEventAction(event) {
  const actionTarget = findDataTarget(event?.target, "action");
  return actionTarget === null ? null : readDataset(actionTarget, "action");
}

function isPersistenceRenderAction(action) {
  return PERSISTENCE_RENDER_ACTIONS.includes(action);
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
