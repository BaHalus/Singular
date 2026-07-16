import test from "node:test";
import assert from "node:assert/strict";

import { createLibraryAdapterRegistry } from "./LibraryAdapter.js";
import { orchestrateLibraryInstantiation } from "./LibraryInstantiationOrchestrator.js";
import {
  createTraitModifierLibraryAdapter,
  createTraitModifierLibraryDefinition,
  createTraitModifierLibraryPayload,
  serializeTraitModifierLibraryPayload,
  TRAIT_MODIFIER_LIBRARY_DOMAIN,
  validateTraitModifierLibraryPayload,
} from "./TraitModifierLibraryAdapter.js";

function libraryDefinition(overrides = {}) {
  return createTraitModifierLibraryDefinition({
    id: "library-trait-modifier-area-effect",
    externalIds: {
      gcs: "modifier-area-effect",
    },
    name: "Área de Efeito",
    version: "1.0.0",
    source: {
      kind: "imported",
      provider: "gcs",
      format: "gct",
      reference: "Basic Set.gct",
    },
    modifier: {
      id: "modifier-area-effect",
      name: "Área de Efeito",
      kind: "enhancement",
      valueType: "percentage",
      value: 50,
      source: {
        book: "Basic Set",
        page: 102,
      },
      notes: "Aumenta a área.",
    },
    compatibility: {
      mode: "declared",
      traitRoles: ["advantage"],
      requiredTags: ["attack"],
    },
    importMeta: {
      importedAt: "2026-07-16T00:00:00Z",
    },
    raw: {
      type: "modifier",
      feature: "area-effect",
    },
    ...overrides,
  });
}

function registry() {
  return createLibraryAdapterRegistry([
    createTraitModifierLibraryAdapter(),
  ]);
}

test("creates a portable Trait modifier Library definition with declared compatibility", () => {
  const definition = libraryDefinition();

  assert.equal(definition.domain, TRAIT_MODIFIER_LIBRARY_DOMAIN);
  assert.equal(definition.schemaVersion, 1);
  assert.deepEqual(definition.payload.compatibility, {
    mode: "declared",
    traitRoles: ["advantage"],
    traitIds: [],
    requiredTags: ["attack"],
    excludedTags: [],
  });
  assert.equal(definition.payload.modifier.value, 50);
  assert.equal(Object.isFrozen(definition.payload.modifier), true);
  assert.equal(validateTraitModifierLibraryPayload(definition.payload), true);
});

test("serializes a detached payload without losing canonical modifier metadata", () => {
  const payload = libraryDefinition().payload;
  const serialized = serializeTraitModifierLibraryPayload(payload);

  serialized.modifier.source.page = 999;
  serialized.compatibility.requiredTags.push("mutated");

  assert.deepEqual(payload.modifier.source, {
    book: "Basic Set",
    page: 102,
  });
  assert.deepEqual(payload.compatibility.requiredTags, ["attack"]);
});

test("selects a compatible item and preserves imported origin separately", () => {
  const definition = libraryDefinition();
  const result = orchestrateLibraryInstantiation({
    adapterRegistry: registry(),
    definitions: [definition],
    rootDefinitionIds: [definition.id],
    context: {
      targetTrait: {
        id: "trait-innate-attack",
        role: "advantage",
        tags: ["attack", "ranged"],
      },
    },
  });

  assert.equal(result.status, "completed");
  const selection = result.execution.actionResults[0].result;
  assert.equal(selection.kind, "trait-modifier-library-selection");
  assert.equal(selection.modifier.id, "modifier-area-effect");
  assert.deepEqual(selection.origin.externalIds, {
    gcs: "modifier-area-effect",
  });
  assert.deepEqual(selection.origin.source, {
    kind: "imported",
    provider: "gcs",
    format: "gct",
    reference: "Basic Set.gct",
  });
  assert.deepEqual(selection.origin.importMeta, {
    importedAt: "2026-07-16T00:00:00Z",
  });
  assert.deepEqual(selection.origin.raw, {
    type: "modifier",
    feature: "area-effect",
  });
});

test("blocks explicitly incompatible targets instead of inferring applicability", () => {
  const definition = libraryDefinition();
  const result = orchestrateLibraryInstantiation({
    adapterRegistry: registry(),
    definitions: [definition],
    rootDefinitionIds: [definition.id],
    context: {
      targetTrait: {
        id: "trait-bad-temper",
        role: "disadvantage",
        tags: ["mental"],
      },
    },
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.plan, null);
  assert.deepEqual(
    result.diagnostics.map(diagnostic => diagnostic.code),
    [
      "trait-modifier-incompatible-role",
      "trait-modifier-missing-required-tag",
    ],
  );
});

test("keeps selection possible but reports unevaluated compatibility without a target", () => {
  const definition = libraryDefinition();
  const result = orchestrateLibraryInstantiation({
    adapterRegistry: registry(),
    definitions: [definition],
    rootDefinitionIds: [definition.id],
  });

  assert.equal(result.status, "completed-with-warnings");
  assert.equal(
    result.diagnostics[0].code,
    "trait-modifier-compatibility-not-evaluated",
  );
});

test("supports an explicit unrestricted declaration without compatibility heuristics", () => {
  const definition = libraryDefinition({
    compatibility: {
      mode: "unrestricted",
    },
  });
  const result = orchestrateLibraryInstantiation({
    adapterRegistry: registry(),
    definitions: [definition],
    rootDefinitionIds: [definition.id],
    context: {
      targetTrait: {
        id: "trait-any",
        role: "quirk",
        tags: [],
      },
    },
  });

  assert.equal(result.status, "completed");
});

test("rejects missing, contradictory or invalid compatibility declarations", () => {
  assert.throws(
    () => createTraitModifierLibraryPayload({
      modifier: libraryDefinition().payload.modifier,
    }),
    /compatibility declaration is required/,
  );
  assert.throws(
    () => createTraitModifierLibraryPayload({
      modifier: libraryDefinition().payload.modifier,
      compatibility: {
        mode: "unrestricted",
        traitRoles: ["advantage"],
      },
    }),
    /cannot declare constraints/,
  );
  assert.throws(
    () => createTraitModifierLibraryPayload({
      modifier: libraryDefinition().payload.modifier,
      compatibility: {
        mode: "declared",
      },
    }),
    /requires a constraint/,
  );
  assert.throws(
    () => createTraitModifierLibraryPayload({
      modifier: libraryDefinition().payload.modifier,
      compatibility: {
        mode: "declared",
        traitRoles: ["unknown"],
      },
    }),
    /role is invalid/,
  );
});

test("rejects opaque legacy rows instead of silently migrating them", () => {
  assert.throws(
    () => createTraitModifierLibraryPayload({
      modifier: {
        id: "legacy-row",
        name: "Legacy",
        cost: "+50%",
      },
      compatibility: {
        mode: "unrestricted",
      },
    }),
    /modifier id is required|compatibility|modifier/,
  );
});
