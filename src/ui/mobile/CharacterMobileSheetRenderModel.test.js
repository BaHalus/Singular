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

function projectionFor(id, name) {
  return projectCharacterForMobileSheet(createCharacter({
    identity: {
      id,
      name,
      concept: "",
      playerId: null,
      campaignId: null,
    },
  }));
}

test("creates the first render model for a mobile character sheet", () => {
  const character = createCharacter({
    identity: {
      id: "char-mobile-render",
      name: "Exploradora Mobile",
      concept: "Primeira tela utilizável",
      playerId: null,
      campaignId: null,
    },
    attributes: {
      ST: 10,
      DX: 12,
      IQ: 11,
      HT: 9,
    },
    secondaryCharacteristics: {
      HP: {
        base: 10,
        override: null,
      },
      FP: {
        base: 9,
        override: null,
      },
    },
    pools: {
      HP: {
        current: 6,
        maximum: 10,
      },
      FP: {
        current: 8,
        maximum: 9,
      },
    },
  });

  const projection = projectCharacterForMobileSheet(character);
  const model = createCharacterMobileSheetRenderModel(projection);

  assert.equal(model.schemaVersion, getCharacterMobileSheetRenderModelSchemaVersion());
  assert.equal(model.title, "Exploradora Mobile");
  assert.equal(model.subtitle, "Primeira tela utilizável");
  assert.equal(model.summary.attributes.find(item => item.id === "DX").value, 12);
  assert.equal(model.summary.pools.find(item => item.id === "HP").current, 6);
  assert.equal(model.cards.find(card => card.id === "identity").status, "available");
  assert.equal(model.cards.find(card => card.id === "secondary-characteristics").status, "declared-only");
  assert.equal(model.sections.find(section => section.id === "equipment").status, "pending");
  assert.equal(validateCharacterMobileSheetRenderModel(model), true);
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
