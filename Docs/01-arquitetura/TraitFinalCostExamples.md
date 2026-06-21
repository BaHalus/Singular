# Exemplos auditáveis — TraitFinalCost

## Autocontrole e frequência que se compensam

```text
base: 10
modifier: +20%
antes dos controles: 12
CR 6: ×2 → 24
FR 6: ×0,5 → 12
resultado: 12
```

## Fração preservada até o fim

```text
base: 5
modifier: +10% → 5,5
CR 15: ×0,5 → 2,75
FR 12: ×2 → 5,5
roundCostDown false: 6
```

Não existe arredondamento em `5,5` nem em `2,75`.

## Direção negativa

```text
base modificada: -5,5
roundCostDown false: -5
roundCostDown true: -6
```

A direção é declarada no Trait e registrada na avaliação.
