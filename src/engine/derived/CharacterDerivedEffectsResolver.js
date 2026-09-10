import { validateAttributes } from "../../domain/character/Attributes.js";
import { validateTraits } from "../../domain/character/Traits.js";
import { validateSkills } from "../../domain/character/Skills.js";
import { validateSecondaryCharacteristics } from "../../domain/character/SecondaryCharacteristics.js";

const ATTRIBUTE_KEYS = Object.freeze(["ST", "DX", "IQ", "HT"]);
const SECONDARY_KEYS = Object.freeze(["HP", "FP", "Will", "Per", "BasicSpeed", "BasicMove"]);

export function resolveCharacterDerivedEffects(input = {}) {
  const attributes = input.attributes;
  const traits = input.traits ?? [];
  const secondaryCharacteristics = input.secondaryCharacteristics;
  const skills = input.skills ?? [];

  validateAttributes(attributes);
  validateTraits(traits);
  validateSecondaryCharacteristics(secondaryCharacteristics);
  validateSkills(skills);

  const attributeBonuses = collectAttributeBonuses(traits);
  const attributesReport = resolveAttributes(attributes, attributeBonuses);
  const secondaryBonuses = collectSecondaryBonuses(traits);
  const secondaryReport = resolveSecondaries({
    secondaryCharacteristics,
    attributesReport,
    secondaryBonuses,
  });
  const defenses = resolveCombatDefenses(skills);

  return deepFreeze({
    schemaVersion: 1,
    authority: "engine.character-derived-effects",
    attributes: attributesReport,
    secondaryCharacteristics: secondaryReport,
    defenses,
  });
}

function collectAttributeBonuses(traits) {
  const totals = Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, 0]));
  const sources = Object.fromEntries(ATTRIBUTE_KEYS.map(key => [key, []]));

  for (const trait of traits) {
    collectFeatures(trait, trait.features, trait.id, trait.name, totals, sources);
    for (const modifier of trait.modifiers ?? []) {
      collectFeatures(trait, modifier?.features, trait.id, trait.name, totals, sources, modifier?.id ?? null);
    }
  }

  return { totals, sources };
}

function collectFeatures(trait, features, traitId, traitName, totals, sources, modifierId = null) {
  for (const feature of features ?? []) {
    if (!feature || typeof feature !== "object") continue;
    if (feature.type !== "attribute_bonus" && feature.type !== "attribute_modifier") continue;
    const attribute = normalizeAttributeKey(feature.attribute);
    const amount = finiteNumber(feature.amount);
    if (!attribute || amount === null) continue;
    totals[attribute] += amount;
    sources[attribute].push({
      kind: "trait",
      id: traitId,
      name: traitName,
      modifierId,
      amount,
      featureType: feature.type,
    });
  }
}

function collectSecondaryBonuses(traits) {
  const totals = Object.fromEntries(SECONDARY_KEYS.map(key => [key, 0]));
  const sources = Object.fromEntries(SECONDARY_KEYS.map(key => [key, []]));

  for (const trait of traits) {
    const features = [
      ...(trait.features ?? []),
      ...(trait.modifiers ?? []).flatMap(modifier => modifier?.features ?? []),
    ];
    for (const feature of features) {
      if (!feature || typeof feature !== "object") continue;
      if (feature.type !== "secondary_bonus" && feature.type !== "secondary_modifier") continue;
      const key = normalizeSecondaryKey(feature.characteristic ?? feature.secondary ?? feature.key);
      const amount = finiteNumber(feature.amount);
      if (!key || amount === null) continue;
      totals[key] += amount;
      sources[key].push({
        kind: "trait",
        id: trait.id,
        name: trait.name,
        amount,
        featureType: feature.type,
      });
    }
  }
  return { totals, sources };
}

function resolveAttributes(attributes, bonuses) {
  const results = {};
  for (const key of ATTRIBUTE_KEYS) {
    const declared = attributes[key];
    const bonus = bonuses.totals[key];
    const source = bonuses.sources[key];
    const final = Number.isFinite(declared.override)
      ? declared.override
      : declared.base + bonus;
    results[key] = {
      key,
      base: declared.base,
      override: declared.override,
      bonus,
      level: final,
      sources: source,
    };
  }
  return { results, totals: bonuses.totals, sources: bonuses.sources };
}

function resolveSecondaries({ secondaryCharacteristics, attributesReport, secondaryBonuses }) {
  const a = attributesReport.results;
  const results = {};
  for (const key of SECONDARY_KEYS) {
    const declared = secondaryCharacteristics[key];
    const explicitBonus = secondaryBonuses.totals[key];
    const sources = [...secondaryBonuses.sources[key]];
    let base = declared.base;
    let bonus = explicitBonus;
    let final = Number.isFinite(declared.override) ? declared.override : null;

    if (final === null) {
      if (key === "HP") {
        base = declared.base ?? a.ST.base;
        bonus = explicitBonus + (a.ST.bonus);
        if (a.ST.bonus !== 0) sources.push({ kind: "attribute", id: "ST", name: "ST", amount: a.ST.bonus });
        final = (declared.base ?? a.ST.base) + bonus;
      } else if (key === "FP") {
        base = declared.base ?? a.HT.base;
        bonus = explicitBonus + a.HT.bonus;
        if (a.HT.bonus !== 0) sources.push({ kind: "attribute", id: "HT", name: "HT", amount: a.HT.bonus });
        final = (declared.base ?? a.HT.base) + bonus;
      } else if (key === "Will") {
        base = declared.base ?? a.IQ.base;
        bonus = explicitBonus + a.IQ.bonus;
        if (a.IQ.bonus !== 0) sources.push({ kind: "attribute", id: "IQ", name: "IQ", amount: a.IQ.bonus });
        final = (declared.base ?? a.IQ.base) + bonus;
      } else if (key === "Per") {
        base = declared.base ?? a.IQ.base;
        bonus = explicitBonus + a.IQ.bonus;
        if (a.IQ.bonus !== 0) sources.push({ kind: "attribute", id: "IQ", name: "IQ", amount: a.IQ.bonus });
        final = (declared.base ?? a.IQ.base) + bonus;
      } else if (key === "BasicSpeed") {
        base = declared.base ?? ((a.DX.base + a.HT.base) / 4);
        bonus = explicitBonus + ((a.DX.bonus + a.HT.bonus) / 4);
        if (a.DX.bonus !== 0) sources.push({ kind: "attribute", id: "DX", name: "DX", amount: a.DX.bonus / 4 });
        if (a.HT.bonus !== 0) sources.push({ kind: "attribute", id: "HT", name: "HT", amount: a.HT.bonus / 4 });
        final = (declared.base ?? ((a.DX.base + a.HT.base) / 4)) + bonus;
      } else if (key === "BasicMove") {
        const speed = Number.isFinite(secondaryCharacteristics.BasicMove.base)
          ? secondaryCharacteristics.BasicMove.base
          : Math.floor((a.DX.level + a.HT.level) / 4);
        base = speed;
        final = speed + explicitBonus;
      }
    }

    results[key] = { key, base, override: declared.override, bonus, final, sources };
  }
  return { results, totals: secondaryBonuses.totals, sources: secondaryBonuses.sources };
}

function resolveCombatDefenses(skills) {
  const parrySources = [];
  const blockSources = [];
  let parry = null;
  let block = null;

  for (const skill of skills) {
    const level = finiteNumber(skill.importedLevel);
    if (level === null) continue;
    const normalizedName = normalizeText(skill.name);
    const tags = (skill.tags ?? []).map(normalizeText);
    const isShield = normalizedName === "escudo" || normalizedName === "shield" || tags.includes("shield");
    const isCloak = normalizedName === "capa" || normalizedName === "cloak" || tags.includes("cloak");
    const isMelee = tags.includes("melee") || tags.includes("combat") || tags.includes("unarmed") || (skill.weapons ?? []).some(weapon => normalizeText(weapon?.category) === "melee");

    if (isShield || isCloak) {
      const value = Math.floor(level / 2) + 3;
      block = block === null ? value : Math.max(block, value);
      blockSources.push({ skillId: skill.id, name: skill.name, level, value });
    }
    if (isMelee) {
      const value = Math.floor(level / 2) + 3;
      parry = parry === null ? value : Math.max(parry, value);
      parrySources.push({ skillId: skill.id, name: skill.name, level, value });
    }
  }

  return {
    parry: { value: parry, sources: parrySources },
    block: { value: block, sources: blockSources },
  };
}

function normalizeAttributeKey(value) {
  return ATTRIBUTE_KEYS.includes(value) ? value : null;
}

function normalizeSecondaryKey(value) {
  return SECONDARY_KEYS.includes(value) ? value : null;
}

function finiteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}
