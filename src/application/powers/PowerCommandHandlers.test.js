import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createPowerCommandHandlerEntries,
  POWER_COMMAND_TYPES,
} from "./PowerCommandHandlers.js";

const runtime = Object.freeze({
  clock: { now: () => "2026-06-26T23:20:00.000Z" },
  idGenerator: { next: prefix => `${prefix}-001` },
});

function session() {
  return createApplicationSession({
    id: "session-powers",
    character: createCharacter({
      identity: { id: "character-powers", name: "Teste" },
      traits: [
        { id: "trait-talent", role: "advantage", name: "Talento", points: 5 },
        { id: "trait-a", role: "advantage", name: "Membro A", points: 10 },
        { id: "trait-b", role: "advantage", name: "Membro B", points: 20 },
      ],
      powers: [
        {
          id: "power-a",
          name: "Poder A",
          source: "fonte-a",
          powerModifier: { name: "Mod", valuePercent: -10, notes: "" },
          talentTraitId: "trait-talent",
          memberTraitIds: ["trait-a"],
          notes: "Notas",
          tags: ["tag-a"],
        },
      ],
    }),
  });
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `${type}-command`,
    type,
    expectedRevision,
    issuedAt: "2026-06-26T23:20:00.000Z",
    payload,
  };
}

function registry() {
  return createCommandRegistry(createPowerCommandHandlerEntries());
}

test("adds and removes powers through the existing executor", () => {
  const added = executeCommand(
    session(),
    command(POWER_COMMAND_TYPES.ADD, {
      power: {
        id: "power-b",
        name: "Poder B",
        source: "fonte-b",
        memberTraitIds: ["trait-b"],
        tags: ["tag-b"],
      },
    }),
    registry(),
    runtime,
  );
  assert.equal(added.status, "applied");
  assert.deepEqual(added.session.character.powers.map(power => power.id), ["power-a", "power-b"]);

  const removed = executeCommand(
    session(),
    command(POWER_COMMAND_TYPES.REMOVE, { powerId: "power-a" }),
    registry(),
    runtime,
  );
  assert.equal(removed.status, "applied");
  assert.deepEqual(removed.session.character.powers, []);
});

test("updates structural power fields using PowersOperations", () => {
  const renamed = executeCommand(session(), command(POWER_COMMAND_TYPES.RENAME, { powerId: "power-a", name: "Novo" }), registry(), runtime);
  assert.equal(renamed.session.character.powers[0].name, "Novo");

  const sourced = executeCommand(session(), command(POWER_COMMAND_TYPES.SET_SOURCE, { powerId: "power-a", source: "fonte-c" }), registry(), runtime);
  assert.equal(sourced.session.character.powers[0].source, "fonte-c");

  const modified = executeCommand(session(), command(POWER_COMMAND_TYPES.SET_MODIFIER, {
    powerId: "power-a",
    powerModifier: { name: "Outro", valuePercent: -5, notes: "" },
  }), registry(), runtime);
  assert.equal(modified.session.character.powers[0].powerModifier.valuePercent, -5);

  const notes = executeCommand(session(), command(POWER_COMMAND_TYPES.UPDATE_NOTES, { powerId: "power-a", notes: "Editado" }), registry(), runtime);
  assert.equal(notes.session.character.powers[0].notes, "Editado");
});

test("updates references by Trait id without using names", () => {
  const untalented = executeCommand(session(), command(POWER_COMMAND_TYPES.SET_TALENT_TRAIT, { powerId: "power-a", talentTraitId: null }), registry(), runtime);
  assert.equal(untalented.session.character.powers[0].talentTraitId, null);

  const member = executeCommand(session(), command(POWER_COMMAND_TYPES.ADD_MEMBER_TRAIT, { powerId: "power-a", traitId: "trait-b" }), registry(), runtime);
  assert.deepEqual(member.session.character.powers[0].memberTraitIds, ["trait-a", "trait-b"]);

  const withoutMember = executeCommand(session(), command(POWER_COMMAND_TYPES.REMOVE_MEMBER_TRAIT, { powerId: "power-a", traitId: "trait-a" }), registry(), runtime);
  assert.deepEqual(withoutMember.session.character.powers[0].memberTraitIds, []);
});

test("manages tags and returns no-op for duplicate or missing membership", () => {
  const tagged = executeCommand(session(), command(POWER_COMMAND_TYPES.ADD_TAG, { powerId: "power-a", tag: "tag-b" }), registry(), runtime);
  assert.deepEqual(tagged.session.character.powers[0].tags, ["tag-a", "tag-b"]);

  const duplicateTag = executeCommand(session(), command(POWER_COMMAND_TYPES.ADD_TAG, { powerId: "power-a", tag: "tag-a" }), registry(), runtime);
  assert.equal(duplicateTag.status, "no-op");
  assert.equal(duplicateTag.session.revision, 0);

  const missingMember = executeCommand(session(), command(POWER_COMMAND_TYPES.REMOVE_MEMBER_TRAIT, { powerId: "power-a", traitId: "trait-b" }), registry(), runtime);
  assert.equal(missingMember.status, "no-op");
  assert.equal(missingMember.session.history.length, 0);
});

test("invalid payloads fail atomically", () => {
  const implicitId = executeCommand(session(), command(POWER_COMMAND_TYPES.ADD, { power: { name: "Sem ID" } }), registry(), runtime);
  assert.equal(implicitId.status, "failed");
  assert.equal(implicitId.session.character.powers.length, 1);

  const missingTrait = executeCommand(session(), command(POWER_COMMAND_TYPES.ADD_MEMBER_TRAIT, { powerId: "power-a", traitId: "trait-missing" }), registry(), runtime);
  assert.equal(missingTrait.status, "failed");
  assert.deepEqual(missingTrait.session.character.powers[0].memberTraitIds, ["trait-a"]);
});
