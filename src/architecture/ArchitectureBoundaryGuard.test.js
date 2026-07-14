import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";

import {
  assertArchitectureBoundaries,
  extractRelativeModuleReferences,
  formatArchitectureViolation,
  scanArchitectureBoundaries,
} from "./ArchitectureBoundaryGuard.js";

test("accepts permitted dependencies and scans the real repository", () => {
  const root = resolve(import.meta.dirname, "../..");
  assert.deepEqual(scanArchitectureBoundaries(root), []);
  assert.doesNotThrow(() => assertArchitectureBoundaries(root));
});

test("rejects domain and engine dependencies on outer layers", t => {
  const root = createProject(t, {
    "src/application/UseCase.js": "export const useCase = true;",
    "src/domain/model/Policy.js": [
      "import { view } from '../../ui/mobile/View.js';",
      "import { useCase } from '../../application/UseCase.js';",
      "import { adapter } from '../../infrastructure/persistence/Adapter.js';",
    ].join("\n"),
    "src/engine/rules/Resolver.js": "import { view } from '../../ui/mobile/View.js';",
    "src/infrastructure/persistence/Adapter.js": "export const adapter = true;",
    "src/ui/mobile/View.js": "export const view = true;",
  });

  const violations = scanArchitectureBoundaries(root);
  assert.deepEqual(
    violations.map(violation => violation.rule),
    [
      "domain-engine-to-ui",
      "domain-engine-to-application",
      "domain-engine-to-concrete-persistence",
      "domain-engine-to-ui",
    ],
  );
});

test("rejects application and persistence dependencies on UI", t => {
  const root = createProject(t, {
    "src/application/UseCase.js": "import { view } from '../ui/View.js';",
    "src/application/persistence/SnapshotCoordinator.js": "import { view } from '../../ui/View.js';",
    "src/infrastructure/persistence/Adapter.js": "import { view } from '../../ui/View.js';",
    "src/ui/View.js": "export const view = true;",
  });

  assert.deepEqual(
    scanArchitectureBoundaries(root).map(violation => violation.rule),
    ["application-to-ui", "persistence-to-ui", "application-to-ui", "persistence-to-ui"],
  );
});

test("keeps production Trait and Equipment modules isolated", t => {
  const root = createProject(t, {
    "src/domain/character/EquipmentPolicy.js": "import { trait } from './TraitPolicy.js';",
    "src/domain/character/TraitPolicy.js": "import { equipment } from './EquipmentPolicy.js';",
  });

  assert.deepEqual(
    scanArchitectureBoundaries(root).map(violation => violation.rule),
    ["equipment-to-trait", "trait-to-equipment"],
  );
});

test("recognizes static imports, re-exports, import(), dot and dot-dot paths", t => {
  const root = createProject(t, {
    "src/domain/exports/DomainExports.js": "export { view } from '../../ui/View.js';",
    "src/domain/lazy/LazyView.js": "const loadView = () => import('../../ui/View.js');",
    "src/domain/model/DomainModel.js": "import { shared } from '../shared/Shared.js';",
    "src/domain/shared/Shared.js": "export const shared = true;",
    "src/ui/View.js": "export const view = true;",
  });

  const violations = scanArchitectureBoundaries(root);
  assert.deepEqual(violations.map(violation => violation.form), ["export-from", "import()"]);
  assert.deepEqual(violations.map(violation => violation.specifier), [
    "../../ui/View.js",
    "../../ui/View.js",
  ]);
});

test("recognizes import() inside template expressions but ignores template text", t => {
  const root = createProject(t, {
    "src/domain/model/TemplateView.js": [
      "const documentation = `import('../../ui/View.js')`;",
      "export const loadView = () => `${import('../../ui/View.js')}`;",
      "export const guardedLoad = value => `${/}/.test(value) ? import('../../ui/View.js') : null}`;",
    ].join("\n"),
    "src/ui/View.js": "export const view = true;",
  });

  const violations = scanArchitectureBoundaries(root);
  assert.deepEqual(
    violations.map(violation => [violation.form, violation.specifier]),
    [
      ["import()", "../../ui/View.js"],
      ["import()", "../../ui/View.js"],
    ],
  );
});

test("ignores regex literal text without confusing division or real imports", () => {
  const references = extractRelativeModuleReferences([
    String.raw`const documented = /import\("..\/..\/ui\/View.js"\)/giu;`,
    String.raw`const characterClass = /[\/"']import\("..\/ui\/View.js"\)/;`,
    String.raw`if (ready) /import\("..\/..\/ui\/View.js"\)/.test(value);`,
    String.raw`while (check(ready)) /import\("..\/ui\/View.js"\)/.test(value);`,
    String.raw`if (ready) {} /import\("..\/ui\/View.js"\)/.test(value);`,
    "const ratio = total / divisor;",
    "const groupedRatio = (total) / divisor;",
    "const objectRatio = {} / divisor;",
    "const lazy = import('../../ui/View.js');",
  ].join("\n"));

  assert.deepEqual(
    references.map(reference => [reference.form, reference.specifier]),
    [["import()", "../../ui/View.js"]],
  );
});

test("ignores tests, fixtures, documentation, build scripts and commented examples", t => {
  const root = createProject(t, {
    "docs/example.js": "import '../src/ui/View.js';",
    "scripts/build.js": "import '../src/ui/View.js';",
    "src/domain/Policy.test.js": "import '../ui/View.js';",
    "src/domain/Policy.spec.js": "import '../ui/View.js';",
    "src/domain/fixtures/Fixture.js": "import '../../ui/View.js';",
    "src/domain/Safe.js": [
      "// import '../ui/View.js';",
      "/* export { view } from '../ui/View.js'; */",
      "const example = \"import('../ui/View.js')\";",
      "export const safe = example;",
    ].join("\n"),
    "src/ui/View.js": "export const view = true;",
  });

  assert.deepEqual(scanArchitectureBoundaries(root), []);
});

test("produces stable actionable diagnostics", t => {
  const root = createProject(t, {
    "src/domain/Policy.js": "import { view } from '../ui/View.js';",
    "src/ui/View.js": "export const view = true;",
  });

  const [violation] = scanArchitectureBoundaries(root);
  assert.equal(
    formatArchitectureViolation(violation),
    "src/domain/Policy.js:1:22 imports \"../ui/View.js\" -> src/ui/View.js "
      + "[domain-engine-to-ui] domain and engine must not import UI",
  );
  assert.throws(
    () => assertArchitectureBoundaries(root),
    error => error.name === "ArchitectureBoundaryError"
      && error.message.includes("src/domain/Policy.js")
      && error.message.includes("../ui/View.js")
      && error.message.includes("domain-engine-to-ui"),
  );
});

test("extractor reports only executable relative module references", () => {
  const references = extractRelativeModuleReferences([
    "import value from './value.js';",
    "export * from '../public.js';",
    "const lazy = import('./lazy.js');",
    "import 'node:fs';",
  ].join("\n"));

  assert.deepEqual(
    references.map(reference => [reference.form, reference.specifier]),
    [
      ["import", "./value.js"],
      ["export-from", "../public.js"],
      ["import()", "./lazy.js"],
    ],
  );
});

function createProject(t, files) {
  const root = mkdtempSync(join(tmpdir(), "singular-architecture-"));
  t.after(() => rmSync(root, { force: true, recursive: true }));

  for (const [filePath, contents] of Object.entries(files)) {
    const absolutePath = join(root, filePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, "utf8");
  }

  return root;
}
