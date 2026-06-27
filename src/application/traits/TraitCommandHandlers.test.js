import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter, serializeCharacter } from "../../domain/character/Character.js";
import {
  addTrait,
  findTraitById,
  removeTrait,
  reorderTrait,
  updateTrait,
} from "../../domain/character/TraitsOperations.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createTraitCommandHandlerEntries,
  TRAIT_COMMAND_TYPES,
} from "./TraitCommandHandlers.js";

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-06-27T06:00:00.000Z" },
    idGenerator: { next: prefix => `${prefix}:trait-edit-${++sequence}` },
  };
}

function character() {
  return createCharacter({
    identity: { id: "character-trait-edit", name: "Iara", concept: "Exploradora" },
    traits: [
      {
        id: "trait-combat-reflexes",
        role: "advantage",
        name: "Reflexos em Combate",
        points: 15,
        pointValue: { mode: "total", declaredPoints: 15 },
        source: { kind: "singular", provider: null, format: null, reference: "B43", version: null },
        modifiers: [{ name: "Treinamento", value: 0 }],
        tags: ["combate"],
      },
      { id: "trait-curious", role: "quirk", name: "Curiosa", points: -1 },
    ],
    attacks: [
      { id: "attack-knife", name: "Faca", category: "melee", damage: { value: "thr-1", type: "cut" } },
    ],
  });
}

function session() {
  return createApplicationSession({ id: "session-trait-edit", character: character() });
}

function registry() {
  return createCommandRegistry(createTraitCommandHandlerEntries());
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `command:${type}`,
    type,
    expectedRevision,
    issuedAt: "2026-06-27T06:00:00.000Z",
    payload,
  };
}

test("edits Traits immutably without recalculating points", () => {
  const before = character().traits;
  const added = addTrait(before, {
    id: "trait-custom-oath",
    role: "custom-oath",
    name: "Voto regional",
    points: -5,
    pointValue: { mode: "total", declaredPoints: -5 },
    source: { kind: "singular", provider: null, format: null, reference: "Mesa", version: null },
  });
  const updated = updateTrait(added, "trait-custom-oath", {
    notes: "Preservar como papel customizado.",
    pointValue: { declaredPoints: -6 },
  });
  const reordered = reorderTrait(updated, "trait-custom-oath", 0);
  const removed = removeTrait(reordered, "trait-curious");

  assert.equal(before.length, 2);
  assert.equal(added.length, 3);
  assert.equal(findTraitById(updated, "trait-custom-oath").role, "custom-oath");
  assert.equal(findTraitById(updated, "trait-custom-oath").pointValue.declaredPoints, -6);
  assert.equal(findTraitById(updated, "trait-custom-oath").pointValue.calculatedPoints, null);
  assert.equal(reordered[0].id, "trait-custom-oath");
  assert.equal(findTraitById(removed, "trait-curious"), null);
});

test("rejects unsupported patches and invalid reorder targets", () => {
  const traits = character().traits;
  assert.throws(() => updateTrait(traits, "trait-curious", { costFormula: "DX * 2" }), /unsupported fields/);
  assert.throws(() => reorderTrait(traits, "trait-curious", 9), /target index is invalid/);
  assert.throws(() => removeTrait(traits, "missing"), /Trait not found/);
});

test("rejects non-JSON-portable Trait add and update payloads", () => {
  const traits = character().traits;

  assert.throws(() => addTrait(traits, {
    id: "trait-bad-raw",
    role: "advantage",
    name: "Raw inválido",
    raw: { callback: () => null },
  }), /JSON portable/);

  assert.throws(() => updateTrait(traits, "trait-curious", {
    importMeta: { marker: Symbol("not-json") },
  }), /JSON portable/);

  assert.throws(() => updateTrait(traits, "trait-curious", {
    modifiers: [{ name: "Não finito", value: Number.NaN }],
  }), /JSON portable/);

  const cyclic = { id: "trait-cyclic", role: "advantage", name: "Cíclico" };
  cyclic.raw = { self: cyclic };
  assert.throws(() => addTrait(traits, cyclic), /cycles/);
});

test("applies Trait commands through CommandExecutor with revision and history", () => {
  const beforeSession = session();
  const beforeCharacter = serializeCharacter(beforeSession.character);
  const result = executeCommand(
    beforeSession,
    command(TRAIT_COMMAND_TYPES.ADD, {
      trait: {
        id: "trait-night-vision",
        role: "advantage",
        name: "Visão Noturna 2",
        points: 2,
        levels: 2,
        pointValue: { mode: "per-level", pointsPerLevel: 1, levels: 2, declaredPoints: 2 },
        modifiers: [{ name: "Granted by item", value: 0 }],
      },
    }),
    registry(),
    runtime(),
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.history[0].commandType, "trait.add");
  assert.equal(result.session.character.traits.at(-1).id, "trait-night-vision");
  assert.equal(result.session.character.advantages.at(-1).id, "trait-night-vision");
  assert.deepEqual(serializeCharacter(result.session.character).identity, beforeCharacter.identity);
  assert.deepEqual(serializeCharacter(result.session.character).attacks, beforeCharacter.attacks);
});

test("updates, removes and reorders Traits by id", () => {
  const appRuntime = runtime();
  const commandRegistry = registry();
  const first = executeCommand(
    session(),
    command(TRAIT_COMMAND_TYPES.UPDATE, {
      traitId: "trait-combat-reflexes",
      patch: { name: "Reflexos em Combate revisado", source: { reference: "B43 revisado" } },
    }),
    commandRegistry,
    appRuntime,
  );
  const second = executeCommand(first.session, command(TRAIT_COMMAND_TYPES.REORDER, {
    traitId: "trait-curious",
    targetIndex: 0,
  }, 1), commandRegistry, appRuntime);
  const third = executeCommand(second.session, command(TRAIT_COMMAND_TYPES.REMOVE, {
    traitId: "trait-combat-reflexes",
  }, 2), commandRegistry, appRuntime);

  assert.equal(first.status, "applied");
  assert.equal(first.session.character.traits[0].source.reference, "B43 revisado");
  assert.equal(second.session.character.traits[0].id, "trait-curious");
  assert.equal(third.session.character.traits.length, 1);
  assert.equal(third.session.revision, 3);
});

test("returns no-op for unchanged update and same-position reorder", () => {
  const noChange = executeCommand(session(), command(TRAIT_COMMAND_TYPES.UPDATE, {
    traitId: "trait-curious",
    patch: { name: "Curiosa" },
  }), registry(), runtime());
  const samePosition = executeCommand(session(), command(TRAIT_COMMAND_TYPES.REORDER, {
    traitId: "trait-curious",
    targetIndex: 1,
  }), registry(), runtime());

  assert.equal(noChange.status, "no-op");
  assert.equal(noChange.session.revision, 0);
  assert.equal(samePosition.status, "no-op");
  assert.equal(samePosition.session.revision, 0);
});
