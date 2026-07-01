import { bootstrapCharacterMobilePowerEditApp } from "./CharacterMobilePowerEditApp.js";

export const CHARACTER_MOBILE_COMPOSITION_MODULES = Object.freeze([
  Object.freeze({ name: "power-edit", bootstrap: bootstrapCharacterMobilePowerEditApp }),
]);

export async function bootstrapCharacterMobileCompositionRoot(options = {}) {
  return bootstrapCharacterMobilePowerEditApp(options);
}
