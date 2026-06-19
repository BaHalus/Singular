# MorfoseKnownFormMaterialization

**Código:** DOM-MORPH-1.2  
**Status:** Implementado  
**Camada:** Domain / Application boundary  
**Tipo:** Seleção, projeção transitória e integração com transições  
**Decisão:** ADR-0022

Este componente transforma uma entrada disponível do catálogo de Morfose em uma forma transitória utilizável pela infraestrutura de Forma Alternativa.

## Componentes

```text
MorphKnownFormMaterialization
├── análise da entrada
├── materialização idempotente
├── proveniência e fingerprint
├── atualização explícita
└── validação do alvo pelo planner

MorphKnownFormSelection
└── materialização + planFormTransition
```

## APIs

```js
analyzeMorphKnownFormMaterialization(character, setId, knownFormId)
materializeMorphKnownForm(character, setId, knownFormId, options)
evaluateMaterializedMorphTarget(character, set, targetForm)

analyzeMorphKnownFormSelection(character, setId, knownFormId)
prepareMorphKnownFormTransition(
  character,
  setId,
  knownFormId,
  context,
  options,
)
```

## Pré-condições

A entrada precisa:

- existir no `morphProfile.knownForms`;
- estar `available`;
- ter `templateId` resolvido;
- apontar para um template existente em `Character.templates`.

A materialização não adivinha templates.

## Forma materializada

```js
{
  id: "morph:<setId>:<knownFormId>",
  name,
  templateId,
  sourceTraitId,
  morphKnownFormId,
  morphMaterialization: {
    knownFormId,
    templateId,
    templateFingerprint,
    materializedAt,
    sourceName,
    acquisitionMethod,
    externalIds
  },
  runtimeState: {
    initialized: false,
    ...
  }
}
```

O template continua armazenado em `Character.templates`. A forma contém somente a referência e a proveniência necessárias para ativação temporária.

## Análise

```js
{
  formSetId,
  knownFormId,
  knownForm,
  templateId,
  template,
  materializedFormId,
  materializedForm,
  status,
  reasons,
  pointLimitEvaluation
}
```

## Idempotência

Quando a entrada, o template e a materialização permanecem iguais:

```js
{
  status: "already-materialized",
  changed: false,
  character: characterOriginal
}
```

Nenhuma forma duplicada é criada.

## Atualização

Quando o fingerprint do template muda:

```js
materializeMorphKnownForm(character, setId, knownFormId, {
  refresh: true
})
```

A atualização:

- reutiliza o mesmo ID da forma;
- atualiza a proveniência;
- não cria duplicata;
- é proibida enquanto a forma materializada estiver ativa.

## Planner

`FormTransitionPlanner` consulta `evaluateMaterializedMorphTarget` para toda forma de Morfose materializada.

O plano contém:

```js
{
  targetTemplateId,
  morphSelection: {
    knownFormId,
    knownFormState,
    templateId,
    templateImportedPoints,
    materialization,
    status,
    reasons,
    pointLimitEvaluation
  }
}
```

A seleção participa do fingerprint. Alterações posteriores tornam o plano inválido ou bloqueado.

## Executor

A execução reutiliza integralmente `FormTransitionExecutor`.

Ela:

- revalida o catálogo e o template;
- aplica o template temporariamente;
- inicializa runtime;
- registra recibo e histórico;
- preserva `morphKnownFormId` e `targetTemplateId`.

## Bloqueios posteriores ao planejamento

Se, depois do plano:

- a entrada ficar indisponível;
- a entrada for esquecida;
- o template mudar;
- a proveniência ficar inconsistente;

o executor rejeita a operação durante a revalidação, sem modificar o Character.

## Limites

`pointLimitEvaluation` é somente informativo em DOM-MORPH-1.2.

A aplicação efetiva do limite pertence ao DOM-MORPH-1.5.

## Persistência

A serialização de `AlternateForm` inclui:

```text
morphKnownFormId
morphMaterialization
runtimeState
```

Isso permite restaurar a forma materializada sem perder a origem.

## Não responsabilidades

O componente não:

- aprende formas;
- memoriza formas;
- improvisa templates;
- calcula custos;
- aplica o limite de pontos;
- executa a transformação durante a seleção.
