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
  validateTraitFinalCostAuthority,
} from "./TraitFinalCostAuthority.js";
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
  createPowers,
  validatePowers,
  serializePowers,
} from "./Powers.js";
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
  createNotes,
  validateNotes,
  serializeNotes,
} from "./Notes.js";
import {
  createEquipment,
  validateEquipment,
  serializeEquipment,
} from "./Equipment.js";
import {
  createAttacks,
  validateAttacks,
  serializeAttacks,
} from "./Attacks.js";
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
import {
  createPointBudget,
  serializePointBudget,
  validatePointBudget,
} from "../points/PointBudget.js";

export function createCharacter(input = {}) {
  const traits = createTraitsFromCharacterInput(input);
  const traitProjections = projectTraitsByRole(traits);
  const traitAlternativeGroups = createTraitAlternativeGroupPolicies(
    input.traitAlternativeGroups,
    traits,
  );
  const character = {
    identity: input.identity ?? createDefaultIdentity(),
    pointBudget: createPointBudget(input.pointBudget),

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
    powers: createPowers(input.powers),
    equipment: createEquipment(input.equipment),
    attacks: createAttacks(input.attacks),
    languages: createLanguages(input.languages),
    familiarities: createFamiliarities(input.familiarities),
    notes: createNotes(input.notes),
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

  validatePointBudget(character.pointBudget);
  validateAttributes(character.attributes);
  validateSecondaryCharacteristics(character.secondaryCharacteristics);
  validatePools(character.pools);
  validateState(character.state);

  validateTraits(character.traits);
  validateTraitAlternativeGroupsForCharacter(
    character.traitAlternativeGroups,
    character.traits,
  );
  validateTraitFinalCostAuthorities(character);
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
  validatePowers(character.powers);
  validatePowerReferencesForCharacter(character);
  validateLanguages(character.languages);
  validateFamiliarities(character.familiarities);
  validateNotes(character.notes);
  validateEquipment(character.equipment);
  validateAttacks(character.attacks);
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
    pointBudget: serializePointBudget(character.pointBudget),

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
    powers: serializePowers(character.powers),
    equipment: serializeEquipment(character.equipment),
    attacks: serializeAttacks(character.attacks),
    languages: serializeLanguages(character.languages),
    familiarities: serializeFamiliarities(character.familiarities),
    notes: serializeNotes(character.notes),
    templates: serializeTemplates(character.templates),
    templateApplications:
      serializeTemplateApplications(character.templateApplications),
    alternateFormSets: serializeAlternateFormSets(character.alternateFormSets),
    formTransitionHistory:
      serializeFormTransitionHistory(character.formTransitionHistory),

    metadata: character.metadata,
  };
}

function validatePowerReferencesForCharacter(character) {
  const traitIds = new Set(character.traits.map(trait => trait.id));

  for (const power of character.powers) {
    if (power.talentTraitId !== null && !traitIds.has(power.talentTraitId)) {
      throw new Error(
        `Power ${power.id} references missing talent Trait: ${power.talentTraitId}`,
      );
    }

    for (const traitId of power.memberTraitIds) {
      if (!traitIds.has(traitId)) {
        throw new Error(
          `Power ${power.id} references missing member Trait: ${traitId}`,
        );
      }
    }
  }
}

function validateTraitFinalCostAuthorities(character) {
  for (const trait of character.traits) {
    const authority = trait.pointValue.finalCostAuthority ?? null;
    if (authority === null) continue;
    validateTraitFinalCostAuthority(authority);
    if (authority.characterId !== character.identity.id) {
      throw new Error(
        `Trait ${trait.id} final cost authority belongs to another character`,
      );
    }
    if (authority.traitId !== trait.id) {
      throw new Error(`Trait ${trait.id} final cost authority id mismatch`);
    }
    if (!Object.is(
      trait.pointValue.calculatedPoints,
      authority.contributionPoints,
    )) {
      throw new Error(`Trait ${trait.id} calculated points diverge from authority`);
    }
  }
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
