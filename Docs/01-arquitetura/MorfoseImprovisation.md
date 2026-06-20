# Improvisação de formas de Morfose

**Código:** DOM-MORPH-1.4  
**Status:** Implementado e integrado ao DOM-MORPH-1.5  
**Camada:** Domain  
**Decisão:** ADR-0025 e ADR-0027

## Objetivo

DOM-MORPH-1.4 implementa o fluxo explícito e explicável para criar uma forma transitória por **Formas Improvisadas**, sem transformar essa criação em template persistente, forma conhecida ou caminho alternativo de ativação.

A regra arquitetural permanece:

```text
O motor calcula.
O schema declara.
A UI não calcula.
```

## Política oficial representada

A improvisação é resolvida em eixos independentes:

```js
{
  mode,
  pointLimit,
  traitScope,
  availabilityScope,
  compositionScope
}
```

### Formas Improvisadas

O modificador **Formas Improvisadas (+100%)**:

- autoriza improvisação;
- permite combinar características físicas naturais em um modelo racial transitório;
- exige que as características existam no cenário;
- não autoriza mudança da composição fundamental;
- continua sujeito ao limite que a Morfose comporta.

Política-base:

```js
{
  mode: "allowed",
  traitScope: "physicalNatural",
  availabilityScope: "settingOnly",
  compositionScope: "sameComposition"
}
```

### Cósmica — Para Formas Improvisadas

**Cósmica (+50%)** remove apenas a exigência de que as características existam no cenário:

```js
availabilityScope: "unrestricted"
```

Ela não concede Formas Improvisadas por si só. Quando aparece sem o modificador principal, a evidência é preservada, a improvisação não é autorizada e o resolver produz diagnóstico de dependência.

### Ilimitada

**Ilimitada (+50%)** remove a restrição de composição:

```js
compositionScope: "unrestricted"
```

Ela também mantém sua consequência sobre o limite geral da Morfose. Não remove a exigência de características físicas naturais, não substitui Cósmica e não apaga um teto específico de improvisação declarado separadamente.

## Rascunho declarativo

```js
{
  id,
  name,
  source,
  template: {
    id,
    templateType: "form",
    name,
    importedPoints,
    ...
  },
  evidence: {
    physicalNaturalOnly,
    allCharacteristicsExistInSetting,
    changesComposition,
    conditionsSatisfied
  },
  notes,
  tags,
  raw
}
```

O template interno é um snapshot transitório. Ele não é inserido em `Character.templates`.

Cada evidência aceita `true`, `false` ou `null`. Valor ausente permanece desconhecido; o domínio não presume a natureza de uma característica pelo nome.

## Estados da análise

```text
ready   → todas as condições conhecidas estão satisfeitas
pending → falta evidência ou uma política continua desconhecida
blocked → uma regra conhecida foi violada
no-op   → a mesma projeção já está materializada
```

## Plano efêmero

```js
{
  id,
  createdAt,
  characterId,
  formSetId,
  draft,
  draftFingerprint,
  policySnapshot,
  policyFingerprint,
  pointLimitEvaluation,
  existingFormId,
  setFingerprint,
  status,
  reasons
}
```

O plano não é persistido. Antes da execução, o domínio revalida personagem, conjunto, política, projeções existentes e fingerprints. Mudanças relevantes tornam o plano obsoleto.

## Projeção transitória

Uma improvisação executável cria uma forma em `AlternateFormSet.forms`:

```js
{
  id,
  name,
  templateId: null,
  morphKnownFormId: null,
  morphMaterialization: null,
  morphImprovisation: {
    improvisationId,
    draft,
    draftFingerprint,
    templateFingerprint,
    policyFingerprint,
    materializedAt,
    pointLimitEvaluation
  }
}
```

A projeção:

- pertence apenas ao conjunto alvo;
- não entra em `knownForms`;
- não entra em `Character.templates`;
- não altera o personagem atual;
- não é ativada automaticamente;
- preserva o snapshot completo e a proveniência;
- pode ser descartada quando inativa;
- não pode ser atualizada nem descartada enquanto ativa.

## Idempotência

O mesmo `improvisationId`, com o mesmo rascunho e a mesma política, reutiliza a projeção existente. Uma alteração de rascunho atualiza apenas a projeção inativa correspondente. Uma alteração de política torna a projeção obsoleta até nova análise.

## Integração com transições

A improvisação não possui executor próprio.

```text
análise
→ plano efêmero
→ materialização transitória
→ FormTransitionPlanner
→ MorphPointLimit
→ FormTransitionExecutor
```

`prepareMorphImprovisedTransition` materializa a projeção e entrega seu `formId` ao planner existente. O planner reavalia a improvisação, aplica o limite de pontos e inclui o resultado em `morphSelection`.

## Limite em pontos

DOM-MORPH-1.5 substitui a avaliação provisória por uma avaliação mecânica canônica no momento do planejamento da transição:

```js
{
  targetKind: "improvised",
  generalPointLimitMode,
  generalPointLimit,
  generalPointLimitSource,
  improvisationPointLimit,
  effectivePointLimit,
  templateImportedPoints,
  generalExcessPoints,
  improvisationExcessPoints,
  enforcementMode,
  enforced,
  complete,
  status,
  reasons
}
```

Quando os dois tetos são finitos:

```text
effectivePointLimit = min(generalPointLimit, improvisationPointLimit)
```

A projeção pode permanecer materializada e inativa. A ativação fica bloqueada quando o valor do template excede qualquer teto conhecido.

Detalhes: `MorfosePointLimit.md` e `ADR-0027-MorfosePointLimit.md`.

## Persistência

A projeção materializada é serializável para preservar save/load. O plano efêmero não é serializado. O snapshot interno é persistido dentro de `morphImprovisation`, sem criar template persistente.

A avaliação registrada na projeção documenta o instante da materialização; a avaliação atual usada para ativação é sempre refeita pelo planner.

## APIs principais

```js
createMorphImprovisationDraft(input)
analyzeMorphImprovisation(character, formSetId, input)
planMorphImprovisation(character, formSetId, input, options)
executeMorphImprovisationPlan(character, plan, options)
materializeMorphImprovisedForm(character, formSetId, input, options)
prepareMorphImprovisedTransition(character, formSetId, input, context, options)
discardMorphImprovisedForm(character, formSetId, formId, options)
evaluateMorphImprovisedTarget(set, targetForm)
evaluateMorphTargetPointLimit(character, set, targetForm)
```

## Não responsabilidades

DOM-MORPH-1.4 não:

- adiciona a forma ao repertório conhecido;
- memoriza a improvisação;
- incorpora ou importa o snapshot como template persistente;
- ativa a forma automaticamente;
- calcula regras na UI;
- cria outro planner ou executor;
- presume que uma característica existe no cenário;
- trata Cósmica ou Ilimitada como substitutas de Formas Improvisadas.

A aplicação mecânica do limite pertence exclusivamente ao DOM-MORPH-1.5.
