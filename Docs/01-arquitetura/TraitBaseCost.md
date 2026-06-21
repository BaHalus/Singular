# Cálculo-base de Traits

**Código:** DOM-TRAIT-1.2  
**Status:** Implementado mediante CI canônica verde  
**Camada:** Domain  
**Decisão:** ADR-0037

## Objetivo

Calcular somente o custo-base declarado por um Trait, antes de modificadores, grupos alternativos, autocontrole ou agregação global.

```text
declaração estrutural
→ cálculo puro
→ arredondamento explícito
→ calculatedPoints
→ reconciliação das autoridades
```

## Modos calculáveis

```text
total
per-level
base-plus-levels
```

Fórmulas:

```text
total            = custo fixo declarado
per-level        = pointsPerLevel × levels
base-plus-levels = basePoints + pointsPerLevel × levels
```

`total` usa somente `basePoints` ou `declaredPoints`. `importedPoints` é evidência externa e nunca é promovido silenciosamente a regra de cálculo.

## Estados

```text
calculated
incomplete
unsupported
conflict
```

- `incomplete`: falta uma entrada estrutural;
- `unsupported`: modo ainda sem regra soberana;
- `conflict`: declarações incompatíveis;
- `calculated`: fórmula completa e resultado válido.

## Snapshot persistido

Um resultado aplicado ao Trait é salvo em:

```js
pointValue.baseCostCalculation = {
  schemaVersion,
  status,
  mode,
  input,
  inputFingerprint,
  rawPoints,
  calculatedPoints,
  rounding,
  diagnostics,
}
```

O snapshot é validado novamente contra `pointValue`. Mudança nas entradas torna o cálculo obsoleto.

## Arredondamento

O padrão é:

```text
none
```

Portanto, custos fracionários permanecem exatos no cálculo-base. Políticas disponíveis:

```text
none
ceiling
floor
nearest
toward-zero
away-from-zero
```

A política e o incremento ficam registrados no snapshot. Este bloco não presume a regra final de arredondamento após modificadores.

## Aplicação

```js
withTraitBaseCostCalculation(trait, options)
recalculateTraitBaseCost(character, traitId, options)
```

A operação no Character:

- localiza por ID soberano;
- calcula a partir do estado atual;
- cria novo Trait;
- reconstrói e valida o Character uma vez;
- retorna recibo com fingerprint e política de arredondamento.

## Separação arquitetural

DOM-TRAIT-1.2 não:

- aplica enhancements ou limitations;
- usa custo importado como fórmula;
- escolhe um valor efetivo em divergências;
- calcula grupos alternativos;
- resolve autocontrole;
- agrega o total do personagem;
- calcula na UI.

O próximo bloco é DOM-TRAIT-1.3 — modificadores.
