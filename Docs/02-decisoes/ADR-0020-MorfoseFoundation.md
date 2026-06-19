# ADR-0020 — Fundação estrutural de Morfose

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

Forma Alternativa e Morfose compartilham a infraestrutura de mudança temporária de templates, mas não são a mesma vantagem.

Forma Alternativa trabalha com um conjunto previamente definido de formas.

Morfose precisa acrescentar uma camada própria para:

- catálogo de formas conhecidas;
- aquisição e memorização;
- disponibilidade temporária;
- improvisação;
- limite declarado de pontos;
- preservação de referências externas ainda não resolvidas.

A implementação não deve duplicar planner, executor, runtime, continuidade ou histórico já fechados em Forma Alternativa.

## Terminologia

Na interface e na documentação em português, o nome é **Morfose**.

O identificador técnico permanece:

```text
morph
```

`Metamorfose` é uma entrada distinta e não será tratada como sinônimo automático.

## Decisão

Um `AlternateFormSet` com:

```js
mechanism: "morph"
```

possui obrigatoriamente:

```js
morphProfile
```

Conjuntos com `mechanism: "alternateForm"` mantêm:

```js
morphProfile: null
```

## Perfil

```js
{
  pointLimit,
  pointLimitSource,

  catalog: {
    mode,
    capacity
  },

  memorization: {
    mode,
    capacity
  },

  improvisation: {
    mode,
    pointLimit
  },

  knownForms,
  notes,
  tags,
  importMeta,
  raw
}
```

Os campos são declarativos. Esta etapa não calcula limite de pontos a partir do custo da vantagem ou de modificadores.

## Limite de pontos

Fontes aceitas:

```text
undeclared
manual
imported
modifier
campaign
```

O domínio registra valor e origem, mas não deriva o valor localmente.

## Catálogo conhecido

Cada entrada possui:

```js
{
  id,
  templateId,
  externalIds,
  name,
  acquisitionMethod,
  acquiredAt,
  state,
  notes,
  tags,
  importMeta,
  raw
}
```

Métodos de aquisição iniciais:

```text
unknown
manual
imported
memorized
observed
```

Estados:

```text
available
unavailable
forgotten
```

`forgotten` preserva proveniência em vez de apagar silenciosamente a entrada.

## Referências de template

Uma entrada resolvida usa `templateId` e deve apontar para `Character.templates`.

Uma entrada importada ainda não resolvida usa:

```js
templateId: null
externalIds: { ... }
```

O importador ou linker futuro poderá resolver a referência sem perder o identificador original.

## Unicidade

Dentro de um perfil:

- IDs de entradas são únicos;
- um mesmo `templateId` não aparece duas vezes;
- referências nulas podem coexistir quando representam entradas externas distintas.

## Operações

```js
registerMorphKnownForm(...)
forgetMorphKnownForm(...)
restoreMorphKnownForm(...)
setMorphKnownFormAvailability(...)
setMorphPointLimit(...)
listAvailableMorphKnownForms(...)
```

Todas são imutáveis e retornam um Character novo.

## Reutilização da infraestrutura

Morfose continuará usando:

- `AlternateFormSet`;
- políticas de continuidade;
- regras de transição;
- planner;
- executor;
- runtime;
- histórico.

A futura seleção de uma forma de Morfose materializará temporariamente uma entrada do catálogo como forma utilizável, sem transformar o catálogo em uma lista paralela de componentes do personagem.

## Não responsabilidades

Esta fundação não:

- calcula o custo de Morfose;
- calcula o limite oficial de pontos;
- decide automaticamente quais formas são conhecidas;
- seleciona ou ativa uma forma;
- improvisa templates;
- aplica penalidades;
- resolve observação, memorização ou aquisição;
- trata `Metamorfose` como Morfose.
