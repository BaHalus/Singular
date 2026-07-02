import test from "node:test";
import assert from "node:assert/strict";

import { createCharacterMobilePostRenderLifecycle } from "../src/ui/mobile/CharacterMobilePostRenderLifecycle.js";

test("mobile post-render lifecycle runs registered enhancers in deterministic order", () => {
  const lifecycle = createCharacterMobilePostRenderLifecycle();
  const calls = [];
  const context = createContext();

  lifecycle.register(received => {
    assert.equal(received.root, context.root);
    assert.equal(received.character, context.character);
    assert.equal(received.session, context.session);
    assert.equal(received.mode, "creation");
    calls.push("first");
  });
  lifecycle.register(() => calls.push("second"));

  assert.deepEqual(lifecycle.run(context), { executed: 2 });
  assert.deepEqual(calls, ["first", "second"]);
});

test("mobile post-render lifecycle unregisters enhancers idempotently", () => {
  const lifecycle = createCharacterMobilePostRenderLifecycle();
  const calls = [];
  lifecycle.register(() => calls.push("kept"));
  const unregister = lifecycle.register(() => calls.push("removed"));

  assert.equal(lifecycle.size, 2);
  assert.equal(unregister(), true);
  assert.equal(unregister(), false);
  assert.equal(lifecycle.size, 1);

  assert.deepEqual(lifecycle.run(createContext()), { executed: 1 });
  assert.deepEqual(calls, ["kept"]);
});

test("mobile post-render lifecycle continues after enhancer failure and aggregates errors", () => {
  const lifecycle = createCharacterMobilePostRenderLifecycle();
  const calls = [];
  const firstError = new Error("first failure");
  const secondError = new Error("second failure");

  lifecycle.register(() => {
    calls.push("before");
    throw firstError;
  });
  lifecycle.register(() => calls.push("after"));
  lifecycle.register(() => {
    calls.push("last");
    throw secondError;
  });

  assert.throws(
    () => lifecycle.run(createContext()),
    error => {
      assert.equal(error instanceof AggregateError, true);
      assert.equal(error.message, "Mobile post-render enhancer failure");
      assert.deepEqual(error.errors, [firstError, secondError]);
      return true;
    },
  );
  assert.deepEqual(calls, ["before", "after", "last"]);
});

test("mobile post-render lifecycle validates enhancers and context", () => {
  const lifecycle = createCharacterMobilePostRenderLifecycle();

  assert.throws(() => lifecycle.register(null), /enhancer must be a function/);
  assert.throws(() => lifecycle.run(null), /context must be an object/);
  assert.throws(() => lifecycle.run({ ...createContext(), root: null }), /root must be an object/);
  assert.throws(() => lifecycle.run({ ...createContext(), character: null }), /character must be an object/);
  assert.throws(() => lifecycle.run({ ...createContext(), session: null }), /session must be an object/);
  assert.throws(() => lifecycle.run({ ...createContext(), mode: "invalid" }), /mode must be creation or table/);
});

test("mobile post-render lifecycle destroy clears enhancers and prevents new registrations", () => {
  const lifecycle = createCharacterMobilePostRenderLifecycle();
  let calls = 0;
  const unregister = lifecycle.register(() => {
    calls += 1;
  });

  lifecycle.destroy();
  lifecycle.destroy();

  assert.equal(lifecycle.size, 0);
  assert.equal(unregister(), false);
  assert.deepEqual(lifecycle.run(createContext()), { executed: 0 });
  assert.equal(calls, 0);
  assert.throws(
    () => lifecycle.register(() => {}),
    /lifecycle is not active/,
  );
});

test("mobile post-render lifecycle snapshots enhancers while respecting in-run unregister", () => {
  const lifecycle = createCharacterMobilePostRenderLifecycle();
  const calls = [];
  let unregisterSecond = () => false;

  lifecycle.register(() => {
    calls.push("first");
    unregisterSecond();
  });
  unregisterSecond = lifecycle.register(() => calls.push("second"));
  lifecycle.register(() => calls.push("third"));

  assert.deepEqual(lifecycle.run(createContext()), { executed: 2 });
  assert.deepEqual(calls, ["first", "third"]);
});

function createContext() {
  const character = { identity: { id: "character-1" } };
  const session = { id: "session-1", character };
  return Object.freeze({
    root: {},
    character,
    session,
    mode: "creation",
  });
}
