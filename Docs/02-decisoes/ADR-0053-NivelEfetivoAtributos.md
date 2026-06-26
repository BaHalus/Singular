# ADR-0053 — Nível efetivo dos atributos

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-ATTR-1.1

## Contexto

`Attributes` preserva, para cada atributo básico, dois valores:

```js
{
  base,
  override
}
```

A documentação canônica determina que `override` substitui somente o resultado final, sem alterar o valor-base nem a fórmula. A resolução global de Skills precisa de uma autoridade explícita para transformar essa estrutura no nível efetivo consumido pelo motor.

## Decisão

O motor passa a expor:

```js
resolveAttributeLevel({ attributeKey, attribute })
resolveAttributeLevels(attributes)
```

A regra é:

```text
nível efetivo = override, quando override não é null
nível efetivo = base, caso contrário
```

O valor zero é um override válido. A decisão depende de nulidade, não de truthiness.

## Resultado unitário

```js
{
  schemaVersion: 1,
  attribute: "DX",
  status: "resolved" | "blocked",
  level: 12,
  source: "base" | "override",
  diagnostics: []
}
```

O resultado é portátil, validado, profundamente imutável e não altera a estrutura recebida.

## Entradas inválidas

`Attributes` continua responsável pela integridade estrutural. O motor bloqueia valores efetivos numéricos não finitos, como `NaN` e infinitos, e os representa por diagnóstico portátil.

Valores finitos permanecem válidos nesta etapa. Limites editoriais ou regras de custo pertencem a contratos próprios.

## Relatório agregado

`resolveAttributeLevels` resolve `ST`, `DX`, `IQ` e `HT` na ordem canônica e produz um relatório imutável. Um atributo bloqueado não impede os demais resultados; o consumidor decide se uma operação posterior pode prosseguir parcialmente.

## Fronteiras

Esta etapa não:

- calcula custos em pontos;
- aplica modificadores de Traits, Templates, equipamentos ou condições;
- calcula características secundárias;
- altera `Attributes` ou `Character`;
- persiste níveis derivados;
- resolve Skills ou Techniques;
- modifica Application Read Model ou UI.

## Alternativas rejeitadas

### Usar sempre `base`

Rejeitada porque ignoraria a semântica documentada de `override`.

### Somar `base` e `override`

Rejeitada porque `override` é substituição do resultado final, não modificador incremental.

### Resolver na aplicação ou UI

Rejeitada porque criaria uma autoridade mecânica paralela.

### Usar `override || base`

Rejeitada porque trataria override zero como ausente.

## Invariantes

1. `Attributes` permanece a fonte persistente.
2. O motor é a autoridade do nível efetivo.
3. `override` não altera `base`.
4. Override zero é válido.
5. O resultado não é persistido no `Character`.
6. A aplicação apenas consome o resultado.
7. A UI não decide precedência.
8. Entradas iguais produzem resultados iguais.
