import test from "node:test";
import assert from "node:assert/strict";

import {
  createCommandEnvelope,
  serializeCommandEnvelope,
  validateCommandEnvelope,
} from "./CommandEnvelope.js";

function input() {
  return {
    id: "command-rename",
    type: "character.rename",
    expectedRevision: 3,
    issuedAt: "2026-06-22T10:00:00.000Z",
    payload: {
      name: "Novo nome",
      path: ["identity", "name"],
    },
  };
}

test("creates an immutable detached command envelope", () => {
  const source = input();
  const command = createCommandEnvelope(source);

  source.payload.name = "Mutado";
  source.payload.path.push("mutado");

  assert.equal(command.payload.name, "Novo nome");
  assert.deepEqual(command.payload.path, ["identity", "name"]);
  assert.equal(validateCommandEnvelope(command), true);
  assert.equal(Object.isFrozen(command), true);
  assert.equal(Object.isFrozen(command.payload), true);
  assert.equal(Object.isFrozen(command.payload.path), true);
  assert.throws(() => command.payload.path.push("bloqueado"), TypeError);
});

test("serializes to a detached plain snapshot", () => {
  const command = createCommandEnvelope(input());
  const serialized = serializeCommandEnvelope(command);

  assert.deepEqual(serialized, input());
  serialized.payload.path.push("somente-copia");
  assert.deepEqual(command.payload.path, ["identity", "name"]);
});

test("accepts Date timestamps and normalizes them", () => {
  const command = createCommandEnvelope({
    ...input(),
    issuedAt: new Date("2026-06-22T10:00:00.000Z"),
  });

  assert.equal(command.issuedAt, "2026-06-22T10:00:00.000Z");
});

test("rejects invalid ids types revisions timestamps and payloads", () => {
  for (const [field, value, pattern] of [
    ["id", "   ", /Command id must be a non-empty string/],
    ["type", "", /Command type must be a non-empty string/],
    ["expectedRevision", -1, /non-negative safe integer/],
    ["expectedRevision", 1.5, /non-negative safe integer/],
    ["issuedAt", "not-a-date", /valid timestamp/],
    ["payload", [], /payload must be a plain object/],
  ]) {
    assert.throws(
      () => createCommandEnvelope({ ...input(), [field]: value }),
      pattern,
    );
  }
});

test("rejects cyclic payloads", () => {
  const payload = {};
  payload.self = payload;

  assert.throws(
    () => createCommandEnvelope({ ...input(), payload }),
    /must not contain cycles/,
  );
});
