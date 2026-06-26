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
