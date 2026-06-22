import test from "node:test";
import assert from "node:assert/strict";

import {
  createCommandRegistry,
  hasCommandHandler,
  listCommandTypes,
  registerCommandHandler,
  resolveCommandHandler,
  validateCommandRegistry,
} from "./CommandRegistry.js";

test("creates a validated, immutable registry without executing handlers", () => {
  let executions = 0;
  const handler = () => {
    executions += 1;
  };
  const sourceEntry = {
    type: "character.rename",
    handler,
  };

  const registry = createCommandRegistry([sourceEntry]);

  sourceEntry.type = "mutated.type";
  sourceEntry.handler = () => {
    executions += 100;
  };

  assert.equal(validateCommandRegistry(registry), true);
  assert.equal(registry.entries.length, 1);
  assert.equal(registry.entries[0].type, "character.rename");
  assert.equal(registry.entries[0].handler, handler);
  assert.equal(executions, 0);
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.entries), true);
  assert.equal(Object.isFrozen(registry.entries[0]), true);
  assert.throws(
    () => registry.entries.push({ type: "blocked", handler }),
    TypeError,
  );
});

test("registers handlers by returning a new registry and preserving the original", () => {
  const original = createCommandRegistry();
  const renameHandler = () => "renamed";
  const replaceHandler = () => "replaced";

  const withRename = registerCommandHandler(original, {
    type: "character.rename",
    handler: renameHandler,
  });
  const withBoth = registerCommandHandler(withRename, {
    type: "character.replace",
    handler: replaceHandler,
  });

  assert.deepEqual(original.entries, []);
  assert.deepEqual(listCommandTypes(withRename), ["character.rename"]);
  assert.deepEqual(listCommandTypes(withBoth), [
    "character.rename",
    "character.replace",
  ]);
  assert.equal(resolveCommandHandler(withBoth, "character.rename"), renameHandler);
  assert.equal(resolveCommandHandler(withBoth, "character.replace"), replaceHandler);
  assert.equal(resolveCommandHandler(withBoth, "character.missing"), null);
  assert.equal(hasCommandHandler(withBoth, "character.rename"), true);
  assert.equal(hasCommandHandler(withBoth, "character.missing"), false);
});

test("returns a frozen detached list of registered command types", () => {
  const registry = createCommandRegistry([
    { type: "character.rename", handler: () => {} },
    { type: "character.replace", handler: () => {} },
  ]);

  const types = listCommandTypes(registry);

  assert.deepEqual(types, ["character.rename", "character.replace"]);
  assert.notEqual(types, registry.entries);
  assert.equal(Object.isFrozen(types), true);
  assert.throws(() => types.push("character.delete"), TypeError);
  assert.deepEqual(listCommandTypes(registry), [
    "character.rename",
    "character.replace",
  ]);
});

test("rejects duplicate command types during creation and registration", () => {
  const handler = () => {};

  assert.throws(
    () => createCommandRegistry([
      { type: "character.rename", handler },
      { type: "character.rename", handler },
    ]),
    /Duplicate command handler type: character\.rename/,
  );

  const registry = createCommandRegistry([
    { type: "character.rename", handler },
  ]);

  assert.throws(
    () => registerCommandHandler(registry, {
      type: "character.rename",
      handler,
    }),
    /already registered for type: character\.rename/,
  );
});

test("validates registry and handler entry structure", () => {
  assert.throws(
    () => createCommandRegistry({}),
    /entries must be an array/,
  );
  assert.throws(
    () => createCommandRegistry([null]),
    /entry\[0\] must be a plain object/,
  );
  assert.throws(
    () => createCommandRegistry([{ type: "   ", handler: () => {} }]),
    /type must be a non-empty string/,
  );
  assert.throws(
    () => createCommandRegistry([{ type: "character.rename", handler: null }]),
    /handler must be a function/,
  );
  assert.throws(
    () => validateCommandRegistry(null),
    /Command registry must be a plain object/,
  );
  assert.throws(
    () => validateCommandRegistry({ entries: {} }),
    /entries must be an array/,
  );
  assert.throws(
    () => validateCommandRegistry({
      entries: [
        { type: "character.rename", handler: () => {} },
        { type: "character.rename", handler: () => {} },
      ],
    }),
    /Duplicate command handler type: character\.rename/,
  );
});

test("rejects invalid command types during lookup", () => {
  const registry = createCommandRegistry();

  for (const invalidType of [null, undefined, "", "   "]) {
    assert.throws(
      () => hasCommandHandler(registry, invalidType),
      /type must be a non-empty string/,
    );
    assert.throws(
      () => resolveCommandHandler(registry, invalidType),
      /type must be a non-empty string/,
    );
  }
});
