# Custo e reconciliação de Templates

**Código:** DOM-TEMPLATE-1.4  
**Status:** Implementado  
**Camada:** Domain  
**Decisão:** ADR-0033

## Objetivo

Separar explicitamente:

```text
custo importado
custo calculado
diferença
estado da reconciliação
```

Nenhum valor é sobrescrito silenciosamente.

## Avaliação de um Template

```js
evaluateTemplatePointReconciliation(template)
```

Resultado:

```js
{
  scope: "template",
  templateId,
  status,
  complete,
  reconciled,
  importedPoints,
  calculatedPoints,
  difference,
  absoluteDifference,
  diagnostics,
}
```

Estados:

```text
unknown
imported-only
calculated-only
partial
reconciled
divergent
```

`difference` usa:

```text
calculatedPoints - importedPoints
```

Valores negativos são válidos.

## Registro do valor calculado

```js
withTemplateCalculatedPoints(template, calculatedPoints)
```

A operação cria novo Template imutável e preserva `importedPoints`. `null` remove apenas o valor calculado.

O módulo não calcula o custo; ele recebe o resultado de uma autoridade calculadora e o reconcilia.

## Avaliação da composição

```js
evaluateTemplateCompositionPointReconciliation(
  templates,
  resolvedComposition,
)
```

A composição expõe:

- totais completos quando todos os valores existem;
- subtotais conhecidos quando há lacunas;
- IDs sem custo importado;
- IDs sem custo calculado;
- templates individualmente divergentes;
- diferença total quando os dois totais são completos.

Um pacote pode fechar no mesmo total mesmo quando membros individuais divergem. As duas informações são preservadas.

## Diagnósticos

Códigos principais:

```text
template-points-unknown
template-calculated-points-missing
template-imported-points-missing
template-points-divergent
template-composition-imported-points-incomplete
template-composition-calculated-points-incomplete
template-composition-points-divergent
template-composition-points-unknown
```

Divergência é `warning`, não correção automática. Ausência é `pending`.

## Imutabilidade

Avaliações são profundamente imutáveis. Serialização para apresentação ou recibos usa:

```js
serializeTemplatePointReconciliation(result)
```

## Relação com DOM-POINTS

DOM-TEMPLATE-1.4 reconcilia somente valores declarados no pacote. Ele não agrega o total global do personagem.

O futuro DOM-POINTS consumirá as contribuições reconciliadas e continuará sendo a autoridade do orçamento do Character.

## Não responsabilidades

Este bloco não soma pontos do personagem, não calcula componentes internos, não escolhe qual valor prevalece, não corrige importações e não calcula na UI.

## Continuidade

```text
DOM-TEMPLATE-1.5 — Importação e fechamento
```
