import { bootstrapCharacterMobileApp, getCharacterMobileRootSelector } from "./CharacterMobileApp.js";
import { mountCharacterMobileLanguageCultureApp } from "./CharacterMobileLanguageCultureApp.js";
import { mountCharacterMobileSecondaryNotesApp } from "./CharacterMobileSecondaryNotesApp.js";
import { mountCharacterMobileTraitEditApp } from "./CharacterMobileTraitEditApp.js";
import { mountCharacterMobileSkillTechniqueEditApp } from "./CharacterMobileSkillTechniqueEditApp.js";
import { mountCharacterMobileLanguageCultureEditApp } from "./CharacterMobileLanguageCultureEditApp.js";
import { mountCharacterMobileAttackEditApp } from "./CharacterMobileAttackEditApp.js";
import { mountCharacterMobileEquipmentEditApp } from "./CharacterMobileEquipmentEditApp.js";
import { mountCharacterMobileSpellEditApp } from "./CharacterMobileSpellEditApp.js";
import { mountCharacterMobilePowerEditApp } from "./CharacterMobilePowerEditApp.js";
import { createCharacterMobilePostRenderLifecycle } from "./CharacterMobilePostRenderLifecycle.js";

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
  const postRenderLifecycle = app.postRenderLifecycle ?? createCharacterMobilePostRenderLifecycle();
  const mountedModules = [];
  let mounted = exposePostRenderLifecycle(app, postRenderLifecycle);
  let destroyed = false;
  let renderingComposedSurface = false;

  const runComposedSurfaceRender = () => {
    if (destroyed || renderingComposedSurface) return;
    renderingComposedSurface = true;
    try {
      mounted.render({ skipPostRenderLifecycle: true });
    } finally {
      renderingComposedSurface = false;
    }
  };
  const unregisterComposedSurface = typeof postRenderLifecycle.register === "function"
    ? postRenderLifecycle.register(runComposedSurfaceRender)
    : null;

  for (const module of modules) {
    mounted = exposePostRenderLifecycle(module.mount(mounted, options), postRenderLifecycle);
    const handle = mounted[module.destroyKey];
    if (typeof handle?.destroy !== "function") {
      unregisterComposedSurface?.();
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

  const readLifecycleContext = root => ({
    root,
    character: app.character,
    session: app.session,
    mode: app.mode,
  });

  const runPostRenderLifecycle = () => {
    if (destroyed) return;
    const root = resolveOptionalMobileRoot(mounted, app, options);
    if (root === null) return;
    postRenderLifecycle.run(readLifecycleContext(root));
  };

  const render = () => {
    if (unregisterComposedSurface !== null && typeof app.render === "function") {
      return app.render();
    }
    const result = mounted.render({ skipPostRenderLifecycle: true });
    runPostRenderLifecycle();
    return result;
  };

  const destroyComposition = () => {
    if (destroyed) return;
    destroyed = true;
    unregisterComposedSurface?.();
    for (const module of [...mountedModules].reverse()) {
      module.handle.destroy();
    }
    app.interactions?.destroy?.();
    app.modeSync?.destroy?.();
    postRenderLifecycle.destroy();
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
    ui: mounted.ui,
    persistence: mounted.persistence,
    commands: mounted.commands,
    repositories: mounted.repositories,
    runtime: mounted.runtime,
    postRenderLifecycle,
    render,
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

function resolveOptionalMobileRoot(mounted, app, options) {
  if (options.root !== undefined) return options.root;
  if (mounted.root !== undefined) return mounted.root;
  if (app.root !== undefined) return app.root;
  const documentRef = options.document ?? globalThis.document;
  if (documentRef === undefined || documentRef === null) return null;
  return documentRef.querySelector?.(getCharacterMobileRootSelector()) ?? null;
}
