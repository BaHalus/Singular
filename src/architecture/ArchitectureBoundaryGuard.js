import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

const IGNORED_DIRECTORY_NAMES = new Set([
  "__tests__",
  "fixture",
  "fixtures",
  "test",
  "tests",
]);

const BOUNDARY_RULES = Object.freeze({
  DOMAIN_ENGINE_TO_UI: Object.freeze({
    id: "domain-engine-to-ui",
    message: "domain and engine must not import UI",
  }),
  DOMAIN_ENGINE_TO_APPLICATION: Object.freeze({
    id: "domain-engine-to-application",
    message: "domain and engine must not import application",
  }),
  DOMAIN_ENGINE_TO_CONCRETE_PERSISTENCE: Object.freeze({
    id: "domain-engine-to-concrete-persistence",
    message: "domain and engine must not import concrete persistence",
  }),
  APPLICATION_TO_UI: Object.freeze({
    id: "application-to-ui",
    message: "application must not import UI",
  }),
  PERSISTENCE_TO_UI: Object.freeze({
    id: "persistence-to-ui",
    message: "persistence must not import UI",
  }),
  TRAIT_TO_EQUIPMENT: Object.freeze({
    id: "trait-to-equipment",
    message: "production Trait modules must not import production Equipment modules",
  }),
  EQUIPMENT_TO_TRAIT: Object.freeze({
    id: "equipment-to-trait",
    message: "production Equipment modules must not import production Trait modules",
  }),
});

export function scanArchitectureBoundaries(rootDirectory) {
  const projectRoot = resolve(rootDirectory);
  const sourceRoot = join(projectRoot, "src");

  if (!existsSync(sourceRoot) || !statSync(sourceRoot).isDirectory()) {
    throw new Error(`Architecture boundary source root not found: ${sourceRoot}`);
  }

  const violations = [];

  for (const sourceFile of collectProductionJavaScriptFiles(sourceRoot)) {
    const source = readFileSync(sourceFile, "utf8");

    for (const moduleReference of extractRelativeModuleReferences(source)) {
      const targetFile = resolveRelativeModule(sourceFile, moduleReference.specifier);

      for (const rule of findViolatedRules(projectRoot, sourceFile, targetFile)) {
        violations.push(Object.freeze({
          column: moduleReference.column,
          form: moduleReference.form,
          line: moduleReference.line,
          origin: toProjectPath(projectRoot, sourceFile),
          rule: rule.id,
          ruleMessage: rule.message,
          specifier: moduleReference.specifier,
          target: toProjectPath(projectRoot, targetFile),
        }));
      }
    }
  }

  return Object.freeze(violations);
}

export function assertArchitectureBoundaries(rootDirectory) {
  const violations = scanArchitectureBoundaries(rootDirectory);

  if (violations.length === 0) {
    return;
  }

  const diagnostics = violations.map(formatArchitectureViolation).join("\n");
  const error = new Error(
    `Architecture boundary violations (${violations.length}):\n${diagnostics}`,
  );
  error.name = "ArchitectureBoundaryError";
  error.violations = violations;
  throw error;
}

export function formatArchitectureViolation(violation) {
  return `${violation.origin}:${violation.line}:${violation.column} imports `
    + `"${violation.specifier}" -> ${violation.target} `
    + `[${violation.rule}] ${violation.ruleMessage}`;
}

export function collectProductionJavaScriptFiles(sourceRoot) {
  const files = [];

  visitDirectory(resolve(sourceRoot), files);

  return Object.freeze(files.sort((left, right) => left.localeCompare(right)));
}

export function extractRelativeModuleReferences(source) {
  const tokens = tokenizeJavaScript(source);
  const references = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.type !== "identifier") {
      continue;
    }

    if (token.value === "import" && tokens[index - 1]?.value !== ".") {
      const result = readImportReference(tokens, index);

      if (result !== null) {
        if (result.reference.specifier.startsWith(".")) {
          references.push(result.reference);
        }
        index = result.endIndex;
      }
      continue;
    }

    if (token.value === "export") {
      const result = readExportReference(tokens, index);

      if (result !== null) {
        if (result.reference.specifier.startsWith(".")) {
          references.push(result.reference);
        }
        index = result.endIndex;
      }
    }
  }

  return Object.freeze(references.map(reference => Object.freeze(reference)));
}

function visitDirectory(directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORY_NAMES.has(entry.name.toLowerCase())) {
        visitDirectory(join(directory, entry.name), files);
      }
      continue;
    }

    if (entry.isFile() && isProductionJavaScriptFile(entry.name)) {
      files.push(join(directory, entry.name));
    }
  }
}

function isProductionJavaScriptFile(fileName) {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith(".js")
    && !lowerName.endsWith(".test.js")
    && !lowerName.endsWith(".spec.js");
}

function readImportReference(tokens, importIndex) {
  const first = tokens[importIndex + 1];

  if (first?.value === "(" && tokens[importIndex + 2]?.type === "string") {
    return createReferenceResult(tokens[importIndex + 2], "import()", importIndex + 2);
  }

  if (first?.type === "string") {
    return createReferenceResult(first, "import", importIndex + 1);
  }

  return findFromReference(tokens, importIndex + 1, "import");
}

function readExportReference(tokens, exportIndex) {
  const first = tokens[exportIndex + 1];

  if (first?.value !== "{" && first?.value !== "*") {
    return null;
  }

  return findFromReference(tokens, exportIndex + 1, "export-from");
}

function findFromReference(tokens, startIndex, form) {
  let braceDepth = 0;

  for (let index = startIndex; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (token.value === "{") {
      braceDepth += 1;
    } else if (token.value === "}") {
      braceDepth -= 1;
    }

    if (
      token.type === "identifier"
      && token.value === "from"
      && tokens[index + 1]?.type === "string"
    ) {
      return createReferenceResult(tokens[index + 1], form, index + 1);
    }

    if (
      braceDepth === 0
      && (
        token.value === ";"
        || (index > startIndex && token.type === "identifier" && (
          token.value === "import" || token.value === "export"
        ))
      )
    ) {
      return null;
    }
  }

  return null;
}

function createReferenceResult(stringToken, form, endIndex) {
  return {
    endIndex,
    reference: {
      column: stringToken.column,
      form,
      line: stringToken.line,
      specifier: stringToken.value,
    },
  };
}

function tokenizeJavaScript(source) {
  const tokens = [];
  let index = 0;
  let line = 1;
  let column = 1;

  const advance = () => {
    const character = source[index];
    index += 1;
    if (character === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
    return character;
  };

  while (index < source.length) {
    const character = source[index];

    if (isWhitespace(character)) {
      advance();
      continue;
    }

    if (character === "/" && source[index + 1] === "/") {
      while (index < source.length && advance() !== "\n") {
        // Skip line comment.
      }
      continue;
    }

    if (character === "/" && source[index + 1] === "*") {
      advance();
      advance();
      while (index < source.length) {
        if (source[index] === "*" && source[index + 1] === "/") {
          advance();
          advance();
          break;
        }
        advance();
      }
      continue;
    }

    if (character === "\"" || character === "'") {
      const quote = advance();
      const tokenLine = line;
      const tokenColumn = column - 1;
      let value = "";
      let escaped = false;

      while (index < source.length) {
        const stringCharacter = advance();
        if (escaped) {
          value += stringCharacter;
          escaped = false;
        } else if (stringCharacter === "\\") {
          escaped = true;
        } else if (stringCharacter === quote) {
          break;
        } else {
          value += stringCharacter;
        }
      }

      tokens.push({
        column: tokenColumn,
        line: tokenLine,
        type: "string",
        value,
      });
      continue;
    }

    if (character === "`") {
      advance();
      let escaped = false;
      while (index < source.length) {
        const templateCharacter = advance();
        if (escaped) {
          escaped = false;
        } else if (templateCharacter === "\\") {
          escaped = true;
        } else if (templateCharacter === "`") {
          break;
        }
      }
      continue;
    }

    if (isIdentifierStart(character)) {
      const tokenLine = line;
      const tokenColumn = column;
      let value = "";
      while (index < source.length && isIdentifierPart(source[index])) {
        value += advance();
      }
      tokens.push({ type: "identifier", value, line: tokenLine, column: tokenColumn });
      continue;
    }

    tokens.push({ type: "punctuation", value: advance(), line, column: column - 1 });
  }

  return tokens;
}

function isWhitespace(character) {
  return character === " " || character === "\t" || character === "\r" || character === "\n";
}

function isIdentifierStart(character) {
  if (character === "$" || character === "_") {
    return true;
  }
  const code = character?.charCodeAt(0) ?? 0;
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isIdentifierPart(character) {
  const code = character?.charCodeAt(0) ?? 0;
  return isIdentifierStart(character) || (code >= 48 && code <= 57);
}

function resolveRelativeModule(sourceFile, specifier) {
  const unresolved = resolve(dirname(sourceFile), specifier);
  const candidates = extname(unresolved) === ""
    ? [unresolved, `${unresolved}.js`, join(unresolved, "index.js")]
    : [unresolved];

  return candidates.find(candidate => existsSync(candidate)) ?? unresolved;
}

function findViolatedRules(projectRoot, sourceFile, targetFile) {
  const sourcePath = toProjectPath(projectRoot, sourceFile);
  const targetPath = toProjectPath(projectRoot, targetFile);
  const rules = [];
  const sourceIsDomainOrEngine = isWithin(sourcePath, "src/domain")
    || isWithin(sourcePath, "src/engine");
  const targetIsUi = isWithin(targetPath, "src/ui");

  if (sourceIsDomainOrEngine && targetIsUi) {
    rules.push(BOUNDARY_RULES.DOMAIN_ENGINE_TO_UI);
  }
  if (sourceIsDomainOrEngine && isWithin(targetPath, "src/application")) {
    rules.push(BOUNDARY_RULES.DOMAIN_ENGINE_TO_APPLICATION);
  }
  if (sourceIsDomainOrEngine && isWithin(targetPath, "src/infrastructure/persistence")) {
    rules.push(BOUNDARY_RULES.DOMAIN_ENGINE_TO_CONCRETE_PERSISTENCE);
  }
  if (isWithin(sourcePath, "src/application") && targetIsUi) {
    rules.push(BOUNDARY_RULES.APPLICATION_TO_UI);
  }
  if (isPersistencePath(sourcePath) && targetIsUi) {
    rules.push(BOUNDARY_RULES.PERSISTENCE_TO_UI);
  }
  if (isNamedModule(sourceFile, "Trait") && isNamedModule(targetFile, "Equipment")) {
    rules.push(BOUNDARY_RULES.TRAIT_TO_EQUIPMENT);
  }
  if (isNamedModule(sourceFile, "Equipment") && isNamedModule(targetFile, "Trait")) {
    rules.push(BOUNDARY_RULES.EQUIPMENT_TO_TRAIT);
  }

  return rules;
}

function isPersistencePath(projectPath) {
  return isWithin(projectPath, "src/application/persistence")
    || isWithin(projectPath, "src/infrastructure/persistence");
}

function isNamedModule(filePath, prefix) {
  return basename(filePath).startsWith(prefix);
}

function isWithin(projectPath, directory) {
  return projectPath === directory || projectPath.startsWith(`${directory}/`);
}

function toProjectPath(projectRoot, filePath) {
  const projectPath = relative(projectRoot, filePath);
  if (isAbsolute(projectPath) || projectPath === ".." || projectPath.startsWith(`..${sep}`)) {
    return filePath.split(sep).join("/");
  }
  return projectPath.split(sep).join("/");
}
