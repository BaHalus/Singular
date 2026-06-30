import { bootstrapCharacterMobileApp } from "./CharacterMobileApp.js";
import { bootstrapCharacterMobileLanguageCultureApp } from "./CharacterMobileLanguageCultureApp.js";
import { bootstrapCharacterMobileSecondaryNotesApp } from "./CharacterMobileSecondaryNotesApp.js";
import { bootstrapCharacterMobileTraitEditApp } from "./CharacterMobileTraitEditApp.js";
import { bootstrapCharacterMobileSkillTechniqueEditApp } from "./CharacterMobileSkillTechniqueEditApp.js";
import { bootstrapCharacterMobileLanguageCultureEditApp } from "./CharacterMobileLanguageCultureEditApp.js";
import { bootstrapCharacterMobileAttackEditApp } from "./CharacterMobileAttackEditApp.js";
import { bootstrapCharacterMobileEquipmentEditApp } from "./CharacterMobileEquipmentEditApp.js";
import { bootstrapCharacterMobileSpellEditApp } from "./CharacterMobileSpellEditApp.js";
import { bootstrapCharacterMobilePowerEditApp } from "./CharacterMobilePowerEditApp.js";

export const CHARACTER_MOBILE_COMPOSITION_MODULES = Object.freeze([
  Object.freeze({ name: "base", bootstrap: bootstrapCharacterMobileApp }),
  Object.freeze({ name: "language-culture", bootstrap: bootstrapCharacterMobileLanguageCultureApp }),
  Object.freeze({ name: "secondary-notes", bootstrap: bootstrapCharacterMobileSecondaryNotesApp }),
  Object.freeze({ name: "trait-edit", bootstrap: bootstrapCharacterMobileTraitEditApp }),
  Object.freeze({ name: "skill-technique-edit", bootstrap: bootstrapCharacterMobileSkillTechniqueEditApp }),
  Object.freeze({ name: "language-culture-edit", bootstrap: bootstrapCharacterMobileLanguageCultureEditApp }),
  Object.freeze({ name: "attack-edit", bootstrap: bootstrapCharacterMobileAttackEditApp }),
  Object.freeze({ name: "equipment-edit", bootstrap: bootstrapCharacterMobileEquipmentEditApp }),
  Object.freeze({ name: "spell-edit", bootstrap: bootstrapCharacterMobileSpellEditApp }),
  Object.freeze({ name: "power-edit", bootstrap: bootstrapCharacterMobilePowerEditApp }),
]);

export async function bootstrapCharacterMobileCompositionRoot(options = {}) {
  return bootstrapCharacterMobilePowerEditApp(options);
}
