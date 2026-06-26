# ADR-0055 — Totais mínimos de equipamentos

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-EQUIPMENT-MVP-1.0

## Contexto

`Character.equipment` já possui estrutura mínima para itens e recipientes, com quantidade, custo unitário, peso unitário em kg, estado operacional e filhos.

A Alpha mobile precisa consumir totais determinísticos sem calcular na UI e sem persistir derivados no `Character`.

## Decisão

O motor passa a expor:

```js
resolveEquipmentTotals(equipment)
```

A função recebe a estrutura canônica de equipamentos e produz relatório derivado, portátil, validado e imutável.

## Entradas mínimas consumidas

Cada entrada usa somente:

```js
{
  id,
  name,
  quantity,
  cost,
  weightKg,
  state,
  children
}
```

Outros campos permanecem fora desta conta mínima.

## Estados operacionais

Estados reconhecidos:

- `equipped`
- `carried`
- `stored`
- `dropped`
- `ignored`

Para a Alpha:

- `equipped`, `carried` e `stored` entram no peso operacional;
- `dropped` permanece no total econômico, mas não entra no peso operacional;
- `ignored` não entra nos totais contados, mas seus filhos continuam sendo resolvidos individualmente.

Essa regra é deliberadamente mínima e não implementa regras completas de carga nem herança de estado por recipiente.

## Resultado

```js
{
  schemaVersion: 1,
  status: "resolved" | "blocked",
  totals: {
    itemCount,
    quantity,
    cost,
    weightKg,
    loadWeightKg,
    byState
  },
  entries: [],
  diagnostics: []
}
```

Cada entrada preserva identificação, estado, quantidade, custo e peso unitários, totais próprios, totais incluindo filhos, filhos resolvidos e diagnósticos locais.

## Diagnósticos e resultados parciais

Entradas inválidas ficam `blocked` e contribuem com zero para seus próprios totais. O relatório global fica `blocked` quando existir diagnóstico, mas mantém resultados parciais portáteis.

## Fronteiras

O resolvedor não altera `Character`, não persiste totais derivados, não modifica UI, não modifica Application Read Model e não interpreta formatos externos.

## Invariantes

1. O domínio declara a estrutura persistente.
2. O motor calcula os totais.
3. A aplicação poderá orquestrar o consumo posterior.
4. A UI não calcula peso, custo ou quantidade.
5. Totais derivados são reconstruíveis a partir de `Character.equipment`.
6. Entradas iguais produzem relatórios iguais.
7. O relatório é JSON-portável e profundamente imutável.
8. A ligação com `Character`, aplicação e UI deve ocorrer em PR posterior e coordenada.
