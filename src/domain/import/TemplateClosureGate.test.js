import test from "node:test";
import assert from "node:assert/strict";

import {
  createCharacter,
  serializeCharacter,
} from "../character/Character.js";
import {
  incorporateTemplate,
  removeTemplateApplication,
} from "../character/TemplateOperations.js";
import {
  evaluateTemplatePointReconciliation,
} from "../character/TemplatePointReconciliation.js";
import {
  importCharacterWithDiagnostics,
} from "./CharacterImporter.js";

const IMPORTED_AT = "2026-06-21T16:00:00.000Z";
const APPLIED_AT = "2026-06-21T17:00:00.000Z";
const REMOVED_AT = "2026-06-21T18:00:00.000Z";

function source() {
  return {
    type: "template",
    version: 2,
    id: "gct-closure-race",
    name: "Povo da Floresta",
    template_type: "race",
    calc: { points: 15 },
    advantages: [
      {
        type: "advantage",
        id: "adv-closure-night-vision",
        name: "Visão Noturna",
        base_points: 5,
        calc: { points: 5 },
        categories: ["Advantage"],
      },
    ],
    skills: [
      {
        type: "skill",
        id: "skill-closure-survival",
        name: "Sobrevivência",
        specialization: "Florestas",
        difficulty: "per/a",
        points: 2,
      },
    ],
  };
}

test("DOM-TEMPLATE closes import through application, receipt and save/load", () => {
  const imported = importCharacterWithDiagnostics(source(), {
    now: IMPORTED_AT,
    templateImport: {
      planId: "plan-closure-import",
      operationId: "operation-closure-import",
    },
  });
  const character = imported.character;
  const template = character.templates[0];

  assert.equal(imported.templateImportReport.status, "ready");
  assert.deepEqual(
    imported.templateImportReport.recognizedTemplateIds,
    ["gct-closure-race"],
  );
  assert.equal(character.templates.length, 1);
  assert.deepEqual(character.advantages, []);
  assert.deepEqual(character.skills, []);
  assert.equal(template.entries.length, 2);
  assert.equal(template.source.provider, "gcs");
  assert.equal(template.source.format, "gct");
  assert.equal(template.importedPoints, 15);

  const reconciliation = evaluateTemplatePointReconciliation(template);
  assert.equal(reconciliation.status, "imported-only");
  assert.equal(reconciliation.importedPoints, 15);
  assert.equal(reconciliation.calculatedPoints, null);

  const applied = incorporateTemplate(character, template.id, {
    applicationId: "application-closure-race",
    operationId: "operation-closure-apply",
    eventId: "event-closure-apply",
    now: APPLIED_AT,
    choices: {
      homeland: "Floresta Antiga",
    },
  });
  const application = applied.templateApplications[0];

  assert.equal(applied.advantages.length, 1);
  assert.equal(applied.skills.length, 1);
  assert.equal(application.status, "active");
  assert.deepEqual(application.resolvedTemplateIds, ["gct-closure-race"]);
  assert.deepEqual(application.choices, { homeland: "Floresta Antiga" });
  assert.equal(application.history[0].type, "applied");
  assert.equal(
    applied.advantages[0].importMeta.templateApplicationId,
    "application-closure-race",
  );

  const restored = createCharacter(serializeCharacter(applied));
  assert.equal(restored.templates[0].id, "gct-closure-race");
  assert.equal(restored.templates[0].source.format, "gct");
  assert.equal(restored.templateApplications[0].history[0].receipt.operation, "apply");
  assert.deepEqual(
    restored.templateApplications[0].choices,
    { homeland: "Floresta Antiga" },
  );
  assert.equal(
    restored.advantages[0].importMeta.templateApplicationId,
    "application-closure-race",
  );

  const removed = removeTemplateApplication(
    restored,
    "application-closure-race",
    {
      operationId: "operation-closure-remove",
      eventId: "event-closure-remove",
      now: REMOVED_AT,
    },
  );

  assert.deepEqual(removed.advantages, []);
  assert.deepEqual(removed.skills, []);
  assert.equal(removed.templates.length, 1);
  assert.equal(removed.templateApplications[0].status, "removed");
  assert.equal(removed.templateApplications[0].history.length, 2);
  assert.equal(
    removed.templateApplications[0].history[1].receipt.operation,
    "remove",
  );
});

test("unknown imported packages remain explicit diagnostics and are not applied", () => {
  const imported = importCharacterWithDiagnostics({
    id: "character-with-future-package",
    profile: { name: "Personagem" },
    templates: [
      {
        type: "future_package",
        id: "future-package-closure",
        name: "Pacote futuro",
        futureData: { enabled: true },
      },
    ],
  }, {
    now: IMPORTED_AT,
  });

  assert.equal(imported.character.templates.length, 0);
  assert.equal(imported.snapshot.unknownTemplateNodes.length, 1);
  assert.equal(imported.templateImportReport.status, "ready-with-warnings");
  assert.deepEqual(
    imported.templateImportReport.opaqueTemplateIds,
    ["future-package-closure"],
  );
  assert.equal(
    imported.templateImportReport.diagnostics.some(item => (
      item.code === "template-import-unknown-node-preserved"
    )),
    true,
  );
});
