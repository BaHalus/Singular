import test from "node:test";
import assert from "node:assert/strict";

import { Character } from "./Character.js";

test("creates a default character", () => {
  const character = new Character();

  assert.ok(character);
});

test("creates identity automatically", () => {
  const character = new Character();

  assert.ok(character.identity);
  assert.ok(character.identity.id);
  assert.ok(character.identity.name);
});

test("creates default attributes", () => {
  const character = new Character();

  assert.equal(character.attributes.ST, 10);
  assert.equal(character.attributes.DX, 10);
  assert.equal(character.attributes.IQ, 10);
  assert.equal(character.attributes.HT, 10);
});

test("creates state automatically", () => {
  const character = new Character();

  assert.ok(character.state);
});

test("serializes to JSON", () => {
  const character = new Character();
  const json = character.toJSON();

  assert.ok(json);
  assert.ok(json.identity);
  assert.ok(json.attributes);
  assert.ok(json.state);
});

test("throws when ST is not numeric", () => {
  assert.throws(() => {
    new Character({
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
    new Character({
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
    new Character({
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
    new Character({
      attributes: {
        ST: 10,
        DX: 10,
        IQ: 10,
        HT: "abc",
      },
    });
  });
});
