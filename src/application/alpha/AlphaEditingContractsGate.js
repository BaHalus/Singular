import { listAlphaCommandCatalogTypes } from "./AlphaCommandCatalog.js";

export const ALPHA_EDITING_CONTRACTS_GATE_VERSION = "GATE-ALPHA-EDITING-CONTRACTS-1.0";

export const ALPHA_EDITING_CONTRACT_FAMILIES = Object.freeze([
  Object.freeze({
    family: "Pools",
    types: Object.freeze([
      "pool.current.set",
      "pool.current.adjust",
      "pool.current.reset-to-maximum",
      "pool.maximum.set",
    ]),
    authority: "ApplicationSession and pool domain operations",
    boundary: "Current pool commands are transient session state; maximum changes are structural only when domain authority exists.",
  }),
  Object.freeze({
    family: "Identity and attributes",
    types: Object.freeze([
      "character.summary.set",
      "attribute.base.adjust",
    ]),
    authority: "Character summary and attribute application handlers",
    boundary: "Primary attribute edits are command-driven; derived GURPS values remain outside the application layer.",
  }),
  Object.freeze({
    family: "Attacks",
    types: Object.freeze([
      "attack.add",
      "attack.update",
      "attack.remove",
      "attack.reorder",
    ]),
    authority: "Attack domain operations and projections",
    boundary: "Attack payloads are portable records; damage, reach and derived mechanics are not recalculated in application commands.",
  }),
  Object.freeze({
    family: "Equipment",
    types: Object.freeze([
      "equipment.add",
      "equipment.add-child",
      "equipment.update",
      "equipment.rename",
      "equipment.quantity.set",
      "equipment.state.set",
      "equipment.remove",
      "equipment.move",
      "equipment.reorder",
      "equipment.modifier.add",
      "equipment.modifier.edit",
      "equipment.modifier.remove",
      "equipment.modifier.reorder",
      "equipment.modifier.enabled.set",
    ]),
    authority: "Equipment domain operations and projections",
    boundary: "Quantities, portable state and placement are structural; load math stays in the canonical engine/projection boundary.",
  }),
  Object.freeze({
    family: "Spells",
    types: Object.freeze([
      "spell.add",
      "spell.update",
      "spell.remove",
      "spell.reorder",
    ]),
    authority: "Spell domain operations and projections",
    boundary: "Spell attributes, difficulty, points and imported values are preserved; NH and derived values are not calculated here.",
  }),
  Object.freeze({
    family: "Powers",
    types: Object.freeze([
      "power.add",
      "power.update",
      "power.reorder",
      "power.rename",
      "power.source.set",
      "power.modifier.set",
      "power.talentTrait.set",
      "power.notes.update",
      "power.memberTrait.add",
      "power.memberTrait.remove",
      "power.tag.add",
      "power.tag.remove",
      "power.remove",
    ]),
    authority: "Power application handlers and domain validation",
    boundary: "Power composition metadata is preserved; no advantage library or point-cost calculation is introduced.",
  }),
  Object.freeze({
    family: "Traits",
    types: Object.freeze([
      "trait.add",
      "trait.update",
      "trait.remove",
      "trait.reorder",
      "trait.modifier.add",
      "trait.modifier.edit",
      "trait.modifier.remove",
      "trait.modifier.reorder",
      "trait.modifier.enabled.set",
      "trait.cost-basis.mode.set",
      "trait.cost-basis.base-points.set",
      "trait.cost-basis.points-per-level.set",
      "trait.cost-basis.levels.set",
    ]),
    authority: "Trait domain operations and point-value authority fields",
    boundary: "Role, source, pointValue, modifiers and metadata are portable; the application does not calculate trait cost.",
  }),
  Object.freeze({
    family: "Skills and Techniques",
    types: Object.freeze([
      "skill.add",
      "skill.update",
      "skill.remove",
      "skill.reorder",
      "technique.add",
      "technique.update",
      "technique.remove",
      "technique.reorder",
    ]),
    authority: "Skill and Technique domain operations",
    boundary: "Difficulty, attribute, points, defaults and imported values are preserved; NH and progression are not calculated here.",
  }),
  Object.freeze({
    family: "Languages and Familiarities",
    types: Object.freeze([
      "language.add",
      "language.update",
      "language.remove",
      "language.reorder",
      "familiarity.add",
      "familiarity.update",
      "familiarity.remove",
      "familiarity.reorder",
    ]),
    authority: "Language and Familiarity domain operations",
    boundary: "Speech, writing, nativity, culture, reference, notes and imported values are preserved; costs are not inferred.",
  }),
  Object.freeze({
    family: "Secondary structural fields",
    types: Object.freeze([
      "secondary.base.set",
      "secondary.override.set",
      "secondary.override.clear",
    ]),
    authority: "SecondaryCharacteristics domain authority",
    boundary: "Only declared editable structural fields are commanded; Dodge remains a documented projection gap until canonical authority exists.",
  }),
  Object.freeze({
    family: "Notes",
    types: Object.freeze([
      "notes.general.set",
      "note.add",
      "note.update",
      "note.remove",
      "note.reorder",
    ]),
    authority: "Notes domain operations",
    boundary: "Plain text and order are preserved; rich text, attachments and note libraries are out of scope.",
  }),
]);

export function createAlphaEditingContractsGateManifest() {
  const catalogTypes = listAlphaCommandCatalogTypes();
  const familyTypes = ALPHA_EDITING_CONTRACT_FAMILIES.flatMap(family => [...family.types]);
  const missingFromCatalog = familyTypes.filter(type => !catalogTypes.includes(type));
  const missingFromFamilies = catalogTypes.filter(type => !familyTypes.includes(type));
  const duplicateTypes = findDuplicates(familyTypes);

  return deepFreeze({
    version: ALPHA_EDITING_CONTRACTS_GATE_VERSION,
    catalogTypes,
    families: ALPHA_EDITING_CONTRACT_FAMILIES.map(family => ({
      family: family.family,
      types: [...family.types],
      authority: family.authority,
      boundary: family.boundary,
    })),
    checks: {
      commandExecutorCanonical: true,
      applicationSessionCanonical: true,
      roundtripJsonRequired: true,
      stableIdsRequired: true,
      invalidPayloadRejectionRequired: true,
      noApplicationGurpsCalculation: true,
    },
    coverage: {
      missingFromCatalog,
      missingFromFamilies,
      duplicateTypes,
      complete: missingFromCatalog.length === 0 &&
        missingFromFamilies.length === 0 &&
        duplicateTypes.length === 0,
    },
  });
}

export function validateAlphaEditingContractsGateManifest(manifest = createAlphaEditingContractsGateManifest()) {
  requirePlainObject(manifest, "Alpha editing contracts gate manifest");
  if (manifest.version !== ALPHA_EDITING_CONTRACTS_GATE_VERSION) {
    throw new Error("Alpha editing contracts gate version is invalid");
  }
  requirePlainObject(manifest.checks, "Alpha editing contracts gate checks");
  requirePlainObject(manifest.coverage, "Alpha editing contracts gate coverage");
  if (manifest.coverage.complete !== true) {
    throw new Error("Alpha editing contracts gate catalog coverage is incomplete");
  }
  if (!Array.isArray(manifest.catalogTypes) || manifest.catalogTypes.length === 0) {
    throw new Error("Alpha editing contracts gate catalogTypes must be a non-empty array");
  }
  if (!Array.isArray(manifest.families) || manifest.families.length === 0) {
    throw new Error("Alpha editing contracts gate families must be a non-empty array");
  }

  for (const [name, value] of Object.entries(manifest.checks)) {
    if (value !== true) {
      throw new Error(`Alpha editing contracts gate check failed: ${name}`);
    }
  }

  return true;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
