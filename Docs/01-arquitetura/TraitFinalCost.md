# TraitFinalCost — Controles, escolhas e custo individual

**Código:** DOM-TRAIT-1.4  
**Status:** Implementado mediante CI canônica verde  
**Camada:** Domain  
**Decisão:** ADR-0039

## Responsabilidade

`TraitFinalCost` calcula o custo individual de um Trait depois do custo-base, dos modificadores, do autocontrole e da frequência.

```text
Trait declara.
TraitBaseCost calcula a estrutura-base.
TraitModifierCost interpreta modifiers.
TraitControl fornece multiplicadores conhecidos.
TraitFinalCost compõe e arredonda uma única vez.
A UI apenas apresenta.
```

O resultado é derivado. Não existe uma segunda coleção persistente de cálculos.

## Campos declarativos do Trait

```js
{
  selfControl: {
    roll,
    status,
    multiplier,
    penalty,
    adjustment: {
      type,
      status,
      value,
    },
    raw,
  },
  frequency: {
    roll,
    status,
    multiplier,
    raw,
  },
  roundCostDown,
  choices: [
    {
      key,
      value,
      required,
    },
  ],
}
```

`status` e `multiplier` são derivados durante a criação do agregado e validados contra as tabelas soberanas.

## Autocontrole

| Teste | Multiplicador | Penalidade operacional |
|---:|---:|---:|
| nenhum (`0`) | 1 | 0 |
| nunca resiste (`1`) | 2,5 | -5 |
| 6 | 2 | -4 |
| 7 | 1,83 | -4 |
| 8 | 1,67 | -3 |
| 9 | 1,5 | -3 |
| 10 | 1,33 | -3 |
| 11 | 1,17 | -2 |
| 12 | 1 | -2 |
| 13 | 0,83 | -2 |
| 14 | 0,67 | -1 |
| 15 | 0,5 | -1 |

O ajuste operacional pode representar:

```text
none
action-penalty
reaction-penalty
fright-check-penalty
fright-check-bonus
minor-cost-of-living-increase
major-cost-of-living-increase
unknown
```

O ajuste não participa da multiplicação de pontos.

## Frequência

| Teste | Multiplicador |
|---:|---:|
| nenhum (`0`) | 1 |
| 6 | 0,5 |
| 9 | 1 |
| 12 | 2 |
| 15 | 3 |
| constante (`18`) | 4 |

## Escolhas

`TraitChoices` converte mapas externos e declarações locais para uma coleção identificada por chave.

```text
key ≠ rótulo
key ≠ nome do Trait
key ≠ posição
```

A avaliação de escolhas expõe:

```js
{
  status: "ready" | "incomplete",
  complete,
  missingKeys,
  choices,
}
```

Somente escolhas marcadas como `required` bloqueiam a completude dessa avaliação. Nenhum consumidor deve tentar descobrir escolhas obrigatórias a partir de texto livre.

## Fluxo de custo

```text
modifierCost = TraitModifierCost(rounding: none)

beforeControl = modifierCost.rawPoints
afterSelfControl = beforeControl × selfControl.multiplier
rawPoints = afterSelfControl × frequency.multiplier
calculatedPoints = arredondar(rawPoints, roundCostDown)
```

### Política percentual

`percentageMode` continua sendo uma política explícita encaminhada ao avaliador de modificadores:

```text
additive
multiplicative
```

### Arredondamento final

```text
roundCostDown = false → up
roundCostDown = true  → down
```

- `up`: positivos usam teto; negativos avançam em direção a zero;
- `down`: positivos usam piso; negativos avançam em direção negativa.

O resultado registra:

```js
rounding: {
  policy,
  applied,
  input,
  output,
  difference,
}
```

## Estados

```text
ready
incomplete
conflict
unsupported
```

`TraitFinalCost` propaga estados do custo modificado.

Testes de autocontrole ou frequência desconhecidos produzem `unsupported`, pois não há multiplicador seguro. Ajuste operacional desconhecido não bloqueia pontos quando o multiplicador de autocontrole é conhecido.

## Resultado derivado

```js
{
  traitId,
  status,
  complete,
  policy,
  modifierCost,
  selfControl,
  frequency,
  beforeControl,
  selfControlMultiplier,
  afterSelfControl,
  frequencyMultiplier,
  rawPoints,
  calculatedPoints,
  rounding,
  diagnostics,
}
```

Resultados não prontos mantêm os campos numéricos finais como `null`.

## Persistência e grupos

O cálculo individual não é gravado em `Trait.pointValue.calculatedPoints` nesta etapa.

Grupos alternativos aplicam uma regra entre múltiplos Traits e precisam decidir a contribuição final antes da promoção da autoridade calculada.

```text
TraitFinalCost = custo individual
contribuição do grupo = etapa posterior
```

## Compatibilidade GCS

A fronteira reconhece:

```text
cr
cr_adj
frequency
round_down
replacements
```

A serialização canônica usa somente:

```text
selfControl
frequency
roundCostDown
choices
```

Quando todos os novos campos estão ausentes ou em seus valores neutros, as projeções históricas conservam a forma anterior.
