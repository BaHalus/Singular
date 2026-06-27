import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  projectCharacterForMobileSheet,
  serializeCharacterMobileProjection,
} from "./CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModel,
  getCharacterMobileSheetRenderModelSchemaVersion,
  serializeCharacterMobileSheetRenderModel,
  validateCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";

function projectionFor(id, name, equipment = []) {
  return projectCharacterForMobileSheet(createCharacter({
    identity: {
      id,
      name,
      concept: "",
      playerId: null,
      campaignId: null,
    },
    equipment,
  }));
}

test("creates the mobile render model with an empty equipment card", () => {
  const character = createCharacter({
    identity: {
      id: "char-mobile-render",
      name: "Exploradora Mobile",
      concept: "Primeira tela utilizável",
      playerId: null,
      campaignId: null,
    },
    attributes: { ST: 10, DX: 12, IQ: 11, HT: 9 },
    secondaryCharacteristics: {
      HP: { base: 10, override: null },
      FP: { base: 9, override: null },
    },
    pools: {
      HP: { current: 6, maximum: 10 },
      FP: { current: 8, maximum: 9 },
    },
  });

  const model = createCharacterMobileSheetRenderModel(
    projectCharacterForMobileSheet(character),
  );
  const equipment = model.cards.find(card => card.id === "equipment");

  assert.equal(model.schemaVersion, 5);
  assert.equal(model.schemaVersion, getCharacterMobileSheetRenderModelSchemaVersion());
  assert.equal(model.title, "Exploradora Mobile");
  assert.equal(model.summary.attributes.find(item => item.id === "DX").value, 12);
  assert.equal(model.summary.pools.find(item => item.id === "HP").current, 6);
  assert.equal(equipment.status, "empty");
  assert.deepEqual(equipment.totals, {
    quantity: 0,
    weightKg: 0,
    cost: 0,
    authority: "engine.equipment",
  });
  assert.equal(model.sections.find(section => section.id === "equipment").status, "empty");
  assert.equal(validateCharacterMobileSheetRenderModel(model), true);
});

test("creates a hierarchical equipment card without recalculating totals", () => {
  const model = createCharacterMobileSheetRenderModel(projectionFor(
    "char-mobile-equipment-render",
    "Inventário Renderizado",
    [
      {
        id: "eq_bolsa",
        kind: "container",
        containerKind: "physical",
        name: "Bolsa",
        quantity: 1,
        weightKg: 1,
        cost: 20,
        state: "carried",
        children: [
          {
            id: "eq_moeda",
            name: "Moeda",
            quantity: 10,
            weightKg: 0.01,
            cost: 1,
            state: "stored",
          },
        ],
      },
    ],
  ));
  const equipment = model.cards.find(card => card.id === "equipment");

  assert.equal(equipment.status, "declared-only");
  assert.deepEqual(equipment.totals, {
    quantity: 11,
    weightKg: 1.1,
    cost: 30,
    authority: "engine.equipment",
  });
  assert.deepEqual(
    equipment.items.map(item => [item.id, item.parentId, item.depth, item.state]),
    [
      ["eq_bolsa", null, 0, "carried"],
      ["eq_moeda", "eq_bolsa", 1, "stored"],
    ],
  );
});

test("keeps the render model detached and immutable", () => {
  const model = createCharacterMobileSheetRenderModel(
    projectionFor("char-mobile-render-copy", "Cópia Mobile"),
  );
  const serialized = serializeCharacterMobileSheetRenderModel(model);

  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.summary), true);
  assert.equal(Object.isFrozen(model.cards), true);
  assert.notEqual(serialized, model);

  serialized.title = "Alterado";
  serialized.cards[0].items[0].value = "Mutável apenas na cópia";

  assert.equal(model.title, "Cópia Mobile");
  assert.equal(model.cards[0].items[0].value, "Cópia Mobile");
});

test("rejects malformed render models instead of hiding unsupported UI state", () => {
  const projection = serializeCharacterMobileProjection(
    projectionFor("char-mobile-render-invalid", "Inválido Mobile"),
  );
  const model = serializeCharacterMobileSheetRenderModel(
    createCharacterMobileSheetRenderModel(projection),
  );

  model.sections[0].status = "interactive-but-not-authorized";

  assert.throws(
    () => validateCharacterMobileSheetRenderModel(model),
    /Character mobile sheet section identity status is invalid/,
  );
});

test("rejects toolbar actions that advertise unsupported availability", () => {
  const model = serializeCharacterMobileSheetRenderModel(
    createCharacterMobileSheetRenderModel(
      projectionFor("char-mobile-toolbar-invalid", "Toolbar Inválida"),
    ),
  );

  model.toolbar.actions.find(action => action.id === "save").status = "available";

  assert.throws(
    () => validateCharacterMobileSheetRenderModel(model),
    /Character mobile sheet toolbar action save status is invalid/,
  );
  assert.throws(
    () => serializeCharacterMobileSheetRenderModel(model),
    /Character mobile sheet toolbar action save status is invalid/,
  );
});
