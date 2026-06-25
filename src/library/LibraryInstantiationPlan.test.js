import test from "node:test";
import assert from "node:assert/strict";

import {
  createLibraryInstantiationPlan,
  serializeLibraryInstantiationPlan,
  validateLibraryInstantiationPlan,
} from "./LibraryInstantiationPlan.js";

test("creates an immutable ready Library instantiation plan", () => {
  const plan = createLibraryInstantiationPlan({
    id: "plan-basic",
    rootDefinitionIds: ["spell-fireball"],
    resolvedDefinitionIds: ["spell-fireball"],
    actions: [
      {
        id: "action-create-spell",
        definitionId: "spell-fireball",
        domain: "spell",
        type: "spell.create",
        payload: {
          name: "Bola de Fogo",
        },
      },
    ],
  });

  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.status, "ready");
  assert.equal(plan.executable, true);
  assert.equal(validateLibraryInstantiationPlan(plan), true);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(Object.isFrozen(plan.actions), true);
  assert.equal(Object.isFrozen(plan.actions[0].payload), true);
});

test("serializes as a detached portable value", () => {
  const plan = createLibraryInstantiationPlan({
    id: "plan-detached",
    rootDefinitionIds: ["trait-combat-reflexes"],
    resolvedDefinitionIds: ["trait-combat-reflexes"],
    actions: [
      {
        id: "action-create-trait",
        definitionId: "trait-combat-reflexes",
        domain: "trait",
        type: "trait.create",
        payload: {
          name: "Reflexos em Combate",
          tags: ["combat"],
        },
      },
    ],
  });

  const serialized = serializeLibraryInstantiationPlan(plan);
  serialized.actions[0].payload.tags.push("copy-only");

  assert.deepEqual(serialized.actions[0].payload.tags, ["combat", "copy-only"]);
  assert.deepEqual(plan.actions[0].payload.tags, ["combat"]);
});

test("creates warning plans as executable and blocked plans as non-executable", () => {
  const warningPlan = createLibraryInstantiationPlan({
    id: "plan-warning",
    status: "ready-with-warnings",
    rootDefinitionIds: ["spell-light"],
    resolvedDefinitionIds: ["spell-light"],
    diagnostics: [
      {
        code: "library-optional-dependency-missing",
        severity: "warning",
      },
    ],
    actions: [
      {
        id: "action-create-light",
        definitionId: "spell-light",
        domain: "spell",
        type: "spell.create",
      },
    ],
  });
  const blockedPlan = createLibraryInstantiationPlan({
    id: "plan-blocked",
    status: "blocked",
    rootDefinitionIds: ["spell-blocked"],
    resolvedDefinitionIds: ["spell-blocked"],
    diagnostics: [
      {
        code: "library-required-dependency-missing",
        severity: "blocked",
      },
    ],
  });

  assert.equal(warningPlan.executable, true);
  assert.equal(blockedPlan.executable, false);
});

test("rejects inconsistent executable flags", () => {
  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-inconsistent",
      status: "blocked",
      executable: true,
    }),
    /executable flag is inconsistent/,
  );
});

test("rejects duplicate roots, actions and action dependencies", () => {
  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-duplicate-roots",
      rootDefinitionIds: ["a", "a"],
    }),
    /roots must not contain duplicates/,
  );

  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-duplicate-actions",
      resolvedDefinitionIds: ["definition-a"],
      actions: [
        {
          id: "action-a",
          definitionId: "definition-a",
          domain: "trait",
          type: "trait.create",
        },
        {
          id: "action-a",
          definitionId: "definition-a",
          domain: "trait",
          type: "trait.create",
        },
      ],
    }),
    /Duplicate Library instantiation plan action id: action-a/,
  );

  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-missing-action-dependency",
      resolvedDefinitionIds: ["definition-a"],
      actions: [
        {
          id: "action-a",
          definitionId: "definition-a",
          domain: "trait",
          type: "trait.create",
          dependsOnActionIds: ["action-missing"],
        },
      ],
    }),
    /action dependency not found: action-missing/,
  );
});

test("rejects actions for unresolved definitions and blocked action plans", () => {
  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-unresolved-action",
      resolvedDefinitionIds: ["definition-a"],
      actions: [
        {
          id: "action-b",
          definitionId: "definition-b",
          domain: "trait",
          type: "trait.create",
        },
      ],
    }),
    /action references unresolved definition: definition-b/,
  );

  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-blocked-with-action",
      status: "blocked",
      resolvedDefinitionIds: ["definition-a"],
      actions: [
        {
          id: "action-a",
          definitionId: "definition-a",
          domain: "trait",
          type: "trait.create",
        },
      ],
    }),
    /Blocked Library instantiation plan must not contain actions/,
  );
});

test("rejects executable plans with unresolved roots", () => {
  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-unresolved-root",
      rootDefinitionIds: ["root"],
      resolvedDefinitionIds: [],
    }),
    /root references unresolved definition: root/,
  );
});

test("rejects cyclic action dependency graphs", () => {
  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-cyclic-actions",
      resolvedDefinitionIds: ["definition-a", "definition-b"],
      actions: [
        {
          id: "action-a",
          definitionId: "definition-a",
          domain: "trait",
          type: "trait.create",
          dependsOnActionIds: ["action-b"],
        },
        {
          id: "action-b",
          definitionId: "definition-b",
          domain: "trait",
          type: "trait.create",
          dependsOnActionIds: ["action-a"],
        },
      ],
    }),
    /action dependency cycle detected/,
  );
});

test("rejects non-portable action payloads and diagnostics", () => {
  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-nonportable-payload",
      resolvedDefinitionIds: ["definition-a"],
      actions: [
        {
          id: "action-a",
          definitionId: "definition-a",
          domain: "trait",
          type: "trait.create",
          payload: {
            createdAt: new Date(),
          },
        },
      ],
    }),
    /plain objects and arrays/,
  );

  assert.throws(
    () => createLibraryInstantiationPlan({
      id: "plan-invalid-diagnostic",
      diagnostics: [
        {
          code: "library-test",
          severity: "fatal",
        },
      ],
    }),
    /diagnostic\[0\] severity is invalid/,
  );
});
