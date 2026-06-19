# ADR-0022 — Seleção e materialização de forma conhecida de Morfose

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

DOM-MORPH-1.0 criou o catálogo de formas conhecidas. DOM-MORPH-1.1 vinculou o conjunto de Morfose à vantagem e resolveu suas políticas. Ainda faltava transformar uma entrada declarativa do catálogo em uma forma transitória utilizável pelo planner e pelo executor já consolidados.

A solução não pode:

- incorporar o template permanentemente;
- duplicar a engine de Forma Alternativa;
- escolher templates por nome aproximado;
- ativar a forma durante a materialização;
- manter uma forma obsoleta quando o template muda;
- permitir a seleção de forma esquecida ou indisponível;
- aplicar antecipadamente regras de limite ainda reservadas ao DOM-MORPH-1.5.

## Decisão

Uma forma conhecida disponível e com `templateId` resolvido pode ser materializada em `AlternateFormSet.forms`.

A materialização é uma projeção transitória e persistível da entrada do catálogo, não uma incorporação permanente.

Fluxo:

```text
MorphKnownForm
→ materialização em AlternateForm
→ FormTransitionPlanner
→ FormTransitionExecutor
→ runtime e histórico existentes
```

## Estrutura da forma materializada

```js
{
  id,
  name,
  templateId,
  sourceTraitId,
  morphKnownFormId,
  morphMaterialization,
  runtimeState,
  transitionRules,
  ...
}
```

Proveniência:

```js
{
  knownFormId,
  templateId,
  templateFingerprint,
  materializedAt,
  sourceName,
  acquisitionMethod,
  externalIds
}
```

## Identidade

O ID padrão é determinístico:

```text
morph:<formSetId>:<knownFormId>
```

Uma entrada conhecida só pode possuir uma materialização por conjunto.

O ID pode ser informado explicitamente, desde que não colida com outra forma.

## Estados da análise

```text
ready
pending
blocked
```

Motivos pendentes:

```text
morph-known-form-template-unresolved
```

Motivos bloqueantes:

```text
morph-known-form-not-found
morph-known-form-unavailable
morph-known-form-forgotten
morph-known-form-template-missing
morph-materialization-invalid
morph-materialization-stale
```

## Template não resolvido

Uma entrada importada com:

```js
templateId: null
```

permanece no catálogo, mas não pode ser materializada. Nenhum template é inferido por nome.

## Materialização obsoleta

A materialização registra um fingerprint canônico do template.

Se o template mudar:

- o planner bloqueia a forma antiga;
- o executor rejeita um plano previamente criado durante a revalidação;
- a atualização exige `refresh: true`;
- uma materialização ativa não pode ser atualizada no meio da sessão.

## Idempotência

Repetir a materialização sem alterações retorna a forma existente e não modifica o Character.

## Seleção

```js
prepareMorphKnownFormTransition(
  character,
  formSetId,
  knownFormId,
  context,
  options,
)
```

A operação:

1. analisa a entrada conhecida;
2. materializa ou reutiliza a forma;
3. chama `planFormTransition`;
4. devolve Character, forma, materialização e plano;
5. não executa a transformação.

## Planner e executor

O planner registra:

```js
{
  targetTemplateId,
  morphSelection
}
```

Esses dados participam do fingerprint do plano.

Na revalidação, o planner verifica novamente:

- disponibilidade;
- esquecimento;
- vínculo com o template;
- consistência da proveniência;
- fingerprint do template.

O executor continua sendo o único responsável por ativar a forma.

## Recibo e histórico

Quando a forma é executada, o recibo e o evento `transition-executed` registram:

```js
{
  targetTemplateId,
  morphKnownFormId
}
```

Assim, o histórico identifica qual entrada conhecida e qual template originaram a transformação.

## Runtime state

Uma forma recém-materializada recebe um `AlternateForm.runtimeState` estruturalmente válido e não inicializado. A materialização não captura o estado atual do personagem.

## Limite de pontos

A análise expõe:

```js
{
  mode,
  pointLimit,
  pointLimitSource,
  templateImportedPoints,
  status: "deferred-to-dom-morph-1.5",
  enforced: false
}
```

DOM-MORPH-1.2 não bloqueia por limite de pontos. A aplicação mecânica permanece explicitamente adiada para DOM-MORPH-1.5.

## Serialização

Sobrevivem ao save/load:

- vínculo com a forma conhecida;
- template utilizado;
- fingerprint;
- instante da materialização;
- método de aquisição;
- IDs externos;
- estado transitório da forma.

## Não responsabilidades

DOM-MORPH-1.2 não:

- aprende ou memoriza formas;
- improvisa formas;
- aplica limite de pontos;
- calcula custo de Morfose;
- executa testes de aquisição;
- incorpora templates permanentemente;
- atualiza silenciosamente uma forma ativa.
