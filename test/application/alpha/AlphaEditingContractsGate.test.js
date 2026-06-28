import test from "node:test";
import assert from "node:assert/strict";

import {
  createAlphaCommandCatalogEntries,
  listAlphaCommandCatalogTypes,
} from "../../../src/application/alpha/AlphaCommandCatalog.js";
import {
  ALPHA_EDITING_CONTRACTS_GATE_VERSION,
  createAlphaEditingContractsGateManifest,
  validateAlphaEditingContractsGateManifest,
} from "../../../src/application/alpha/AlphaEditingContractsGate.js";
import {
  createCommandRegistry,
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

const ISSUED_AT = "2026-06-28T04:00:00.000Z";
const PROCESSED_AT = "2026-06-28T04:00:01.000Z";

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

function createSession(input = {}) {
  return createApplicationSession({
    id: "session-alpha-editing-gate",
    character: createCharacter({
      identity: {
        id: "character-alpha-editing-gate",
        name: "Alpha Editing Gate",
      },
      ...input,
    }),
  });
}

function createCommand(type, payload, expectedRevision = 0, id = "command-alpha-editing-gate") {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: ISSUED_AT,
    payload,
  };
}

test("declares the GATE ALPHA EDITING CONTRACTS version and complete catalog coverage", () => {
  const manifest = createAlphaEditingContractsGateManifest();

  assert.equal(ALPHA_EDITING_CONTRACTS_GATE_VERSION, "GATE-ALPHA-EDITING-CONTRACTS-1.0");
  assert.equal(manifest.version, ALPHA_EDITING_CONTRACTS_GATE_VERSION);
  assert.equal(manifest.coverage.complete, true);
  assert.deepEqual(manifest.coverage.missingFromCatalog, []);
  assert.deepEqual(manifest.coverage.missingFromFamilies, []);
  assert.deepEqual(manifest.coverage.duplicateTypes, []);
  assert.deepEqual(
    manifest.families.flatMap(family => family.types),
    listAlphaCommandCatalogTypes(),
  );
  assert.equal(validateAlphaEditingContractsGateManifest(manifest), true);
});

test("routes registered Alpha editing commands through the canonical executor and session", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  const session = createSession();

  const result = executeCommand(
    session,
    createCommand("notes.general.set", { text: "Notas estruturais Alpha." }),
    registry,
    runtime,
  );

  assert.equal(result.status, "applied");
  assert.equal(result.session.id, session.id);
  assert.equal(result.session.revision, 1);
  assert.equal(result.session.history.length, 1);
  assert.equal(result.session.future.length, 0);
  assert.equal(result.session.dirty, true);
  assert.equal(result.receipt.commandType, "notes.general.set");
  assert.equal(result.receipt.previousRevision, 0);
  assert.equal(result.receipt.revision, 1);
  assert.equal(result.session.history[0].commandType, "notes.general.set");
  assert.equal(result.session.history[0].beforeRevision, 0);
  assert.equal(result.session.history[0].afterRevision, 1);
});

test("preserves portable snapshots across JSON roundtrip and stable IDs", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  const session = createSession();

  const result = executeCommand(
    session,
    createCommand("trait.add", {
      trait: {
        id: "trait-alpha-custom-role",
        name: "Contrato Portátil",
        role: "custom-alpha-role",
        notes: "Mantém metadados importados.",
        source: {
          kind: "imported",
          provider: "fixture",
          format: "json",
          reference: "alpha-gate",
          version: "1",
        },
        points: 12,
        modifiers: [
          { id: "mod-alpha", name: "Sem cálculo", value: -10 },
        ],
        pointValue: {
          mode: "total",
          importedPoints: 12,
          calculatedPoints: null,
        },
        raw: {
          external: true,
        },
      },
    }),
    registry,
    runtime,
  );

  assert.equal(result.status, "applied");
  const serialized = serializeApplicationSession(result.session);
  const reparsed = JSON.parse(JSON.stringify(serialized));
  const restored = createApplicationSession(reparsed);
  const restoredSerialized = serializeApplicationSession(restored);
  const trait = restoredSerialized.character.traits.find(item => item.id === "trait-alpha-custom-role");

  assert.deepEqual(restoredSerialized, reparsed);
  assert.equal(trait.id, "trait-alpha-custom-role");
  assert.equal(trait.role, "custom-alpha-role");
  assert.equal(trait.source.provider, "fixture");
  assert.equal(trait.source.reference, "alpha-gate");
  assert.equal(trait.pointValue.importedPoints, 12);
  assert.equal(trait.pointValue.calculatedPoints, null);
  assert.deepEqual(trait.modifiers, [
    { id: "mod-alpha", name: "Sem cálculo", value: -10 },
  ]);
  assert.deepEqual(trait.raw, { external: true });
});

test("rejects invalid payloads without mutating the canonical session", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  const session = createSession();

  const result = executeCommand(
    session,
    createCommand("skill.add", [], 0, "command-invalid-payload"),
    registry,
    runtime,
  );

  assert.equal(result.status, "rejected");
  assert.equal(result.session, session);
  assert.equal(result.receipt, null);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.diagnostics[0].code, "application-command-invalid");
});

test("does not calculate Skill or Trait mechanical results in application command execution", () => {
  const registry = createCommandRegistry(createAlphaCommandCatalogEntries());
  const runtime = createRuntime();
  const session = createSession();

  const skillResult = executeCommand(
    session,
    createCommand("skill.add", {
      skill: {
        id: "skill-alpha-no-calculation",
        name: "Pesquisa",
        attribute: "IQ",
        difficulty: "hard",
        points: 4,
        importedLevel: 13,
        importedRelativeLevel: null,
        defaults: [
          { type: "attribute", attribute: "IQ", modifier: -6 },
        ],
      },
    }),
    registry,
    runtime,
  );

  assert.equal(skillResult.status, "applied");
  const skill = skillResult.session.character.skills.find(item => item.id === "skill-alpha-no-calculation");
  assert.equal(skill.importedLevel, 13);
  assert.equal(skill.importedRelativeLevel, null);
  assert.equal(Object.hasOwn(skill, "level"), false);
  assert.equal(Object.hasOwn(skill, "relativeLevel"), false);
  assert.deepEqual(skill.defaults, [
    { type: "attribute", attribute: "IQ", modifier: -6 },
  ]);

  const traitResult = executeCommand(
    skillResult.session,
    createCommand(
      "trait.add",
      {
        trait: {
          id: "trait-alpha-no-cost-calculation",
          name: "Vantagem Declarada",
          role: "advantage",
          points: null,
          pointValue: {
            mode: "base-plus-levels",
            basePoints: 5,
            pointsPerLevel: 3,
            levels: 2,
            declaredPoints: null,
            calculatedPoints: null,
          },
        },
      },
      1,
      "command-alpha-trait-no-cost-calculation",
    ),
    registry,
    runtime,
  );

  assert.equal(traitResult.status, "applied");
  const trait = traitResult.session.character.traits.find(item => item.id === "trait-alpha-no-cost-calculation");
  assert.equal(trait.pointValue.basePoints, 5);
  assert.equal(trait.pointValue.pointsPerLevel, 3);
  assert.equal(trait.pointValue.levels, 2);
  assert.equal(trait.pointValue.declaredPoints, null);
  assert.equal(trait.pointValue.calculatedPoints, null);
});
