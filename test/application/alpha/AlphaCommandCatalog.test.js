import test from "node:test";
import assert from "node:assert/strict";

import {
  createCommandRegistry,
  listCommandTypes,
  resolveCommandHandler,
} from "../../src/application/commands/CommandRegistry.js";
import {
  ALPHA_COMMAND_CATALOG_VERSION,
  createAlphaCommandCatalogEntries,
  listAlphaCommandCatalogTypes,
  validateAlphaCommandCatalogEntries,
} from "../../src/application/alpha/AlphaCommandCatalog.js";

const EXPECTED_ALPHA_COMMAND_TYPES = Object.freeze([
  "pool.current.set",
  "pool.current.adjust",
  "pool.current.reset-to-maximum",
  "attack.add",
  "attack.update",
  "attack.remove",
  "attack.reorder",
  "equipment.add",
  "equipment.add-child",
  "equipment.update",
  "equipment.rename",
  "equipment.quantity.set",
  "equipment.state.set",
  "equipment.remove",
  "equipment.move",
  "equipment.reorder",
  "spell.add",
  "spell.update",
  "spell.remove",
  "spell.reorder",
  "power.add",
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
  "trait.add",
  "trait.update",
  "trait.remove",
  "trait.reorder",
  "skill.add",
  "skill.update",
  "skill.remove",
  "skill.reorder",
  "technique.add",
  "technique.update",
  "technique.remove",
  "technique.reorder",
  "language.add",
  "language.update",
  "language.remove",
  "language.reorder",
  "familiarity.add",
  "familiarity.update",
  "familiarity.remove",
  "familiarity.reorder",
  "secondary.base.set",
  "secondary.override.set",
  "secondary.override.clear",
  "pool.maximum.set",
  "notes.general.set",
  "note.add",
  "note.update",
  "note.remove",
  "note.reorder",
]);

test("exposes the APP-ALPHA-COMMAND-CATALOG 1.0 version marker", () => {
  assert.equal(ALPHA_COMMAND_CATALOG_VERSION, "APP-ALPHA-COMMAND-CATALOG-1.0");
});

test("builds an immutable Alpha catalog with only integrated command handler entries", () => {
  const entries = createAlphaCommandCatalogEntries();

  assert.equal(Object.isFrozen(entries), true);
  assert.equal(entries.length, EXPECTED_ALPHA_COMMAND_TYPES.length);
  assert.deepEqual(entries.map(entry => entry.type), EXPECTED_ALPHA_COMMAND_TYPES);
  assert.equal(entries.every(entry => Object.isFrozen(entry)), true);
  assert.equal(entries.every(entry => typeof entry.handler === "function"), true);
});

test("lists Alpha command types without exposing handlers", () => {
  assert.deepEqual(listAlphaCommandCatalogTypes(), EXPECTED_ALPHA_COMMAND_TYPES);
});

test("can be consumed by the canonical CommandRegistry without changing composition", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());

  assert.deepEqual(listCommandTypes(registry), EXPECTED_ALPHA_COMMAND_TYPES);
  assert.equal(typeof resolveCommandHandler(registry, "trait.add"), "function");
  assert.equal(typeof resolveCommandHandler(registry, "skill.add"), "function");
  assert.equal(typeof resolveCommandHandler(registry, "notes.general.set"), "function");
  assert.equal(resolveCommandHandler(registry, "not-alpha.command"), null);
});

test("detects duplicate command types before registry composition", () => {
  const entries = createAlphaCommandCatalogEntries();
  const duplicate = { ...entries[0] };

  assert.throws(
    () => validateAlphaCommandCatalogEntries([...entries, duplicate]),
    /Duplicate Alpha command type: pool\.current\.set/,
  );
});

test("rejects malformed catalog entries", () => {
  assert.throws(
    () => validateAlphaCommandCatalogEntries([{ type: "broken.command" }]),
    /handler must be a function/,
  );
  assert.throws(
    () => validateAlphaCommandCatalogEntries([{ type: "broken.command", handler() {}, extra: true }]),
    /must contain only type and handler/,
  );
});
