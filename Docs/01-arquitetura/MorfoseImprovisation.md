# Improvisação de formas de Morfose

**Código:** DOM-MORPH-1.4  
**Status:** Implementado  
**Camada:** Domain  
**Decisão:** ADR-0025

## Objetivo

DOM-MORPH-1.4 implementa o fluxo explícito e explicável para criar uma forma transitória por **Formas Improvisadas**, sem transformar essa criação em template persistente, forma conhecida ou caminho alternativo de ativação.

A regra arquitetural permanece:

```text
O motor calcula.
O schema declara.
A UI não calcula.
```

## Regras GURPS representadas

A política oficial de Formas Improvisadas é dividida em eixos independentes:

```js
improvisation: {
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

Resolução:

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

Ela não concede Formas Improvisadas por si só. Quando aparece sem o modificador principal, o resolver preserva a evidência, mantém a improvisação sem autorização e produz diagnóstico de dependência.

### Ilimitada

**Ilimitada (+50%)** remove a restrição de composição:

```js
compositionScope: "unrestricted"
```

Ela também continua resolvendo o limite geral da Morfose como ilimitado. Não remove a exigência de características físicas naturais e não substitui Cósmica.

## Rascunho de improvisação

A intenção declarada é um objeto puro:

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

O template interno é um snapshot da composição improvisada. Ele não é inserido em `Character.templates`.

A evidência usa `true`, `false` ou `null`:

- `true`: condição confirmada;
- `false`: condição negada;
- `null`: não informada.

O domínio nunca presume evidência ausente.

## Estados da análise

```text
ready   → todas as condições conhecidas estão satisfeitas
pending → falta evidência ou uma política é desconhecida
blocked → uma regra conhecida foi violada
no-op   → a mesma projeção já está materializada
```

Exemplos de bloqueio:

- improvisação proibida;
- característica não física/natural;
- característica ausente do cenário sem Cósmica;
- mudança de composição sem Ilimitada;
- projeção inválida;
- política alterada depois da materialização;
- tentativa de atualizar uma improvisação ativa.

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

O plano não é persistido. Antes da execução, o domínio revalida:

- personagem;
- conjunto;
- política;
- projeções existentes;
- fingerprints;
- admissibilidade da composição.

Mudanças relevantes invalidam o plano como obsoleto.

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
- preserva o template improvisado completo;
- pode ser descartada quando inativa;
- não pode ser atualizada ou descartada enquanto ativa.

## Idempotência

O mesmo `improvisationId`, com o mesmo rascunho e a mesma política, reutiliza a projeção existente.

Mudanças no rascunho atualizam explicitamente a projeção inativa. Alterações de política tornam a materialização obsoleta até nova análise e atualização.

## Integração com transições

A improvisação não possui executor próprio de transformação.

Fluxo:

```text
análise da improvisação
→ plano efêmero
→ materialização transitória
→ FormTransitionPlanner
→ FormTransitionExecutor
```

`prepareMorphImprovisedTransition` apenas materializa a projeção e entrega seu `formId` ao planner já existente.

O planner reavalia a projeção improvisada e inclui o resultado em `morphSelection`.

## Limite em pontos

DOM-MORPH-1.4 expõe:

```js
{
  generalPointLimitMode,
  generalPointLimit,
  generalPointLimitSource,
  improvisationPointLimit,
  templateImportedPoints,
  status: "deferred-to-dom-morph-1.5",
  enforced: false
}
```

A aplicação mecânica do limite continua reservada ao **DOM-MORPH-1.5**.

Isso evita antecipar ou duplicar a autoridade que aplicará os limites tanto a formas conhecidas quanto improvisadas.

## Persistência

A projeção materializada é serializável para preservar sessões e save/load. O plano efêmero não é serializado.

O snapshot interno do template é persistido dentro de `morphImprovisation`, sem criar uma entrada em `Character.templates`.

## APIs

```js
createMorphImprovisationDraft(input)
analyzeMorphImprovisation(character, formSetId, input)
planMorphImprovisation(character, formSetId, input, options)
executeMorphImprovisationPlan(character, plan, options)
materializeMorphImprovisedForm(character, formSetId, input, options)
prepareMorphImprovisedTransition(character, formSetId, input, context, options)
discardMorphImprovisedForm(character, formSetId, formId, options)
evaluateMorphImprovisedTarget(set, targetForm)
```

## Não responsabilidades

DOM-MORPH-1.4 não:

- aplica mecanicamente o limite em pontos;
- adiciona a forma ao repertório conhecido;
- memoriza a improvisação;
- incorpora ou importa o snapshot como template persistente;
- ativa a forma automaticamente;
- calcula regras na UI;
- cria outro planner ou executor;
- permite traços mentais ou sociais por Formas Improvisadas;
- presume que uma característica existe no cenário;
- trata Cósmica ou Ilimitada como substitutas de Formas Improvisadas.
