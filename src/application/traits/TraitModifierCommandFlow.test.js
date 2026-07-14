import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  createTraitChoices,
  evaluateTraitChoices,
} from "../../domain/character/TraitChoices.js";
import { evaluateTraitFinalCost } from "../../domain/character/TraitFinalCost.js";
import { createTraitFinalCostAuthority } from "../../domain/character/TraitFinalCostAuthority.js";
import { evaluateTraitModifierCost } from "../../domain/character/TraitModifierCost.js";
import { createTrait } from "../../domain/character/Traits.js";
import { createCommandRegistry } from "../commands/CommandRegistry.js";
import { executeCommand } from "../commands/CommandExecutor.js";
import {
  redoApplicationSession,
  undoApplicationSession,
} from "../history/ApplicationHistoryOperations.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createTraitCommandHandlerEntries,
  TRAIT_COMMAND_TYPES,
} from "./TraitCommandHandlers.js";

function session() {
  const trait = createTrait({
    id: "trait-flight",
    role: "advantage",
    name: "Voo",
    modifiers: [
      {
        id: "boost",
        name: "Ampliação",
        kind: "enhancement",
        valueType: "percentage",
        value: 50,
      },
      {
        id: "discount",
        name: "Limitação",
        kind: "limitation",
        valueType: "percentage",
        value: 20,
      },
    ],
    pointValue: {
      mode: "total",
      basePoints: 10,
      calculatedPoints: 13,
    },
  });
  const finalCost = evaluateTraitFinalCost(trait);
  const finalCostAuthority = createTraitFinalCostAuthority({
    operationId: "operation-trait-modifier-flow",
    appliedAt: "2026-07-14T16:00:00.000Z",
    characterId: "character-trait-modifier-flow",
    traitId: trait.id,
    sourceFingerprint: "source-trait-modifier-flow",
    analysisFingerprint: "analysis-trait-modifier-flow",
    planFingerprint: "plan-trait-modifier-flow",
    groupId: null,
    groupRole: "standalone",
    individualPoints: finalCost.calculatedPoints,
    contributionPoints: finalCost.calculatedPoints,
    finalCost,
    choices: evaluateTraitChoices(createTraitChoices()),
    groupPolicy: null,
  });

  return createApplicationSession({
    id: "session-trait-modifier-flow",
    character: createCharacter({
      identity: { id: "character-trait-modifier-flow", name: "Modificadores" },
      traits: [{
        ...trait,
        pointValue: { ...trait.pointValue, finalCostAuthority },
      }],
    }),
  });
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-07-14T16:10:00.000Z" },
    idGenerator: { next: prefix => `${prefix}:trait-detail-${++sequence}` },
  };
}

function command(type, expectedRevision, payload, id) {
  return {
    id,
    type,
    expectedRevision,
    issuedAt: "2026-07-14T16:09:00.000Z",
    payload,
  };
}

function execute(current, type, payload, id, appRuntime) {
  return executeCommand(
    current,
    command(type, current.revision, payload, id),
    createCommandRegistry(createTraitCommandHandlerEntries()),
    appRuntime,
  );
}

test("applies each modifier intention as one canonical revision", () => {
  const appRuntime = runtime();
  const added = execute(session(), TRAIT_COMMAND_TYPES.ADD_MODIFIER, {
    traitId: "trait-flight",
    index: 2,
    modifier: {
      id: "extra",
      name: "Manobrabilidade",
      kind: "enhancement",
      valueType: "percentage",
      value: 10,
    },
  }, "add-extra", appRuntime);
  const edited = execute(added.session, TRAIT_COMMAND_TYPES.EDIT_MODIFIER, {
    traitId: "trait-flight",
    modifierId: "extra",
    patch: { value: 20, notes: "Aprimorada" },
  }, "edit-extra", appRuntime);
  const reordered = execute(edited.session, TRAIT_COMMAND_TYPES.REORDER_MODIFIER, {
    traitId: "trait-flight",
    modifierId: "extra",
    toIndex: 0,
  }, "reorder-extra", appRuntime);
  const disabled = execute(reordered.session, TRAIT_COMMAND_TYPES.SET_MODIFIER_ENABLED, {
    traitId: "trait-flight",
    modifierId: "boost",
    enabled: false,
  }, "disable-boost", appRuntime);
  const removed = execute(disabled.session, TRAIT_COMMAND_TYPES.REMOVE_MODIFIER, {
    traitId: "trait-flight",
    modifierId: "discount",
  }, "remove-discount", appRuntime);

  assert.deepEqual(
    [added, edited, reordered, disabled, removed].map(result => result.status),
    ["applied", "applied", "applied", "applied", "applied"],
  );
  assert.equal(removed.session.revision, 5);
  assert.equal(removed.session.history.length, 5);
  assert.deepEqual(
    removed.session.character.traits[0].modifiers.map(item => item.id),
    ["extra", "boost"],
  );
  assert.equal(removed.session.character.traits[0].modifiers[1].enabled, false);
  assert.equal(removed.session.character.traits[0].pointValue.calculatedPoints, null);
  assert.equal(removed.session.character.traits[0].pointValue.finalCostAuthority, null);
  assert.equal(evaluateTraitModifierCost(removed.session.character.traits[0]).calculatedPoints, 12);
});

test("applies explicit cost basis intentions through the same history pipeline", () => {
  const appRuntime = runtime();
  const mode = execute(session(), TRAIT_COMMAND_TYPES.SET_COST_BASIS_MODE, {
    traitId: "trait-flight",
    mode: "base-plus-levels",
  }, "set-mode", appRuntime);
  const base = execute(mode.session, TRAIT_COMMAND_TYPES.SET_BASE_POINTS, {
    traitId: "trait-flight",
    value: 5,
  }, "set-base", appRuntime);
  const perLevel = execute(base.session, TRAIT_COMMAND_TYPES.SET_POINTS_PER_LEVEL, {
    traitId: "trait-flight",
    value: 2,
  }, "set-per-level", appRuntime);
  const levels = execute(perLevel.session, TRAIT_COMMAND_TYPES.SET_COST_BASIS_LEVELS, {
    traitId: "trait-flight",
    value: 3,
  }, "set-levels", appRuntime);

  assert.equal(levels.session.revision, 4);
  assert.equal(levels.session.history.length, 4);
  assert.deepEqual(levels.session.history.map(entry => entry.commandType), [
    "trait.cost-basis.mode.set",
    "trait.cost-basis.base-points.set",
    "trait.cost-basis.points-per-level.set",
    "trait.cost-basis.levels.set",
  ]);
  assert.deepEqual(
    levels.session.character.traits[0].modifiers.map(item => item.id),
    ["boost", "discount"],
  );
  assert.equal(levels.session.character.traits[0].pointValue.mode, "base-plus-levels");
  assert.equal(levels.session.character.traits[0].pointValue.basePoints, 5);
  assert.equal(levels.session.character.traits[0].pointValue.pointsPerLevel, 2);
  assert.equal(levels.session.character.traits[0].pointValue.levels, 3);
  assert.equal(levels.session.character.traits[0].pointValue.finalCostAuthority, null);
});

test("undo and redo restore modifier state and cost authority snapshots", () => {
  const appRuntime = runtime();
  const applied = execute(session(), TRAIT_COMMAND_TYPES.SET_MODIFIER_ENABLED, {
    traitId: "trait-flight",
    modifierId: "boost",
    enabled: false,
  }, "disable-boost", appRuntime);
  const undone = undoApplicationSession(
    applied.session,
    { expectedRevision: 1 },
    appRuntime,
  );
  const redone = redoApplicationSession(
    undone.session,
    { expectedRevision: 2 },
    appRuntime,
  );

  assert.equal(undone.status, "undone");
  assert.notEqual(undone.session.character.traits[0].modifiers[0].enabled, false);
  assert.equal(undone.session.character.traits[0].pointValue.calculatedPoints, 13);
  assert.equal(
    undone.session.character.traits[0].pointValue.finalCostAuthority.contributionPoints,
    13,
  );
  assert.equal(redone.status, "redone");
  assert.equal(redone.session.character.traits[0].modifiers[0].enabled, false);
  assert.equal(redone.session.character.traits[0].pointValue.finalCostAuthority, null);
});

test("invalid detail commands fail without revision or partial mutation", () => {
  const original = session();
  const result = execute(original, TRAIT_COMMAND_TYPES.ADD_MODIFIER, {
    traitId: "trait-flight",
    index: 2,
    modifier: {
      id: "boost",
      name: "Duplicada",
      kind: "enhancement",
      valueType: "percentage",
      value: 10,
    },
  }, "duplicate-modifier", runtime());

  assert.equal(result.status, "failed");
  assert.equal(result.session, original);
  assert.equal(result.session.revision, 0);
  assert.equal(result.session.history.length, 0);
  assert.equal(result.session.character.traits[0].pointValue.calculatedPoints, 13);
});
