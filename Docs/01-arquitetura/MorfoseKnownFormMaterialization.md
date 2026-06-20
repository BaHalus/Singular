# MorfoseKnownFormMaterialization

**Código:** DOM-MORPH-1.2 integrado ao DOM-MORPH-1.5  
**Status:** Fechado  
**Camada:** Domain / Application boundary  
**Tipo:** Seleção, projeção transitória e integração com transições  
**Decisões:** ADR-0022, ADR-0027 e ADR-0028

Este componente transforma uma entrada disponível do catálogo de Morfose em uma forma transitória utilizável pela infraestrutura de Forma Alternativa.

## Componentes

```text
MorphKnownFormMaterialization
├── análise da entrada
├── avaliação canônica do limite
├── materialização idempotente
├── proveniência e fingerprint
├── atualização explícita
└── validação do alvo pelo planner

MorphKnownFormSelection
└── materialização + planFormTransition
```

## APIs estáveis

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

## Pré-condições estruturais

A entrada precisa:

- existir em `morphProfile.knownForms`;
- estar `available`;
- ter `templateId` resolvido;
- apontar para um template existente em `Character.templates`.

A materialização não adivinha templates nem liga referências por nome.

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
    externalIds,
  },
  runtimeState: {
    initialized: false,
    ...
  }
}
```

O template continua em `Character.templates`. A forma guarda somente a referência e a proveniência necessárias à ativação temporária.

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
  pointLimitEvaluation,
}
```

`pointLimitEvaluation` é produzido por `MorphPointLimit` e pode estar:

```text
ready
pending
blocked
```

A análise estrutural não confunde projeção com ativação. Uma entrada estruturalmente válida pode ser materializada mesmo quando a avaliação de pontos está bloqueada; o planner impede a ativação.

## Idempotência

Quando entrada, template e materialização permanecem iguais:

```js
{
  status: "already-materialized",
  changed: false,
  character: characterOriginal,
}
```

Nenhuma forma duplicada é criada.

## Atualização

Quando o fingerprint do template muda:

```js
materializeMorphKnownForm(character, setId, knownFormId, {
  refresh: true,
})
```

A atualização:

- reutiliza o ID da forma;
- atualiza a proveniência;
- não cria duplicata;
- é proibida enquanto a forma estiver ativa.

## Planner

`FormTransitionPlanner` consulta `evaluateMaterializedMorphTarget` e aplica novamente o limite atual.

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
    pointLimitEvaluation,
  },
}
```

A seleção e a avaliação participam do fingerprint. Alterações posteriores tornam o plano inválido, pendente ou bloqueado.

## Executor

A execução reutiliza integralmente `FormTransitionExecutor`.

Ela:

- revalida catálogo, template e limite;
- compara o fingerprint do plano;
- aplica o template temporariamente;
- inicializa runtime;
- registra recibo e histórico;
- preserva `morphKnownFormId`;
- preserva `targetTemplateId`;
- preserva `morphPointLimitEvaluation`.

## Bloqueios posteriores ao planejamento

Se, depois do plano:

- a entrada ficar indisponível;
- a entrada for esquecida;
- o template mudar;
- o valor de pontos mudar;
- o limite mudar;
- a proveniência ficar inconsistente;

então o executor rejeita a operação durante a revalidação sem modificar o `Character`.

## Persistência

A serialização inclui:

```text
morphKnownFormId
morphMaterialization
runtimeState
formTransitionHistory
```

Isso permite restaurar a forma materializada, a forma ativa e a origem da transição.

## Não responsabilidades

O componente não:

- aprende formas;
- memoriza formas;
- improvisa templates;
- calcula o custo interno do template;
- executa transformação durante a seleção;
- cria planner ou executor paralelo;
- calcula regras na UI.
