from pathlib import Path

traits_path = Path("src/domain/character/Traits.js")
text = traits_path.read_text()
start = text.index("function mergeLegacyTraitInput(existing, incoming) {")
end = text.index("\nfunction legacyRoleEquivalent", start)
replacement = '''function mergeLegacyTraitInput(existing, incoming) {
  const incomingClone = cloneValue(incoming);
  const merged = {
    ...serializeTrait(existing),
    ...incomingClone,
  };

  if (!hasOwn(incomingClone, "pointValue")) {
    const pointValue = cloneValue(existing.pointValue);
    const previousCalculation = pointValue.baseCostCalculation;
    let calculationInputsChanged = false;
    const sourceKind = isPlainObject(merged.source)
      ? merged.source.kind
      : existing.source.kind;

    if (hasOwn(incomingClone, "points")) {
      const incomingPoints = normalizeLegacyNullableNumber(incomingClone.points);
      if (!Object.is(incomingPoints, existing.points)) {
        pointValue.legacyPoints = incomingPoints;
        calculationInputsChanged = true;
        if (
          pointValue.declaredPoints !== null ||
          sourceKind === "singular" ||
          EXTERNAL_SOURCE_KINDS.has(sourceKind)
        ) {
          pointValue.declaredPoints = incomingPoints;
        }
      }
    }

    if (hasOwn(incomingClone, "levels")) {
      const incomingLevels = normalizeLegacyNullableNumber(incomingClone.levels);
      if (!Object.is(incomingLevels, existing.levels)) {
        pointValue.levels = incomingLevels;
        calculationInputsChanged = true;
      }
    }

    if (calculationInputsChanged && previousCalculation !== null) {
      if (Object.is(
        pointValue.calculatedPoints,
        previousCalculation.calculatedPoints,
      )) {
        pointValue.calculatedPoints = null;
      }
      pointValue.baseCostCalculation = null;
    }

    merged.pointValue = pointValue;
  }

  return merged;
}
'''
traits_path.write_text(text[:start] + replacement + text[end:])

test_path = Path("src/domain/character/TraitBaseCostOperations.test.js")
tests = test_path.read_text()
if 'test("legacy level edit invalidates only the derived calculation"' not in tests:
    tests += '''

test("legacy level edit invalidates only the derived calculation", () => {
  const imported = createCharacter({
    traits: [{
      id: "trait-imported-level-edit",
      role: "advantage",
      name: "Importada por nível",
      points: 15,
      source: {
        kind: "imported",
        provider: "gcs",
        format: "gcs",
        reference: null,
        version: 2,
      },
      pointValue: {
        mode: "per-level",
        pointsPerLevel: 5,
        levels: 3,
        importedPoints: 15,
      },
    }],
  });
  const costed = recalculateTraitBaseCost(
    imported,
    "trait-imported-level-edit",
    { now: "2026-06-21T22:00:00.000Z" },
  );
  const edited = createCharacter({
    ...costed.character,
    advantages: costed.character.advantages.map(item => ({
      ...item,
      levels: 4,
    })),
  });
  const pointValue = edited.traits[0].pointValue;

  assert.equal(pointValue.levels, 4);
  assert.equal(pointValue.importedPoints, 15);
  assert.equal(pointValue.calculatedPoints, null);
  assert.equal(pointValue.baseCostCalculation, null);
  assert.equal(pointValue.reconciliation.status, "imported-only");
});
'''
    test_path.write_text(tests)

docs_path = Path("Docs/01-arquitetura/Traits.md")
docs = docs_path.read_text()
docs = docs.replace("**Código:** DOM-TRAIT-1.0 a 1.1", "**Código:** DOM-TRAIT-1.0 a 1.2")
docs = docs.replace("**Tipo:** Agregado canônico, identidade, papéis e autoridades de valor", "**Tipo:** Agregado canônico, autoridades de valor e cálculo-base")
docs = docs.replace("**Decisões:** ADR-0035 e ADR-0036", "**Decisões:** ADR-0035 a ADR-0037")
section = '''

## DOM-TRAIT-1.2 — Cálculo soberano do custo-base

O custo-base é calculado nos modos `total`, `per-level` e `base-plus-levels`. O resultado registra valor bruto, arredondamento, fingerprint e diagnósticos.

`importedPoints` nunca é promovido automaticamente a fórmula. Edições estruturais invalidam somente o cálculo derivado obsoleto e preservam as demais autoridades.

Documento: `TraitBaseCost.md`.  
Decisão: ADR-0037.
'''
if "## DOM-TRAIT-1.2 — Cálculo soberano do custo-base" not in docs:
    docs = docs.replace("\n## Compatibilidade", section + "\n## Compatibilidade", 1)
docs = docs.replace("DOM-TRAIT-1.0 e 1.1 não:", "DOM-TRAIT-1.0 a 1.2 não:")
docs = docs.replace("## Critério de conclusão do DOM-TRAIT-1.1", "## Critério de conclusão do DOM-TRAIT-1.2")
docs_path.write_text(docs)

status_path = Path("Docs/01-arquitetura/Traits-1.2-Status.md")
if status_path.exists():
    status_path.unlink()
Path(__file__).unlink()
