import {
  createAttackReadProjection,
} from "../../application/projections/AttackReadProjection.js";
import { serializeCharacter } from "../../domain/character/Character.js";
import {
  resolveDerivedDefenseMovement,
  serializeDerivedDefenseMovementReport,
} from "../../engine/derived/DerivedDefenseMovementResolver.js";
import {
  createEquipmentMvpProjection,
} from "../../engine/equipment/EquipmentMvpContract.js";
import {
  resolveEquipmentTotals,
} from "../../engine/equipment/EquipmentTotalsResolver.js";
import {
  resolveAttributeLevels,
  serializeAttributeLevelsReport,
} from "../../engine/attributes/AttributeLevelResolver.js";

const MOBILE_PROJECTION_SCHEMA_VERSION = 7;
const ATTRIBUTE_KEYS = Object.freeze(["ST", "DX", "IQ", "HT"]);
const SECONDARY_KEYS = Object.freeze([
  "HP",
  "FP",
  "Will",
  "Per",
  "BasicSpeed",
  "BasicMove",
]);
const POOL_KEYS = Object.freeze(["HP", "FP", "EnergyReserve"]);
const LANGUAGE_LEVELS = Object.freeze(["none", "broken", "accented", "native"]);
const ATTACK_CATEGORIES = Object.freeze(["melee", "ranged"]);
const ATTACK_SOURCE_KINDS = Object.freeze([
  "manual",
  "equipment",
  "trait",
  "spell",
  "power",
  "other",
]);
const MECHANICAL_RESULT_IDS = Object.freeze(["basic-speed", "basic-move", "dodge"]);
const EQUIPMENT_STATES = Object.freeze([
  "equipped",
  "carried",
  "stored",
  "dropped",
  "ignored",
]);

export function projectCharacterForMobileSheet(character) {
  const serializedCharacter = serializeCharacter(character);
  const attackProjection = createAttackReadProjection(character);
  const attributeLevelsReport = resolveAttributeLevels(serializedCharacter.attributes);
  const attributeLevels = serializeAttributeLevelsReport(attributeLevelsReport);
  const derivedDefenseMovement = serializeDerivedDefenseMovementReport(
    resolveDerivedDefenseMovement({
      attributeLevels: attributeLevelsReport,
      secondaryCharacteristics: serializedCharacter.secondaryCharacteristics,
    }),
  );

  return deepFreezeMobileProjection({
    schemaVersion: MOBILE_PROJECTION_SCHEMA_VERSION,
    identity: projectIdentity(serializedCharacter.identity),
    attributes: projectAttributes(attributeLevels),
    secondaryCharacteristics: projectSecondaryCharacteristics(
      serializedCharacter.secondaryCharacteristics,
    ),
    pools: projectPools(serializedCharacter.pools),
    traits: projectTraits(serializedCharacter.traits),
    skills: projectSkills(serializedCharacter.skills),
    techniques: projectTechniques(serializedCharacter.techniques),
    languages: projectLanguages(serializedCharacter.languages),
    familiarities: projectFamiliarities(serializedCharacter.familiarities),
    attacks: projectAttacks(attackProjection),
    equipment: projectEquipment(serializedCharacter.equipment),
    mechanicalResults: projectMechanicalResults(derivedDefenseMovement),
    sections: projectMobileSections({
      traits: serializedCharacter.traits,
      skills: serializedCharacter.skills,
      techniques: serializedCharacter.techniques,
      languages: serializedCharacter.languages,
      familiarities: serializedCharacter.familiarities,
      attacks: attackProjection.attacks,
      equipment: serializedCharacter.equipment,
    }),
  });
}

export function validateCharacterMobileProjection(projection) {
  requirePlainObject(projection, "Character mobile projection");
  if (projection.schemaVersion !== MOBILE_PROJECTION_SCHEMA_VERSION) {
    throw new Error("Character mobile projection schemaVersion is invalid");
  }

  validateIdentityProjection(projection.identity);
  validateAttributesProjection(projection.attributes);
  validateSecondaryCharacteristicsProjection(projection.secondaryCharacteristics);
  validatePoolsProjection(projection.pools);
  validateTraitListProjection(projection.traits);
  validateSkillListProjection(projection.skills);
  validateTechniqueListProjection(projection.techniques);
  validateLanguageListProjection(projection.languages);
  validateFamiliarityListProjection(projection.familiarities);
  validateAttackProjection(projection.attacks, projection.identity.id);
  validateEquipmentProjection(projection.equipment);
  validateMechanicalResultsProjection(projection.mechanicalResults);
  validateSectionsProjection(projection.sections);
  return true;
}

export function serializeCharacterMobileProjection(projection) {
  validateCharacterMobileProjection(projection);
  return JSON.parse(JSON.stringify(projection));
}

export function getCharacterMobileProjectionSchemaVersion() {
  return MOBILE_PROJECTION_SCHEMA_VERSION;
}

function projectIdentity(identity) {
  return {
    id: identity.id,
    name: identity.name,
    concept: identity.concept ?? "",
    playerId: identity.playerId ?? null,
    campaignId: identity.campaignId ?? null,
  };
}

function projectAttributes(attributeLevels) {
  return Object.fromEntries(
    ATTRIBUTE_KEYS.map(attributeKey => {
      const result = attributeLevels.results[attributeKey];
      return [attributeKey, {
        key: attributeKey,
        status: result.status,
        level: result.level,
        source: result.source,
        diagnostics: result.diagnostics,
      }];
    }),
  );
}

function projectSecondaryCharacteristics(secondaryCharacteristics) {
  return Object.fromEntries(
    SECONDARY_KEYS.map(key => {
      const characteristic = secondaryCharacteristics[key];
      return [key, {
        key,
        status: "declared",
        base: characteristic.base,
        override: characteristic.override,
      }];
    }),
  );
}

function projectPools(pools) {
  return Object.fromEntries(
    POOL_KEYS
      .filter(key => pools[key] !== undefined)
      .map(key => [key, {
        key,
        current: pools[key].current,
        maximum: pools[key].maximum,
      }]),
  );
}

function projectTraits(traits) {
  return traits.map(trait => ({
    id: trait.id,
    name: trait.name,
    role: trait.role,
    points: trait.points,
    levels: trait.levels,
    notes: trait.notes,
    status: "declared",
  }));
}

function projectSkills(skills) {
  return skills.map(skill => ({
    id: skill.id,
    name: skill.name,
    specialization: skill.specialization,
    techLevel: skill.techLevel,
    attribute: skill.attribute,
    difficulty: skill.difficulty,
    points: skill.points,
    importedLevel: skill.importedLevel,
    importedRelativeLevel: skill.importedRelativeLevel,
    notes: skill.notes,
    status: "declared",
  }));
}

function projectTechniques(techniques) {
  return techniques.map(technique => ({
    id: technique.id,
    name: technique.name,
    specialization: technique.specialization,
    skillId: technique.skillId,
    skillName: technique.skillName,
    skillSpecialization: technique.skillSpecialization,
    difficulty: technique.difficulty,
    points: technique.points,
    importedLevel: technique.importedLevel,
    importedRelativeLevel: technique.importedRelativeLevel,
    defaultPenalty: technique.defaultPenalty,
    maximumRelativeLevel: technique.maximumRelativeLevel,
    notes: technique.notes,
    status: "declared",
  }));
}

function projectLanguages(languages) {
  return languages.map(language => ({
    id: language.id,
    name: language.name,
    spokenLevel: language.spokenLevel,
    writtenLevel: language.writtenLevel,
    isNative: language.isNative,
    importedCost: language.importedCost,
    reference: language.reference,
    notes: language.notes,
    status: "declared",
  }));
}

function projectFamiliarities(familiarities) {
  return familiarities.map(familiarity => ({
    id: familiarity.id,
    name: familiarity.name,
    isNative: familiarity.isNative,
    importedCost: familiarity.importedCost,
    reference: familiarity.reference,
    notes: familiarity.notes,
    status: "declared",
  }));
}

function projectAttacks(attackProjection) {
  return {
    characterId: attackProjection.characterId,
    authority: "application.attack-read-projection",
    items: attackProjection.attacks.map(attack => ({
      id: attack.id,
      name: attack.name,
      category: attack.category,
      skillId: attack.skillId,
      source: {
        kind: attack.source.kind,
        id: attack.source.id,
      },
      damage: {
        value: attack.damage.value,
        type: attack.damage.type,
        authority: attack.damage.authority,
      },
      reach: attack.reach,
      range: attack.range,
      notes: attack.notes,
      status: "declared",
    })),
  };
}

function projectEquipment(equipment) {
  const totalsProjection = createEquipmentMvpProjection(
    resolveEquipmentTotals(equipment),
  );
  return {
    items: flattenEquipment(equipment),
    totals: {
      itemCount: totalsProjection.totals.itemCount,
      quantity: totalsProjection.totals.quantity,
      weightKg: totalsProjection.totals.weightKg,
      loadWeightKg: totalsProjection.totals.loadWeightKg,
      cost: totalsProjection.totals.cost,
      byState: totalsProjection.totals.byState,
      authority: "engine.equipment",
    },
  };
}

function projectMechanicalResults(report) {
  return {
    authority: report.authority,
    items: MECHANICAL_RESULT_IDS.map(resultId => {
      const result = report.results[resultId];
      return {
        id: result.id,
        label: result.label,
        value: result.value,
        source: result.source,
        status: result.status,
      };
    }),
  };
}

function flattenEquipment(equipment, parentId = null, depth = 0) {
  return equipment.flatMap(item => [
    {
      id: item.id,
      parentId,
      depth,
      kind: item.kind,
      containerKind: item.containerKind,
      name: item.name,
      quantity: item.quantity,
      weightKg: item.weightKg,
      cost: item.cost,
      state: item.state,
      uses: item.uses,
      maxUses: item.maxUses,
      notes: item.notes,
      status: "declared",
    },
    ...flattenEquipment(item.children, item.id, depth + 1),
  ]);
}

function projectMobileSections({
  traits,
  skills,
  techniques,
  languages,
  familiarities,
  attacks,
  equipment,
}) {
  return [
    { id: "identity", title: "Identidade", status: "available" },
    { id: "attributes", title: "Atributos", status: "available" },
    { id: "secondary-characteristics", title: "Secundários", status: "declared-only" },
    { id: "pools", title: "PV/PF atuais", status: "available" },
    {
      id: "traits",
      title: "Vantagens e Desvantagens",
      status: traits.length === 0 ? "empty" : "declared-only",
    },
    {
      id: "skills-techniques",
      title: "Perícias e Técnicas",
      status: skills.length === 0 && techniques.length === 0
        ? "empty"
        : "declared-only",
    },
    {
      id: "languages-culture",
      title: "Idiomas e Cultura",
      status: languages.length === 0 && familiarities.length === 0
        ? "empty"
        : "declared-only",
    },
    {
      id: "attacks",
      title: "Ataques",
      status: attacks.length === 0 ? "empty" : "declared-only",
    },
    {
      id: "equipment",
      title: "Equipamentos",
      status: equipment.length === 0 ? "empty" : "declared-only",
    },
  ];
}

function validateIdentityProjection(identity) {
  requirePlainObject(identity, "Mobile identity projection");
  requireString(identity.id, "Mobile identity id");
  requireString(identity.name, "Mobile identity name");
}

function validateAttributesProjection(attributes) {
  requirePlainObject(attributes, "Mobile attributes projection");
  for (const key of ATTRIBUTE_KEYS) {
    const attribute = attributes[key];
    requirePlainObject(attribute, `Mobile attribute projection ${key}`);
    if (attribute.key !== key) {
      throw new Error(`Mobile attribute projection ${key} key mismatch`);
    }
    if (!["resolved", "blocked"].includes(attribute.status)) {
      throw new Error(`Mobile attribute projection ${key} status is invalid`);
    }
    requireNullableFiniteNumber(attribute.level, `Mobile attribute projection ${key} level`);
    if (!["base", "override"].includes(attribute.source)) {
      throw new Error(`Mobile attribute projection ${key} source is invalid`);
    }
    if (!Array.isArray(attribute.diagnostics)) {
      throw new Error(`Mobile attribute projection ${key} diagnostics is invalid`);
    }
  }
}

function validateSecondaryCharacteristicsProjection(secondaryCharacteristics) {
  requirePlainObject(secondaryCharacteristics, "Mobile secondary characteristics projection");
  for (const key of SECONDARY_KEYS) {
    const characteristic = secondaryCharacteristics[key];
    requirePlainObject(characteristic, `Mobile secondary characteristic projection ${key}`);
    if (characteristic.key !== key) {
      throw new Error(`Mobile secondary characteristic projection ${key} key mismatch`);
    }
    if (characteristic.status !== "declared") {
      throw new Error(`Mobile secondary characteristic projection ${key} status is invalid`);
    }
    requireNullableFiniteNumber(
      characteristic.base,
      `Mobile secondary characteristic projection ${key} base`,
    );
    requireNullableFiniteNumber(
      characteristic.override,
      `Mobile secondary characteristic projection ${key} override`,
    );
  }
}

function validatePoolsProjection(pools) {
  requirePlainObject(pools, "Mobile pools projection");
  for (const key of Object.keys(pools)) {
    if (!POOL_KEYS.includes(key)) {
      throw new Error(`Mobile pool projection ${key} is invalid`);
    }
    const pool = pools[key];
    requirePlainObject(pool, `Mobile pool projection ${key}`);
    if (pool.key !== key) {
      throw new Error(`Mobile pool projection ${key} key mismatch`);
    }
    requireNullableFiniteNumber(pool.current, `Mobile pool projection ${key} current`);
    requireNullableFiniteNumber(pool.maximum, `Mobile pool projection ${key} maximum`);
  }
}

function validateTraitListProjection(traits) {
  requireArray(traits, "Mobile traits projection");
  for (const trait of traits) {
    requirePlainObject(trait, "Mobile trait projection");
    requireString(trait.id, "Mobile trait id");
    requireString(trait.name, "Mobile trait name");
    requireString(trait.role, `Mobile trait ${trait.id} role`);
    requireNullableFiniteNumber(trait.points, `Mobile trait ${trait.id} points`);
    requireNullableFiniteNumber(trait.levels, `Mobile trait ${trait.id} levels`);
    requireString(trait.status, "Mobile trait status");
  }
}

function validateSkillListProjection(skills) {
  requireArray(skills, "Mobile skills projection");
  for (const skill of skills) {
    requirePlainObject(skill, "Mobile skill projection");
    requireString(skill.id, "Mobile skill id");
    requireString(skill.name, "Mobile skill name");
    requireNullableString(skill.specialization, `Mobile skill ${skill.id} specialization`);
    requireNullableString(skill.techLevel, `Mobile skill ${skill.id} techLevel`);
    requireNullableString(skill.attribute, `Mobile skill ${skill.id} attribute`);
    requireNullableString(skill.difficulty, `Mobile skill ${skill.id} difficulty`);
    requireNullableFiniteNumber(skill.points, `Mobile skill ${skill.id} points`);
    requireNullableFiniteNumber(skill.importedLevel, `Mobile skill ${skill.id} importedLevel`);
    requireNullableFiniteNumber(
      skill.importedRelativeLevel,
      `Mobile skill ${skill.id} importedRelativeLevel`,
    );
    requireString(skill.status, "Mobile skill status");
  }
}

function validateTechniqueListProjection(techniques) {
  requireArray(techniques, "Mobile techniques projection");
  for (const technique of techniques) {
    requirePlainObject(technique, "Mobile technique projection");
    requireString(technique.id, "Mobile technique id");
    requireString(technique.name, "Mobile technique name");
    requireNullableString(technique.specialization, `Mobile technique ${technique.id} specialization`);
    requireNullableString(technique.skillId, `Mobile technique ${technique.id} skillId`);
    requireNullableString(technique.skillName, `Mobile technique ${technique.id} skillName`);
    requireNullableString(
      technique.skillSpecialization,
      `Mobile technique ${technique.id} skillSpecialization`,
    );
    requireNullableString(technique.difficulty, `Mobile technique ${technique.id} difficulty`);
    requireNullableFiniteNumber(technique.points, `Mobile technique ${technique.id} points`);
    requireNullableFiniteNumber(
      technique.importedLevel,
      `Mobile technique ${technique.id} importedLevel`,
    );
    requireNullableFiniteNumber(
      technique.importedRelativeLevel,
      `Mobile technique ${technique.id} importedRelativeLevel`,
    );
    requireNullableFiniteNumber(
      technique.defaultPenalty,
      `Mobile technique ${technique.id} defaultPenalty`,
    );
    requireNullableFiniteNumber(
      technique.maximumRelativeLevel,
      `Mobile technique ${technique.id} maximumRelativeLevel`,
    );
    requireString(technique.status, "Mobile technique status");
  }
}

function validateLanguageListProjection(languages) {
  requireArray(languages, "Mobile languages projection");
  const ids = new Set();
  for (const language of languages) {
    requirePlainObject(language, "Mobile language projection");
    requireString(language.id, "Mobile language id");
    if (ids.has(language.id)) throw new Error("Mobile language ids must be unique");
    ids.add(language.id);
    requireText(language.name, `Mobile language ${language.id} name`);
    if (!LANGUAGE_LEVELS.includes(language.spokenLevel)) {
      throw new Error(`Mobile language ${language.id} spokenLevel is invalid`);
    }
    if (!LANGUAGE_LEVELS.includes(language.writtenLevel)) {
      throw new Error(`Mobile language ${language.id} writtenLevel is invalid`);
    }
    requireBoolean(language.isNative, `Mobile language ${language.id} isNative`);
    requireNullableFiniteNumber(
      language.importedCost,
      `Mobile language ${language.id} importedCost`,
    );
    requireNullableString(language.reference, `Mobile language ${language.id} reference`);
    requireText(language.notes, `Mobile language ${language.id} notes`);
    if (language.status !== "declared") {
      throw new Error(`Mobile language ${language.id} status is invalid`);
    }
  }
}

function validateFamiliarityListProjection(familiarities) {
  requireArray(familiarities, "Mobile familiarities projection");
  const ids = new Set();
  for (const familiarity of familiarities) {
    requirePlainObject(familiarity, "Mobile familiarity projection");
    requireString(familiarity.id, "Mobile familiarity id");
    if (ids.has(familiarity.id)) {
      throw new Error("Mobile familiarity ids must be unique");
    }
    ids.add(familiarity.id);
    requireText(familiarity.name, `Mobile familiarity ${familiarity.id} name`);
    requireBoolean(familiarity.isNative, `Mobile familiarity ${familiarity.id} isNative`);
    requireNullableFiniteNumber(
      familiarity.importedCost,
      `Mobile familiarity ${familiarity.id} importedCost`,
    );
    requireNullableString(
      familiarity.reference,
      `Mobile familiarity ${familiarity.id} reference`,
    );
    requireText(familiarity.notes, `Mobile familiarity ${familiarity.id} notes`);
    if (familiarity.status !== "declared") {
      throw new Error(`Mobile familiarity ${familiarity.id} status is invalid`);
    }
  }
}

function validateAttackProjection(attacks, expectedCharacterId) {
  requirePlainObject(attacks, "Mobile attacks projection");
  requireString(attacks.characterId, "Mobile attacks characterId");
  if (attacks.characterId !== expectedCharacterId) {
    throw new Error("Mobile attacks projection belongs to another Character");
  }
  if (attacks.authority !== "application.attack-read-projection") {
    throw new Error("Mobile attacks projection authority is invalid");
  }
  requireArray(attacks.items, "Mobile attacks projection items");

  const ids = new Set();
  for (const attack of attacks.items) {
    requirePlainObject(attack, "Mobile attack projection");
    requireString(attack.id, "Mobile attack id");
    if (ids.has(attack.id)) throw new Error("Mobile attack ids must be unique");
    ids.add(attack.id);
    requireText(attack.name, `Mobile attack ${attack.id} name`);
    if (!ATTACK_CATEGORIES.includes(attack.category)) {
      throw new Error(`Mobile attack ${attack.id} category is invalid`);
    }
    requireNullableString(attack.skillId, `Mobile attack ${attack.id} skillId`);
    requirePlainObject(attack.source, `Mobile attack ${attack.id} source`);
    if (!ATTACK_SOURCE_KINDS.includes(attack.source.kind)) {
      throw new Error(`Mobile attack ${attack.id} source kind is invalid`);
    }
    requireNullableString(attack.source.id, `Mobile attack ${attack.id} source id`);
    requirePlainObject(attack.damage, `Mobile attack ${attack.id} damage`);
    requireText(attack.damage.value, `Mobile attack ${attack.id} damage value`);
    requireText(attack.damage.type, `Mobile attack ${attack.id} damage type`);
    if (attack.damage.authority !== "declared") {
      throw new Error(`Mobile attack ${attack.id} damage authority is invalid`);
    }
    requireNullableString(attack.reach, `Mobile attack ${attack.id} reach`);
    requireNullableString(attack.range, `Mobile attack ${attack.id} range`);
    requireText(attack.notes, `Mobile attack ${attack.id} notes`);
    if (attack.status !== "declared") {
      throw new Error(`Mobile attack ${attack.id} status is invalid`);
    }
  }
}

function validateEquipmentProjection(equipment) {
  requirePlainObject(equipment, "Mobile equipment projection");
  requireArray(equipment.items, "Mobile equipment projection items");
  requirePlainObject(equipment.totals, "Mobile equipment projection totals");
  requireNonNegativeFiniteNumber(equipment.totals.itemCount, "Mobile equipment total itemCount");
  requireNonNegativeFiniteNumber(equipment.totals.quantity, "Mobile equipment total quantity");
  requireNonNegativeFiniteNumber(equipment.totals.weightKg, "Mobile equipment total weightKg");
  requireNonNegativeFiniteNumber(equipment.totals.loadWeightKg, "Mobile equipment total loadWeightKg");
  requireNonNegativeFiniteNumber(equipment.totals.cost, "Mobile equipment total cost");
  requirePlainObject(equipment.totals.byState, "Mobile equipment totals byState");
  for (const state of EQUIPMENT_STATES) {
    validateEquipmentStateTotals(equipment.totals.byState[state], state);
  }
  if (equipment.totals.authority !== "engine.equipment") {
    throw new Error("Mobile equipment totals authority is invalid");
  }

  const ids = new Set();
  for (const item of equipment.items) {
    requirePlainObject(item, "Mobile equipment item projection");
    requireString(item.id, "Mobile equipment item id");
    if (ids.has(item.id)) throw new Error("Mobile equipment item ids must be unique");
    ids.add(item.id);
    requireNullableString(item.parentId, `Mobile equipment ${item.id} parentId`);
    if (!Number.isInteger(item.depth) || item.depth < 0) {
      throw new Error(`Mobile equipment ${item.id} depth must be non-negative integer`);
    }
    requireString(item.kind, `Mobile equipment ${item.id} kind`);
    requireNullableString(item.containerKind, `Mobile equipment ${item.id} containerKind`);
    requireText(item.name, `Mobile equipment ${item.id} name`);
    requireNonNegativeFiniteNumber(item.quantity, `Mobile equipment ${item.id} quantity`);
    requireNonNegativeFiniteNumber(item.weightKg, `Mobile equipment ${item.id} weightKg`);
    requireNonNegativeFiniteNumber(item.cost, `Mobile equipment ${item.id} cost`);
    requireString(item.state, `Mobile equipment ${item.id} state`);
    requireNullableNonNegativeFiniteNumber(item.uses, `Mobile equipment ${item.id} uses`);
    requireNullableNonNegativeFiniteNumber(item.maxUses, `Mobile equipment ${item.id} maxUses`);
    requireText(item.notes, `Mobile equipment ${item.id} notes`);
    requireString(item.status, `Mobile equipment ${item.id} status`);
  }
}

function validateEquipmentStateTotals(totals, state) {
  requirePlainObject(totals, `Mobile equipment totals byState ${state}`);
  requireNonNegativeFiniteNumber(totals.itemCount, `Mobile equipment ${state} itemCount`);
  requireNonNegativeFiniteNumber(totals.quantity, `Mobile equipment ${state} quantity`);
  requireNonNegativeFiniteNumber(totals.weightKg, `Mobile equipment ${state} weightKg`);
  requireNonNegativeFiniteNumber(totals.loadWeightKg, `Mobile equipment ${state} loadWeightKg`);
  requireNonNegativeFiniteNumber(totals.cost, `Mobile equipment ${state} cost`);
}

function validateMechanicalResultsProjection(mechanicalResults) {
  requirePlainObject(mechanicalResults, "Mobile mechanical results projection");
  if (mechanicalResults.authority !== "engine.derived-defense-movement") {
    throw new Error("Mobile mechanical results authority is invalid");
  }
  requireArray(mechanicalResults.items, "Mobile mechanical results items");
  const ids = new Set();
  for (const item of mechanicalResults.items) {
    requirePlainObject(item, "Mobile mechanical result item");
    if (!MECHANICAL_RESULT_IDS.includes(item.id)) {
      throw new Error(`Mobile mechanical result ${item.id} is invalid`);
    }
    if (ids.has(item.id)) throw new Error("Mobile mechanical result ids must be unique");
    ids.add(item.id);
    requireString(item.label, `Mobile mechanical result ${item.id} label`);
    requireNullableFiniteNumber(item.value, `Mobile mechanical result ${item.id} value`);
    if (!["secondary", "attributes"].includes(item.source)) {
      throw new Error(`Mobile mechanical result ${item.id} source is invalid`);
    }
    if (!["resolved", "blocked"].includes(item.status)) {
      throw new Error(`Mobile mechanical result ${item.id} status is invalid`);
    }
    if (item.status === "resolved" && item.value === null) {
      throw new Error(`Mobile mechanical result ${item.id} resolved value is invalid`);
    }
    if (item.status === "blocked" && item.value !== null) {
      throw new Error(`Mobile mechanical result ${item.id} blocked value is invalid`);
    }
  }
  if (MECHANICAL_RESULT_IDS.some(id => !ids.has(id))) {
    throw new Error("Mobile mechanical results must include defense and movement results");
  }
}

function validateSectionsProjection(sections) {
  requireArray(sections, "Mobile sections projection");
  for (const section of sections) {
    requirePlainObject(section, "Mobile section projection");
    requireString(section.id, "Mobile section id");
    requireString(section.title, "Mobile section title");
    requireString(section.status, "Mobile section status");
  }
}

function requirePlainObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireText(value, label) {
  if (typeof value !== "string") throw new Error(`${label} must be a string`);
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
}

function requireNullableString(value, label) {
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be a string or null`);
  }
}

function requireNullableFiniteNumber(value, label) {
  if (value !== null && !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number or null`);
  }
}

function requireNonNegativeFiniteNumber(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative finite number`);
  }
}

function requireNullableNonNegativeFiniteNumber(value, label) {
  if (value !== null) requireNonNegativeFiniteNumber(value, label);
}

function deepFreezeMobileProjection(value) {
  if (!value || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreezeMobileProjection(child);
  return value;
}
