import test from "node:test";
import assert from "node:assert/strict";

import {
  analyzeLibraryDependencies,
  validateLibraryDependencyAnalysis,
} from "./LibraryDependencyResolver.js";
import {
  createLibraryRegistry,
} from "./LibraryRegistry.js";

function definition(id, dependencies = []) {
  return {
    id,
    domain: "test",
    name: id,
    dependencies,
  };
}

test("resolves an empty registry as ready", () => {
  const analysis = analyzeLibraryDependencies(createLibraryRegistry());

  assert.deepEqual(analysis, {
    status: "ready",
    resolvable: true,
    rootDefinitionIds: [],
    resolvedDefinitionIds: [],
    missingRequired: [],
    missingOptional: [],
    cycles: [],
    diagnostics: [],
  });
  assert.equal(validateLibraryDependencyAnalysis(analysis), true);
  assert.equal(Object.isFrozen(analysis), true);
});

test("returns dependency-first order for explicit roots", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("root", [
        { libraryItemId: "middle" },
      ]),
      definition("middle", [
        { libraryItemId: "base" },
      ]),
      definition("base"),
    ],
  });

  const analysis = analyzeLibraryDependencies(registry, ["root"]);

  assert.equal(analysis.status, "ready");
  assert.deepEqual(analysis.rootDefinitionIds, ["root"]);
  assert.deepEqual(
    analysis.resolvedDefinitionIds,
    ["base", "middle", "root"],
  );
});

test("resolves all definitions by default without duplicating shared dependencies", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("first", [{ libraryItemId: "shared" }]),
      definition("second", [{ libraryItemId: "shared" }]),
      definition("shared"),
    ],
  });

  const analysis = analyzeLibraryDependencies(registry);

  assert.deepEqual(
    analysis.rootDefinitionIds,
    ["first", "second", "shared"],
  );
  assert.deepEqual(
    analysis.resolvedDefinitionIds,
    ["shared", "first", "second"],
  );
});

test("blocks missing required dependencies", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("root", [
        {
          libraryItemId: "missing-required",
          versionRange: ">=1.0.0",
          required: true,
        },
      ]),
    ],
  });

  const analysis = analyzeLibraryDependencies(registry, ["root"]);

  assert.equal(analysis.status, "blocked");
  assert.equal(analysis.resolvable, false);
  assert.deepEqual(analysis.missingRequired, [
    {
      definitionId: "root",
      dependencyId: "missing-required",
      versionRange: ">=1.0.0",
    },
  ]);
  assert.equal(
    analysis.diagnostics.some(
      diagnostic => diagnostic.code === "library-required-dependency-missing",
    ),
    true,
  );
});

test("reports missing optional dependencies as warnings", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("root", [
        {
          libraryItemId: "missing-optional",
          required: false,
        },
      ]),
    ],
  });

  const analysis = analyzeLibraryDependencies(registry, ["root"]);

  assert.equal(analysis.status, "ready-with-warnings");
  assert.equal(analysis.resolvable, true);
  assert.deepEqual(analysis.missingOptional, [
    {
      definitionId: "root",
      dependencyId: "missing-optional",
      versionRange: null,
    },
  ]);
});

test("blocks an explicitly selected missing root", () => {
  const analysis = analyzeLibraryDependencies(
    createLibraryRegistry(),
    ["missing-root"],
  );

  assert.equal(analysis.status, "blocked");
  assert.deepEqual(analysis.missingRequired, [
    {
      definitionId: null,
      dependencyId: "missing-root",
      versionRange: null,
    },
  ]);
  assert.deepEqual(analysis.resolvedDefinitionIds, []);
});

test("detects dependency cycles with a closed path", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("a", [{ libraryItemId: "b" }]),
      definition("b", [{ libraryItemId: "c" }]),
      definition("c", [{ libraryItemId: "a" }]),
    ],
  });

  const analysis = analyzeLibraryDependencies(registry, ["a"]);

  assert.equal(analysis.status, "blocked");
  assert.deepEqual(analysis.cycles, [["a", "b", "c", "a"]]);
  assert.equal(
    analysis.diagnostics.some(
      diagnostic => diagnostic.code === "library-dependency-cycle",
    ),
    true,
  );
});

test("preserves version ranges as informational declarations", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("root", [
        {
          libraryItemId: "base",
          versionRange: ">=1.0.0 <2.0.0",
        },
      ]),
      definition("base"),
    ],
  });

  const analysis = analyzeLibraryDependencies(registry, ["root"]);

  assert.equal(analysis.status, "ready");
  assert.deepEqual(analysis.resolvedDefinitionIds, ["base", "root"]);
  assert.deepEqual(analysis.diagnostics, [
    {
      code: "library-dependency-version-range-declared",
      severity: "info",
      definitionId: "root",
      dependencyId: "base",
      versionRange: ">=1.0.0 <2.0.0",
    },
  ]);
  assert.equal("versionSatisfied" in analysis, false);
});

test("uses exact ids and never resolves dependencies by name", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("root", [{ libraryItemId: "Base Name" }]),
      {
        id: "base-id",
        domain: "test",
        name: "Base Name",
      },
    ],
  });

  const analysis = analyzeLibraryDependencies(registry, ["root"]);

  assert.equal(analysis.status, "blocked");
  assert.deepEqual(analysis.missingRequired[0].dependencyId, "Base Name");
  assert.equal(analysis.resolvedDefinitionIds.includes("base-id"), false);
});

test("does not mutate the registry and freezes nested diagnostics", () => {
  const registry = createLibraryRegistry({
    definitions: [
      definition("root", [{ libraryItemId: "missing" }]),
    ],
  });
  const before = JSON.stringify(registry);

  const analysis = analyzeLibraryDependencies(registry, ["root"]);

  assert.equal(JSON.stringify(registry), before);
  assert.equal(Object.isFrozen(analysis.diagnostics), true);
  assert.equal(Object.isFrozen(analysis.diagnostics[0]), true);
  assert.equal(Object.isFrozen(analysis.missingRequired), true);
});

test("rejects invalid root selection", () => {
  const registry = createLibraryRegistry();

  assert.throws(
    () => analyzeLibraryDependencies(registry, "root"),
    /Library dependency roots must be an array/,
  );
  assert.throws(
    () => analyzeLibraryDependencies(registry, ["root", "root"]),
    /Library dependency roots must not contain duplicates/,
  );
  assert.throws(
    () => analyzeLibraryDependencies(registry, [""]),
    /Library dependency root\[0\] must be a non-empty string/,
  );
});

test("rejects tampered analysis snapshots", () => {
  assert.throws(
    () => validateLibraryDependencyAnalysis({
      status: "ready",
      resolvable: false,
      rootDefinitionIds: [],
      resolvedDefinitionIds: [],
      missingRequired: [],
      missingOptional: [],
      cycles: [],
      diagnostics: [],
    }),
    /resolvable flag is inconsistent/,
  );

  assert.throws(
    () => validateLibraryDependencyAnalysis({
      status: "blocked",
      resolvable: false,
      rootDefinitionIds: ["root"],
      resolvedDefinitionIds: ["root"],
      missingRequired: [],
      missingOptional: [],
      cycles: [["root", "other"]],
      diagnostics: [],
    }),
    /cycle\[0\] must be closed/,
  );
});
