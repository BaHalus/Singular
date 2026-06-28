import test from "node:test";
import assert from "node:assert/strict";

import {
  createAlphaCommandCatalogEntries,
  listAlphaCommandCatalogTypes,
} from "../../../src/application/alpha/AlphaCommandCatalog.js";
import {
  createCommandRegistry,
  listCommandTypes,
} from "../../../src/application/commands/CommandRegistry.js";
import {
  executeCommand,
} from "../../../src/application/commands/CommandExecutor.js";
import {
  createApplicationSession,
  serializeApplicationSession,
} from "../../../src/application/session/ApplicationSession.js";
import {
  createCharacter,
} from "../../../src/domain/character/Character.js";

const ISSUED_AT = "2026-06-28T19:00:00.000Z";
const PROCESSED_AT = "2026-06-28T19:00:01.000Z";

const SMOKE_COMMANDS = Object.freeze([
  Object.freeze({
    type: "character.summary.set",
    payload: {
      name: "Alpha Smoke Character",
      concept: "Application contract smoke test",
    },
  }),
  Object.freeze({
    type: "attribute.base.adjust",
    payload: {
      attributeKey: "ST",
      delta: 1,
    },
  }),
  Object.freeze({
    type: "pool.current.set",
    payload: {
      poolKey: "HP",
      current: 9,
    },
  }),
  Object.freeze({
    type: "skill.add",
    payload: {
      skill: {
        id: "skill-alpha-smoke",
        name: "Alpha Smoke Skill",
        attribute: "DX",
        difficulty: "average",
        points: 2,
        externalIds: { smoke: "skill" },
        importMeta: { source: "alpha-smoke" },
        raw: { portable: true },
      },
    },
  }),
  Object.freeze({
    type: "skill.update",
    payload: {
      skillId: "skill-alpha-smoke",
      patch: {
        points: 4,
        notes: "Updated through canonical executor",
      },
    },
  }),
  Object.freeze({
    type: "language.add",
    payload: {
      language: {
        id: "language-alpha-smoke",
        name: "Alpha Smoke Language",
        spokenLevel: "accented",
        writtenLevel: "broken",
        isNative: false,
      },
    },
  }),
  Object.freeze({
    type: "attack.add",
    payload: {
      attack: {
        id: "attack-alpha-smoke",
        name: "Alpha Smoke Attack",
        category: "melee",
        source: { kind: "manual", id: null },
        damage: { value: "1d", type: "cr", authority: "declared" },
      },
    },
  }),
  Object.freeze({
    type: "equipment.add",
    payload: {
      item: {
        id: "equipment-alpha-smoke",
        kind: "item",
        name: "Alpha Smoke Equipment",
        quantity: 1,
        weightKg: 1,
        cost: 10,
        state: "carried",
      },
    },
  }),
  Object.freeze({
    type: "spell.add",
    payload: {
      spell: {
        id: "spell-alpha-smoke",
        spellType: "standard",
        name: "Alpha Smoke Spell",
        attribute: "IQ",
        difficulty: "hard",
        points: 1,
        colleges: ["Meta"],
        importMeta: { source: "alpha-smoke" },
      },
    },
  }),
  Object.freeze({
    type: "power.add",
    payload: {
      power: {
        id: "power-alpha-smoke",
        name: "Alpha Smoke Power",
        source: "manual",
        memberTraitIds: [],
        notes: "Power command smoke path",
        tags: ["alpha-smoke"],
      },
    },
  }),
  Object.freeze({
    type: "notes.general.set",
    payload: {
      text: "Alpha smoke matrix completed through the application executor.",
    },
  }),
]);

function createRuntime() {
  let next = 1;
  return {
    clock: {
      now() {
        return PROCESSED_AT;
      },
    },
    idGenerator: {
      next(prefix) {
        return `${prefix}_${next++}`;
      },
    },
  };
}

function createSeedSession() {
  return createApplicationSession({
    id: "session-alpha-smoke-matrix",
    character: createCharacter({
      identity: {
        id: "character-alpha-smoke-matrix",
        name: "Alpha Smoke Seed",
      },
      pools: {
        HP: { current: 10, maximum: 10 },
        FP: { current: 10, maximum: 10 },
      },
    }),
  });
}

function createCommand(index, type, payload, expectedRevision) {
  return {
    id: `command-alpha-smoke-${String(index).padStart(2, "0")}-${type.replaceAll(".", "-")}`,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

test("Alpha canonical catalog wires every exposed handler into the registry", () => {
  const catalogEntries = createAlphaCommandCatalogEntries();
  const registry = createCommandRegistry(catalogEntries);

  assert.deepEqual(
    listCommandTypes(registry),
    listAlphaCommandCatalogTypes(),
    "registry should expose exactly the Alpha catalog command types",
  );
  assert.ok(listCommandTypes(registry).length > SMOKE_COMMANDS.length);
});

test("Alpha smoke sequence stays executable through canonical executor and session snapshots", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  let session = createSeedSession();

  for (const [index, commandCase] of SMOKE_COMMANDS.entries()) {
    const previousRevision = session.revision;
    const result = executeCommand(
      session,
      createCommand(index + 1, commandCase.type, commandCase.payload, previousRevision),
      registry,
      runtime,
    );

    assert.equal(result.status, "applied", `${commandCase.type} should apply`);
    assert.equal(result.session.revision, previousRevision + 1, `${commandCase.type} should advance revision`);
    assert.equal(result.session.dirty, true, `${commandCase.type} should mark the session dirty`);
    assert.equal(result.session.future.length, 0, `${commandCase.type} should keep future empty`);
    assert.equal(result.session.history.length, result.session.revision, `${commandCase.type} should append exactly one history entry`);
    assert.equal(result.receipt.commandType, commandCase.type, `${commandCase.type} should preserve receipt command type`);
    assert.equal(result.receipt.status, "applied", `${commandCase.type} receipt should be applied`);
    assert.equal(result.receipt.previousRevision, previousRevision, `${commandCase.type} should record previous revision`);
    assert.equal(result.receipt.revision, previousRevision + 1, `${commandCase.type} should record next revision`);
    assert.equal(result.session.lastReceipt.commandType, commandCase.type, `${commandCase.type} should update last receipt`);

    session = result.session;
  }

  const snapshot = serializeApplicationSession(session);
  const rehydrated = createApplicationSession(snapshot);

  assert.deepEqual(serializeApplicationSession(rehydrated), snapshot);
  assert.equal(snapshot.revision, SMOKE_COMMANDS.length);
  assert.equal(snapshot.history.length, SMOKE_COMMANDS.length);
  assert.equal(snapshot.future.length, 0);
  assert.equal(snapshot.dirty, true);
  assert.equal(snapshot.character.identity.name, "Alpha Smoke Character");
  assert.equal(snapshot.character.identity.concept, "Application contract smoke test");
  assert.equal(snapshot.character.attributes.ST.base, 11);
  assert.equal(snapshot.character.pools.HP.current, 9);
  assert.equal(snapshot.character.skills[0].id, "skill-alpha-smoke");
  assert.equal(snapshot.character.skills[0].points, 4);
  assert.equal(snapshot.character.languages[0].id, "language-alpha-smoke");
  assert.equal(snapshot.character.attacks[0].id, "attack-alpha-smoke");
  assert.equal(snapshot.character.equipment[0].id, "equipment-alpha-smoke");
  assert.equal(snapshot.character.spells[0].id, "spell-alpha-smoke");
  assert.equal(snapshot.character.powers[0].id, "power-alpha-smoke");
  assert.equal(snapshot.character.notes.general, "Alpha smoke matrix completed through the application executor.");
});
