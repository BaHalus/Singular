import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import { createApplicationSession } from "../session/ApplicationSession.js";
import {
  createApplicationReadModel,
  serializeApplicationReadModel,
  validateApplicationReadModel,
} from "./ApplicationReadModel.js";

function readModelSnapshot() {
  return serializeApplicationReadModel(createApplicationReadModel(
    createApplicationSession({
      id: "session-read-model-compatibility",
      character: createCharacter({
        identity: {
          id: "character-read-model-compatibility",
          name: "Compatibilidade",
        },
      }),
    }),
  ));
}

test("distinguishes an omitted legacy field from a present undefined field", () => {
  const legacy = readModelSnapshot();
  delete legacy.attackProjection;
  assert.equal(validateApplicationReadModel(legacy), true);

  const invalid = readModelSnapshot();
  invalid.attackProjection = undefined;
  assert.equal(Object.hasOwn(invalid, "attackProjection"), true);
  assert.throws(
    () => validateApplicationReadModel(invalid),
    /must be a projection or null/,
  );
  assert.throws(
    () => serializeApplicationReadModel(invalid),
    /must be a projection or null/,
  );
});
