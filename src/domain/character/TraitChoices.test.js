import test from "node:test";
import assert from "node:assert/strict";

import {
  createTraitChoices,
  evaluateTraitChoices,
  serializeTraitChoices,
  validateTraitChoices,
  validateTraitChoicesEvaluation,
} from "./TraitChoices.js";

test("normalizes a GCS replacements map into explicit keyed choices", () => {
  const choices = createTraitChoices({
    Elemento: "Fogo",
    Regiao: "Norte",
    Quantidade: 2,
  });

  assert.deepEqual(choices.map(choice => choice.key), [
    "Elemento",
    "Regiao",
    "Quantidade",
  ]);
  assert.deepEqual(choices.map(choice => choice.value), ["Fogo", "Norte", "2"]);
  assert.ok(choices.every(choice => choice.required === false));
});

test("preserves explicit declarations and reports unresolved required choices", () => {
  const choices = createTraitChoices([
    {
      key: "especializacao",
      value: null,
      required: true,
      label: "Especialização",
    },
    {
      key: "origem",
      value: "Arcana",
      required: true,
    },
  ]);
  const evaluation = evaluateTraitChoices(choices);

  assert.equal(evaluation.status, "incomplete");
  assert.equal(evaluation.complete, false);
  assert.deepEqual(evaluation.missingKeys, ["especializacao"]);
  assert.equal(evaluation.choices[0].label, "Especialização");
  assert.equal(validateTraitChoicesEvaluation(evaluation), true);
});

test("becomes ready when every required choice has an explicit value", () => {
  const evaluation = evaluateTraitChoices(createTraitChoices([
    { key: "especializacao", value: "Espadas", required: true },
    { key: "opcional", value: null, required: false },
  ]));

  assert.equal(evaluation.status, "ready");
  assert.equal(evaluation.complete, true);
  assert.deepEqual(evaluation.missingKeys, []);
});

test("uses keys rather than names or positions as choice identity", () => {
  assert.throws(
    () => createTraitChoices([
      { key: "alvo", value: "A" },
      { key: "alvo", value: "B" },
    ]),
    /Duplicate Trait choice key/,
  );

  assert.throws(
    () => createTraitChoices([{ value: "Sem chave" }]),
    /key must be non-empty string/,
  );
});

test("rejects structured values instead of inventing choice semantics", () => {
  assert.throws(
    () => createTraitChoices({ alvo: { id: "objeto" } }),
    /value must be scalar or null/,
  );
});

test("returns deeply frozen choices and detached serialized values", () => {
  const source = [{
    key: "elemento",
    value: "Gelo",
    required: true,
    metadata: { imported: true },
  }];
  const choices = createTraitChoices(source);
  const serialized = serializeTraitChoices(choices);

  assert.equal(validateTraitChoices(choices), true);
  assert.equal(Object.isFrozen(choices), true);
  assert.equal(Object.isFrozen(choices[0]), true);
  assert.equal(Object.isFrozen(choices[0].metadata), true);
  assert.equal(Object.isFrozen(source), false);
  assert.deepEqual(serialized, choices);
  assert.notEqual(serialized, choices);
  assert.notEqual(serialized[0], choices[0]);
});
