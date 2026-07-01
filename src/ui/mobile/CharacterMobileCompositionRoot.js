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
  const destroyComposition = () => {
    if (destroyed) return;
    destroyed = true;
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
