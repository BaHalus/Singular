import {
  createAttributes,
  validateAttributes,
  serializeAttributes,
} from "./Attributes.js";
import {
  createSecondaryCharacteristics,
  validateSecondaryCharacteristics,
  serializeSecondaryCharacteristics,
} from "./SecondaryCharacteristics.js";
import {
  createPools,
  validatePools,
  serializePools,
} from "./Pools.js";
import {
  createState,
  validateState,
  serializeState,
} from "./State.js";
import {
  createTraitsFromCharacterInput,
  validateTraits,
  serializeTraits,
  projectTraitsByRole,
  validateTraitProjections,
} from "./Traits.js";
import {
  createTraitAlternativeGroupPolicies,
  validateTraitAlternativeGroupsForCharacter,
  serializeTraitAlternativeGroupPolicies,
} from "./TraitAlternativeGroupPolicies.js";
import {
  validateAdvantages,
  serializeAdvantages,
} from "./Advantages.js";
import {
  validatePerks,
  serializePerks,
} from "./Perks.js";
import {
  validateDisadvantages,
  serializeDisadvantages,
} from "./Disadvantages.js";
import {
  validateQuirks,
  serializeQuirks,
} from "./Quirks.js";
import {
  createSkills,
  validateSkills,
  serializeSkills,
} from "./Skills.js";
import {
  createTechniques,
  validateTechniques,
  serializeTechniques,
} from "./Techniques.js";
import {
  createSpells,
  validateSpells,
  serializeSpells,
} from "./Spells.js";
import {
  createLanguages,
  validateLanguages,
  serializeLanguages,
} from "./Languages.js";
import {
  createFamiliarities,
  validateFamiliarities,
  serializeFamiliarities,
} from "./Familiarities.js";
import {
  createEquipment,
  validateEquipment,
  serializeEquipment,
} from "./Equipment.js";
import {
  createTemplates,
  validateTemplates,
  serializeTemplates,
} from "./Templates.js";
import {
  createTemplateApplications,
  validateTemplateApplications,
  serializeTemplateApplications,
} from "./TemplateApplications.js";
import {
  createAlternateFormSets,
  validateAlternateFormSets,
  serializeAlternateFormSets,
} from "./AlternateForms.js";
import {
  createFormTransitionHistory,
  validateFormTransitionHistoryForCharacter,
  serializeFormTransitionHistory,
} from "./FormTransitionHistory.js";
import {
  validateMorphProfilesForCharacter,
} from "./MorphProfile.js";

export function createCharacter(input = {}) {
  const traits = createTraitsFromCharacterInput(input);
  const traitProjections = projectTraitsByRole(traits);
  const traitAlternativeGroups = createTraitAlternativeGroupPolicies(
    input.traitAlternativeGroups,
    traits,
  );
  const character = {
    identity: input.identity ?? createDefaultIdentity(),

    attributes: createAttributes(input.attributes),
    secondaryCharacteristics:
      createSecondaryCharacteristics(input.secondaryCharacteristics),
    pools: createPools(input.pools),
    state: createState(input.state),

    traits,
    traitAlternativeGroups,
    advantages: traitProjections.advantages,
    perks: traitProjections.perks,
    disadvantages: traitProjections.disadvantages,
    quirks: traitProjections.quirks,

    skills: createSkills(input.skills),
    techniques: createTechniques(input.techniques),
    spells: createSpells(input.spells),
    powers: input.powers ?? [],
    equipment: createEquipment(input.equipment),
    attacks: input.attacks ?? [],
    languages: createLanguages(input.languages),
    familiarities: createFamiliarities(input.familiarities),
    templates: createTemplates(input.templates),
    templateApplications: createTemplateApplications(input.templateApplications),
    alternateFormSets: createAlternateFormSets(input.alternateFormSets),
    formTransitionHistory: createFormTransitionHistory(input.formTransitionHistory),

    metadata: input.metadata ?? createDefaultMetadata(),
  };

  validateCharacter(character);
  return character;
}

export function validateCharacter(character) {
  if (!character || typeof character !== "object") {
    throw new Error("Character must be an object");
  }

  if (!character.identity?.id) {
    throw new Error("Character must have a valid identity.id");
  }

  if (!character.identity?.name) {
    throw new Error("Character must have a valid identity.name");
  }

  validateAttributes(character.attributes);
  validateSecondaryCharacteristics(character.secondaryCharacteristics);
  validatePools(character.pools);
  validateState(character.state);

  validateTraits(character.traits);
  validateTraitAlternativeGroupsForCharacter(
    character.traitAlternativeGroups,
    character.traits,
  );
  validateAdvantages(character.advantages);
  validatePerks(character.perks);
  validateDisadvantages(character.disadvantages);
  validateQuirks(character.quirks);
  validateTraitProjections(character.traits, {
    advantages: character.advantages,
    perks: character.perks,
    disadvantages: character.disadvantages,
    quirks: character.quirks,
  });

  validateSkills(character.skills);
  validateTechniques(character.techniques);
  validateSpells(character.spells);
  validateLanguages(character.languages);
  validateFamiliarities(character.familiarities);
  validateEquipment(character.equipment);
  validateTemplates(character.templates);
  validateTemplateApplications(character.templateApplications);
  validateAlternateFormSets(character.alternateFormSets);
  validateMorphProfilesForCharacter(character);
  validateFormTransitionHistoryForCharacter(
    character.formTransitionHistory,
    character.identity.id,
  );

  if (!character.metadata) {
    throw new Error("Character must have metadata");
  }

  return true;
}

export function serializeCharacter(character) {
  validateCharacter(character);

  return {
    identity: character.identity,

    attributes: serializeAttributes(character.attributes),
    secondaryCharacteristics:
      serializeSecondaryCharacteristics(character.secondaryCharacteristics),
    pools: serializePools(character.pools),
    state: serializeState(character.state),

    traits: serializeTraits(character.traits),
    traitAlternativeGroups:
      serializeTraitAlternativeGroupPolicies(character.traitAlternativeGroups),
    advantages: serializeAdvantages(character.advantages),
    perks: serializePerks(character.perks),
    disadvantages: serializeDisadvantages(character.disadvantages),
    quirks: serializeQuirks(character.quirks),

    skills: serializeSkills(character.skills),
    techniques: serializeTechniques(character.techniques),
    spells: serializeSpells(character.spells),
    powers: character.powers,
    equipment: serializeEquipment(character.equipment),
    attacks: character.attacks,
    languages: serializeLanguages(character.languages),
    familiarities: serializeFamiliarities(character.familiarities),
    templates: serializeTemplates(character.templates),
    templateApplications:
      serializeTemplateApplications(character.templateApplications),
    alternateFormSets: serializeAlternateFormSets(character.alternateFormSets),
    formTransitionHistory:
      serializeFormTransitionHistory(character.formTransitionHistory),

    metadata: character.metadata,
  };
}

function createDefaultIdentity() {
  return {
    id: cryptoRandomId(),
    name: "Unnamed",
    concept: "",
    playerId: null,
    campaignId: null,
  };
}

function createDefaultMetadata() {
  const now = new Date().toISOString();

  return {
    createdAt: now,
    updatedAt: now,
    source: "singular",
  };
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `char_${Math.random().toString(36).slice(2, 10)}`;
}
