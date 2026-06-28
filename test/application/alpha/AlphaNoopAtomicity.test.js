import test from "node:test";
import assert from "node:assert/strict";

import { createAlphaCommandCatalogEntries } from "../../../src/application/alpha/AlphaCommandCatalog.js";
import { createCommandRegistry } from "../../../src/application/commands/CommandRegistry.js";
import { executeCommand } from "../../../src/application/commands/CommandExecutor.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../src/application/session/ApplicationSession.js";
import { createCharacter } from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T14:00:00.000Z";
const PROCESSED_AT = "2026-06-28T14:00:01.000Z";

function createRuntime() {
  let next = 1;
  return {
    clock: { now: () => PROCESSED_AT },
    idGenerator: { next: prefix => `${prefix}_${next++}` },
  };
}

function createRegistry() {
  return createCommandRegistry(createAlphaCommandCatalogEntries());
}

function command(type, payload, expectedRevision = 0) {
  return {
    id: `command-alpha-noop-atomicity-${type.replaceAll(".", "-")}`,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

function createSeedSession() {
  return createApplicationSession({
    id: "session-alpha-noop-atomicity",
    character: createCharacter({
      identity: { id: "character-alpha-noop-atomicity", name: "Alpha Noop Atomicity" },
      skills: [{ id: "skill-alpha-noop", name: "Skill", attribute: "IQ", difficulty: "hard", points: 2 }],
      attacks: [{ id: "attack-alpha-noop", name: "Attack", category: "melee", damage: { value: "1d", type: "cr", authority: "declared" } }],
      equipment: [{ id: "equipment-alpha-noop", kind: "item", name: "Equipment", quantity: 1, weightKg: 1, cost: 10, state: "carried" }],
      powers: [{ id: "power-alpha-noop", name: "Power", source: "manual", notes: "notes" }],
    }),
  });
}

test("Alpha no-op commands do not advance revision or pollute history", () => {
  const session = createSeedSession();
  const before = serializeApplicationSession(session);
  const registry = createRegistry();

  const cases = [
    ["skill.update", { skillId: "skill-alpha-noop", patch: { points: 2 } }, "update-skill-no-op"],
    ["attack.update", { attackId: "attack-alpha-noop", patch: { name: "Attack" } }, "update-attack-no-op"],
    ["equipment.quantity.set", { itemId: "equipment-alpha-noop", quantity: 1 }, "set-equipment-quantity-no-op"],
    ["power.notes.update", { powerId: "power-alpha-noop", notes: "notes" }, "update-power-notes-no-op"],
  ];

  for (const [type, payload, operation] of cases) {
    const result = executeCommand(
      session,
      command(type, payload, session.revision),
      registry,
      createRuntime(),
    );

    assert.equal(result.status, "no-op", `${type} should be a no-op`);
    assert.strictEqual(result.session, session, `${type} should keep the original session object`);
    assert.equal(result.session.revision, before.revision, `${type} should not advance revision`);
    assert.equal(result.session.dirty, false, `${type} should not mark the session dirty`);
    assert.equal(result.session.history.length, 0, `${type} should not append history`);
    assert.equal(result.session.future.length, 0, `${type} should not clear or append future`);
    assert.equal(result.receipt.status, "no-op", `${type} should emit a no-op receipt`);
    assert.equal(result.receipt.domainReceipt.operation, operation);
    assert.deepEqual(serializeApplicationSession(result.session), before, `${type} should not mutate the session snapshot`);
  }
});

test("Alpha failed commands leave preexisting data and history unchanged", () => {
  const session = createSeedSession();
  const before = serializeApplicationSession(session);
  const registry = createRegistry();

  const result = executeCommand(
    session,
    command("skill.update", {
      skillId: "skill-alpha-noop",
      patch: { unsupportedField: "must fail before mutation" },
    }),
    registry,
    createRuntime(),
  );

  assert.equal(result.status, "failed");
  assert.strictEqual(result.session, session);
  assert.equal(result.receipt, null);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.session.future.length, 0);
  assert.equal(result.session.dirty, false);
  assert.deepEqual(serializeApplicationSession(result.session), before);
  assert.equal(result.session.character.skills[0].id, "skill-alpha-noop");
  assert.equal(result.session.character.attacks[0].id, "attack-alpha-noop");
  assert.equal(result.session.character.equipment[0].id, "equipment-alpha-noop");
  assert.equal(result.session.character.powers[0].id, "power-alpha-noop");
});
