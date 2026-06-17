import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  validateCharacter,
  serializeCharacter,
} from "./Character.js";

test("creates a default character", () => {
  const character = createCharacter();

  assert.ok(character);
});

test("creates identity automatically", () => {
  const character = createCharacter();

  assert.ok(character.identity);
  assert.ok(character.identity.id);
  assert.ok(character.identity.name);
});

test("creates default attributes", () => {
  const character = createCharacter();

  assert.equal(character.attributes.ST, 10);
  assert.equal(character.attributes.DX, 10);
  assert.equal(character.attributes.IQ, 10);
  assert.equal(character.attributes.HT, 10);
});

test("creates state automatically", () => {
  const character = createCharacter();

  assert.ok(character.state);
});

test("creates metadata automatically", () => {
  const character = createCharacter();

  assert.ok(character.metadata);
  assert.ok(character.metadata.createdAt);
  assert.ok(character.metadata.updatedAt);
});

test("serializes character", () => {
  const character = createCharacter();

  const json = serializeCharacter(character);

  assert.ok(json);
  assert.ok(json.identity);
  assert.ok(json.attributes);
  assert.ok(json.state);
  assert.ok(json.metadata);
});

test("validates valid character", () => {
  const character = createCharacter();

  assert.equal(
    validateCharacter(character),
    true
  );
});

test("throws when ST is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        ST: "10",
        DX: 10,
        IQ: 10,
        HT: 10,
      },
    });
  });
});

test("throws when DX is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        ST: 10,
        DX: null,
        IQ: 10,
        HT: 10,
      },
    });
  });
});

test("throws when IQ is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        ST: 10,
        DX: 10,
        IQ: undefined,
        HT: 10,
      },
    });
  });
});

test("throws when HT is not numeric", () => {
  assert.throws(() => {
    createCharacter({
      attributes: {
        ST: 10,
        DX: 10,
        IQ: 10,
        HT: "abc",
      },
    });
  });
});
