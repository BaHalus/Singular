import test from "node:test";
import assert from "node:assert/strict";

import {
  createLibraryAdapter,
  createLibraryAdapterRegistry,
  findLibraryAdapter,
  hasLibraryInstantiationCapability,
  serializeLibraryDefinitionWithAdapter,
  validateLibraryAdapter,
  validateLibraryAdapterRegistry,
  validateLibraryDefinitionWithAdapter,
} from "./LibraryAdapter.js";
import {
  createLibraryDefinition,
} from "./LibraryDefinition.js";

function createSpellAdapter(overrides = {}) {
  return {
    domain: "spell",
    supportedSchemaVersions: [1],
    validateDefinitionPayload(payload) {
      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload) ||
        typeof payload.name !== "string"
      ) {
        throw new Error("Spell library payload is invalid");
      }
      return true;
    },
    serializeDefinitionPayload(payload) {
      return {
        id: payload.id ?? null,
        name: payload.name,
        colleges: [...(payload.colleges ?? [])],
      };
    },
    ...overrides,
  };
}

function createSpellDefinition(overrides = {}) {
  return createLibraryDefinition({
    id: "library-spell-fireball",
    domain: "spell",
    schemaVersion: 1,
    name: "Bola de Fogo",
    payload: {
      id: "spell-fireball",
      name: "Bola de Fogo",
      colleges: ["Fogo"],
    },
    ...overrides,
  });
}

test("creates a minimal immutable Library adapter", () => {
  const adapter = createLibraryAdapter(createSpellAdapter({
    supportedSchemaVersions: undefined,
  }));

  assert.equal(adapter.domain, "spell");
  assert.deepEqual(adapter.supportedSchemaVersions, [1]);
  assert.equal(adapter.analyzeInstantiation, null);
  assert.equal(adapter.planInstantiation, null);
  assert.equal(adapter.executeInstantiationPlan, null);
  assert.equal(validateLibraryAdapter(adapter), true);
  assert.equal(hasLibraryInstantiationCapability(adapter), false);
  assert.equal(Object.isFrozen(adapter), true);
});

test("recognizes only a complete instantiation capability", () => {
  const adapter = createLibraryAdapter(createSpellAdapter({
    analyzeInstantiation() {
      return { status: "ready" };
    },
    planInstantiation() {
      return { id: "plan" };
    },
    executeInstantiationPlan() {
      return { id: "receipt" };
    },
  }));

  assert.equal(hasLibraryInstantiationCapability(adapter), true);
});

test("rejects partial instantiation method sets", () => {
  assert.throws(
    () => createLibraryAdapter(createSpellAdapter({
      analyzeInstantiation() {
        return { status: "ready" };
      },
    })),
    /instantiation methods must be provided together/,
  );
});

test("creates an exact-domain adapter registry", () => {
  const registry = createLibraryAdapterRegistry([
    createSpellAdapter(),
    {
      domain: "trait",
      validateDefinitionPayload() {
        return true;
      },
      serializeDefinitionPayload(payload) {
        return { ...payload };
      },
    },
  ]);

  assert.equal(validateLibraryAdapterRegistry(registry), true);
  assert.equal(findLibraryAdapter(registry, "spell")?.domain, "spell");
  assert.equal(findLibraryAdapter(registry, "Spell"), null);
  assert.equal(Object.isFrozen(registry), true);
  assert.equal(Object.isFrozen(registry.adapters), true);
});

test("rejects duplicate adapter domains", () => {
  assert.throws(
    () => createLibraryAdapterRegistry([
      createSpellAdapter(),
      createSpellAdapter(),
    ]),
    /Duplicate Library adapter domain: spell/,
  );
});

test("validates a definition through its owner-domain adapter", () => {
  const registry = createLibraryAdapterRegistry([createSpellAdapter()]);
  const definition = createSpellDefinition();

  assert.equal(
    validateLibraryDefinitionWithAdapter(definition, registry),
    true,
  );
});

test("rejects missing adapters and unsupported schema versions", () => {
  const emptyRegistry = createLibraryAdapterRegistry();
  const registry = createLibraryAdapterRegistry([createSpellAdapter()]);

  assert.throws(
    () => validateLibraryDefinitionWithAdapter(
      createSpellDefinition(),
      emptyRegistry,
    ),
    /Library adapter not found for domain: spell/,
  );

  assert.throws(
    () => validateLibraryDefinitionWithAdapter(
      createSpellDefinition({ schemaVersion: 2 }),
      registry,
    ),
    /does not support schemaVersion 2/,
  );
});

test("requires explicit successful payload validation", () => {
  const registry = createLibraryAdapterRegistry([
    createSpellAdapter({
      validateDefinitionPayload() {
        return false;
      },
    }),
  ]);

  assert.throws(
    () => validateLibraryDefinitionWithAdapter(
      createSpellDefinition(),
      registry,
    ),
    /did not validate payload/,
  );
});

test("serializes payload through the owner adapter into a detached definition", () => {
  const registry = createLibraryAdapterRegistry([createSpellAdapter()]);
  const definition = createSpellDefinition({
    payload: {
      id: "spell-fireball",
      name: "Bola de Fogo",
      colleges: ["Fogo"],
      runtimeCache: {
        level: 18,
      },
    },
  });

  const serialized = serializeLibraryDefinitionWithAdapter(
    definition,
    registry,
  );
  serialized.payload.colleges.push("copy-only");

  assert.deepEqual(serialized.payload, {
    id: "spell-fireball",
    name: "Bola de Fogo",
    colleges: ["Fogo", "copy-only"],
  });
  assert.deepEqual(definition.payload.colleges, ["Fogo"]);
  assert.equal("runtimeCache" in serialized.payload, false);
});

test("revalidates the payload produced by the adapter serializer", () => {
  const registry = createLibraryAdapterRegistry([
    createSpellAdapter({
      serializeDefinitionPayload() {
        return {
          name: "Inválida",
          generatedAt: new Date(),
        };
      },
    }),
  ]);

  assert.throws(
    () => serializeLibraryDefinitionWithAdapter(
      createSpellDefinition(),
      registry,
    ),
    /plain objects and arrays/,
  );
});

test("does not call instantiation methods during validation or serialization", () => {
  let analyzeCalls = 0;
  let planCalls = 0;
  let executeCalls = 0;
  const registry = createLibraryAdapterRegistry([
    createSpellAdapter({
      analyzeInstantiation() {
        analyzeCalls += 1;
        return { status: "ready" };
      },
      planInstantiation() {
        planCalls += 1;
        return { id: "plan" };
      },
      executeInstantiationPlan() {
        executeCalls += 1;
        return { id: "receipt" };
      },
    }),
  ]);
  const definition = createSpellDefinition();

  validateLibraryDefinitionWithAdapter(definition, registry);
  serializeLibraryDefinitionWithAdapter(definition, registry);

  assert.equal(analyzeCalls, 0);
  assert.equal(planCalls, 0);
  assert.equal(executeCalls, 0);
});

test("rejects invalid adapter contracts and registries", () => {
  assert.throws(
    () => createLibraryAdapter([]),
    /Library adapter must be an object/,
  );
  assert.throws(
    () => createLibraryAdapter({
      domain: "spell",
      validateDefinitionPayload() {
        return true;
      },
    }),
    /serializeDefinitionPayload must be a function/,
  );
  assert.throws(
    () => createLibraryAdapter(createSpellAdapter({
      supportedSchemaVersions: [],
    })),
    /supportedSchemaVersions must be a non-empty array/,
  );
  assert.throws(
    () => createLibraryAdapter(createSpellAdapter({
      supportedSchemaVersions: [1, 1],
    })),
    /supportedSchemaVersions must not contain duplicates/,
  );
  assert.throws(
    () => createLibraryAdapterRegistry({}),
    /Library adapters must be an array/,
  );
  assert.throws(
    () => validateLibraryAdapterRegistry({ adapters: "adapters" }),
    /Library adapter registry must be an object/,
  );
});
