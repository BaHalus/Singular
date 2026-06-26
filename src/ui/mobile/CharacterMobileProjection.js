import { serializeCharacter } from "../../domain/character/Character.js";
import {
  resolveAttributeLevels,
  serializeAttributeLevelsReport,
} from "../../engine/attributes/AttributeLevelResolver.js";

const MOBILE_PROJECTION_SCHEMA_VERSION = 2;
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
const TRAIT_ROLES = Object.freeze([
  "advantage",
  "perk",
  "disadvantage",
  "quirk",
]);

/**
 * Projeta um Character canônico para o primeiro esqueleto da ficha mobile.
 *
 * Esta camada não calcula regras de GURPS. Ela serializa o Character, consome
 * resultados já fornecidos pelo motor e organiza dados para apresentação.
 */
export function projectCharacterForMobileSheet(character) {
  const serializedCharacter = serializeCharacter(character);
  const attributeLevels = serializeAttributeLevelsReport(
    resolveAttributeLevels(serializedCharacter.attributes),
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
    sections: projectMobileSections({
      traits: serializedCharacter.traits,
      skills: serializedCharacter.skills,
      techniques: serializedCharacter.techniques,
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
  validateSecondaryCharacteristicsProjection(
    projection.secondaryCharacteristics,
  );
  validatePoolsProjection(projection.pools);
  validateTraitListProjection(projection.traits);
  validateSkillListProjection(projection.skills);
  validateTechniqueListProjection(projection.techniques);
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
      return [
        attributeKey,
        {
          key: attributeKey,
          status: result.status,
          level: result.level,
          source: result.source,
          diagnostics: result.diagnostics,
        },
      ];
    }),
  );
}

function projectSecondaryCharacteristics(secondaryCharacteristics) {
  return Object.fromEntries(
    SECONDARY_KEYS.map(key => {
      const characteristic = secondaryCharacteristics[key];
      return [
        key,
        {
          key,
          status: "declared",
          base: characteristic.base,
          override: characteristic.override,
        },
      ];
    }),
  );
}

function projectPools(pools) {
  return Object.fromEntries(
    POOL_KEYS
      .filter(key => pools[key] !== undefined)
      .map(key => [
        key,
        {
          key,
          current: pools[key].current,
          maximum: pools[key].maximum,
        },
      ]),
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

function projectMobileSections({ traits, skills, techniques }) {
  return [
    {
      id: "identity",
      title: "Identidade",
      status: "available",
    },
    {
      id: "attributes",
      title: "Atributos",
      status: "available",
    },
    {
      id: "secondary-characteristics",
      title: "Secundários",
      status: "declared-only",
    },
    {
      id: "pools",
      title: "PV/PF atuais",
      status: "available",
    },
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
      id: "equipment",
      title: "Equipamentos",
      status: "external-front",
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
    requireNullableFiniteNumber(
      attribute.level,
      `Mobile attribute projection ${key} level`,
    );
    if (!["base", "override"].includes(attribute.source)) {
      throw new Error(`Mobile attribute projection ${key} source is invalid`);
    }
    if (!Array.isArray(attribute.diagnostics)) {
      throw new Error(`Mobile attribute projection ${key} diagnostics is invalid`);
    }
  }
}

function validateSecondaryCharacteristicsProjection(secondaryCharacteristics) {
  requirePlainObject(
    secondaryCharacteristics,
    "Mobile secondary characteristics projection",
  );

  for (const key of SECONDARY_KEYS) {
    const characteristic = secondaryCharacteristics[key];
    requirePlainObject(
      characteristic,
      `Mobile secondary characteristic projection ${key}`,
    );
    if (characteristic.key !== key) {
      throw new Error(
        `Mobile secondary characteristic projection ${key} key mismatch`,
      );
    }
    if (characteristic.status !== "declared") {
      throw new Error(
        `Mobile secondary characteristic projection ${key} status is invalid`,
      );
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
    requireNullableFiniteNumber(
      pool.current,
      `Mobile pool projection ${key} current`,
    );
    requireNullableFiniteNumber(
      pool.maximum,
      `Mobile pool projection ${key} maximum`,
    );
  }
}

function validateTraitListProjection(traits) {
  if (!Array.isArray(traits)) {
    throw new Error("Mobile traits projection must be an array");
  }

  for (const trait of traits) {
    requirePlainObject(trait, "Mobile trait projection");
    requireString(trait.id, "Mobile trait id");
    requireString(trait.name, "Mobile trait name");
    if (!TRAIT_ROLES.includes(trait.role)) {
      throw new Error(`Mobile trait ${trait.id} role is invalid`);
    }
    requireNullableFiniteNumber(trait.points, `Mobile trait ${trait.id} points`);
    requireNullableFiniteNumber(trait.levels, `Mobile trait ${trait.id} levels`);
    requireString(trait.status, "Mobile trait status");
  }
}

function validateSkillListProjection(skills) {
  if (!Array.isArray(skills)) {
    throw new Error("Mobile skills projection must be an array");
  }

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
  if (!Array.isArray(techniques)) {
    throw new Error("Mobile techniques projection must be an array");
  }

  for (const technique of techniques) {
    requirePlainObject(technique, "Mobile technique projection");
    requireString(technique.id, "Mobile technique id");
    requireString(technique.name, "Mobile technique name");
    requireNullableString(
      technique.specialization,
      `Mobile technique ${technique.id} specialization`,
    );
    requireNullableString(technique.skillId, `Mobile technique ${technique.id} skillId`);
    requireNullableString(technique.skillName, `Mobile technique ${technique.id} skillName`);
    requireNullableString(
      technique.skillSpecialization,
      `Mobile technique ${technique.id} skillSpecialization`,
    );
    requireNullableString(
      technique.difficulty,
      `Mobile technique ${technique.id} difficulty`,
    );
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

function validateSectionsProjection(sections) {
  if (!Array.isArray(sections)) {
    throw new Error("Mobile sections projection must be an array");
  }

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

function requireString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
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

function deepFreezeMobileProjection(value) {
  if (!value || typeof value !== "object") return value;
  Object.freeze(value);
  for (const child of Object.values(value)) {
    deepFreezeMobileProjection(child);
  }
  return value;
}
