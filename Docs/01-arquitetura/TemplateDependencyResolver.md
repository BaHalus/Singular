# Dependências e composição de Templates

**Código:** DOM-TEMPLATE-1.2  
**Status:** Implementado  
**Camada:** Domain  
**Tipo:** Resolver de grafo e projeção explicável  
**Decisão:** ADR-0031

## Objetivo

DOM-TEMPLATE-1.2 resolve relações entre templates declaradas por `templateReference`, sem aplicar pacotes ao `Character` e sem interpretar contribuições de outros domínios.

```text
Template.entries
→ referências explícitas
→ grafo de dependências
→ ordem determinística
→ composição explicável
```

`Template.entries` continua sendo a única autoridade persistente.

## Referência interna

```js
{
  domain: "template",
  entryType: "templateReference",
  referenceId: "template:fey-ancestry",
  payload: {
    relation: "include",
    referenceScope: "internal",
  },
}
```

Quando `referenceScope` é omitido, o escopo é `internal`. O valor de `referenceId` precisa corresponder exatamente a `Template.id`.

Nome, posição e ordem nunca resolvem a referência.

## Referência externa

```js
{
  domain: "template",
  entryType: "templateReference",
  referenceId: "gcs-template-123",
  payload: {
    relation: "include",
    referenceScope: "external",
    externalKey: "gcs",
  },
}
```

O resolver procura exclusivamente:

```text
Template.externalIds[externalKey] === referenceId
```

Resultados:

```text
0 candidatos → unresolved-external
1 candidato  → resolved
2+ candidatos → ambiguous-external
```

Referência externa não resolvida permanece `pending`. Ambiguidade é bloqueante.

## API principal

```js
resolveTemplateComposition(templates, {
  rootTemplateIds,
})
```

Quando `rootTemplateIds` não é informado, todos os templates do catálogo são raízes, na ordem declarada.

## Resultado

```js
{
  status: "ready" | "pending" | "blocked",
  complete,
  rootTemplateIds,
  reachableTemplateIds,
  orderedTemplateIds,
  dependencies,
  cycles,
  conflicts,
  contributions,
  diagnostics,
}
```

## Dependências

```js
{
  sourceTemplateId,
  entryId,
  relation,
  scope,
  referenceId,
  externalKey,
  status,
  resolvedTemplateId,
  candidateTemplateIds,
  declaration,
}
```

Estados:

```text
resolved
missing
unresolved-external
ambiguous-external
```

Uma dependência interna ausente é bloqueante. Uma referência externa ainda não carregada é pendente. Uma referência externa ambígua é bloqueante.

## Ordem determinística

A ordem é topológica e coloca dependências antes de seus dependentes.

Critérios:

1. ordem explícita das raízes;
2. ordem das `templateReference` em `entries`;
3. cada template aparece uma única vez;
4. o mesmo save produz a mesma ordem.

O resolver não ordena alfabeticamente e não usa nomes.

## Ciclos

Um ciclo produz caminho fechado:

```js
{
  templateIds: ["a", "b", "c", "a"],
}
```

Ciclos são bloqueantes. O resolver preserva o diagnóstico e não tenta escolher arbitrariamente um ponto de quebra.

## Contribuições compostas

Entradas que não são `templateReference` são projetadas como contribuições:

```js
{
  key: "templateId::entryId",
  templateId,
  entryId,
  domain,
  entryType,
  referenceId,
  conflictKey,
  declaration,
  originPaths,
}
```

`originPaths` explica cada caminho pelo qual a contribuição foi alcançada.

Exemplo:

```js
[
  ["raiz", "ancestralidade", "corpo"],
  ["raiz", "profissão", "corpo"],
]
```

A contribuição aparece uma vez, mas todas as origens são preservadas.

## Conflitos

Templates não deduz conflito a partir de alvo, nome ou domínio. Um conflito de contribuição só é diagnosticado quando as entradas declaram explicitamente o mesmo:

```js
payload.conflictKey
```

Se as declarações forem equivalentes, não há conflito. Se forem divergentes, o resultado é bloqueado.

Ambiguidade de identidade externa também produz conflito estrutural.

## Diagnósticos

Códigos principais:

```text
template-root-missing
template-dependency-missing
template-external-reference-unresolved
template-external-reference-ambiguous
template-dependency-cycle
template-external-id-conflict
template-contribution-conflict
```

Severidades:

```text
info
pending
blocked
```

## Imutabilidade

O resultado é profundamente imutável. A serialização do resultado é apenas para inspeção, logs ou planejamento futuro:

```js
serializeResolvedTemplateComposition(result)
```

O resultado não é gravado em `Character.templates` e pode ser reconstruído.

## Save/load

A fonte persistida continua sendo:

```text
Template.entries
Template.externalIds
```

Após `serializeTemplates` e `createTemplates`, a resolução produz a mesma ordem, dependências e proveniência.

## Não responsabilidades

DOM-TEMPLATE-1.2 não:

- aplica templates ao `Character`;
- clona componentes;
- remove aplicações;
- calcula pontos;
- reconcilia custos;
- interpreta atributos, traits, perícias ou equipamentos;
- decide como conflitos serão resolvidos pelo usuário;
- carrega bibliotecas externas automaticamente;
- cria vínculo por nome;
- altera Forma Alternativa ou Morfose;
- calcula na UI.

## Continuidade

```text
DOM-TEMPLATE-1.3 — Aplicação ao Character
```

O próximo bloco usará a composição resolvida para analisar, planejar, revalidar e aplicar pacotes atomicamente, preservando escolhas e proveniência.
