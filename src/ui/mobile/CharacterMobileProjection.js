import { serializeCharacter } from "../../domain/character/Character.js";
import {
  resolveAttributeLevels,
  serializeAttributeLevelsReport,
} from "../../engine/attributes/AttributeLevelResolver.js";

const MOBILE_PROJECTION_SCHEMA_VERSION = 1;
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
    sections: projectMobileSections(),
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

function projectMobileSections() {
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
      status: "pending",
    },
    {
      id: "skills-techniques",
      title: "Perícias e Técnicas",
      status: "pending",
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
    if (attribute.level !== null && typeof attribute.level !== "number") {
      throw new Error(`Mobile attribute projection ${key} level is invalid`);
    }
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
    requireNullableNumber(
      characteristic.base,
      `Mobile secondary characteristic projection ${key} base`,
    );
    requireNullableNumber(
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
    requireNullableNumber(pool.current, `Mobile pool projection ${key} current`);
    requireNullableNumber(pool.maximum, `Mobile pool projection ${key} maximum`);
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

function requireNullableNumber(value, label) {
  if (value !== null && typeof value !== "number") {
    throw new Error(`${label} must be a number or null`);
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
