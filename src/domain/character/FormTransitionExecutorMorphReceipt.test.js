import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "./Character.js";
import {
  prepareMorphKnownFormTransition,
} from "./MorphKnownFormSelection.js";
import { executeFormTransition } from "./FormTransitionExecutor.js";

test("Morfose transition receipt preserves selected known form and template", () => {
  const character = createCharacter({
    identity: {
      id: "char-morph-receipt",
      name: "Mira",
      concept: "Metamorfa",
      playerId: null,
      campaignId: null,
    },
    templates: [
      {
        id: "template-wolf",
        templateType: "form",
        name: "Lobo",
      },
    ],
    alternateFormSets: [
      {
        id: "set-morph",
        name: "Morfose",
        mechanism: "morph",
        baseFormId: "form-base",
        activeFormId: "form-base",
        forms: [
          {
            id: "form-base",
            name: "Forma natural",
          },
        ],
        morphProfile: {
          knownForms: [
            {
              id: "known-wolf",
              templateId: "template-wolf",
              name: "Lobo",
              state: "available",
            },
          ],
        },
      },
    ],
  });
  const prepared = prepareMorphKnownFormTransition(
    character,
    "set-morph",
    "known-wolf",
  );
  const executed = executeFormTransition(
    prepared.character,
    prepared.plan,
    {
      now: "2026-06-19T19:00:00.000Z",
      executionId: "execution-morph-receipt",
    },
  );
  const history = executed.character.formTransitionHistory.find(event => (
    event.executionId === "execution-morph-receipt"
  ));

  assert.equal(executed.receipt.morphKnownFormId, "known-wolf");
  assert.equal(executed.receipt.targetTemplateId, "template-wolf");
  assert.equal(history.data.morphKnownFormId, "known-wolf");
  assert.equal(history.data.targetTemplateId, "template-wolf");
});
