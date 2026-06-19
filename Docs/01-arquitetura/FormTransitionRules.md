# FormTransitionRules

**Código:** DOM-FORM-1.4  
**Status:** Aprovado  
**Camada:** Domain / Rules boundary  
**Tipo:** Agregado declarativo e resolver

FormTransitionRules descreve as condições necessárias para entrar numa forma, permanecer nela e retornar.

## Escopo por forma

As regras efetivas pertencem a `AlternateForm`.

```js
{
  transitionRules,
  transitionRulesOverride,
  transitionRulesResolution
}
```

`AlternateFormSet.transitionRules` contém apenas o padrão compartilhado usado como fallback pelas formas do conjunto.

Isso impede que os modificadores de uma Forma de Lobo sejam aplicados indevidamente à Forma de Morcego.

## Estrutura

```js
{
  activation: {
    baseTimeSeconds: null,
    timeStepsDelta: 0,
    maneuver: null,
    costs: [],
    tests: [],
    requirements: [],
    triggers: [],
    involuntary: false,
    interruptible: true
  },

  deactivation: {
    baseTimeSeconds: null,
    timeStepsDelta: 0,
    maneuver: null,
    costs: [],
    tests: [],
    requirements: [],
    triggers: [],
    involuntary: false,
    interruptible: true
  },

  duration: {
    minimumSeconds: null,
    maximumSeconds: null
  },

  return: {
    mode: "manual",
    targetFormId: null,
    triggers: []
  },

  impediments: []
}
```

## Tempo

`baseTimeSeconds` registra um tempo-base já conhecido.

`timeStepsDelta` registra passos relativos produzidos por modificadores como:

```text
Gasto Adicional de Tempo
Tempo Reduzido
```

O resolver não transforma os passos em segundos sem uma regra de tempo-base adequada.

## Custos

```js
{
  id,
  resource: "FP",
  amount: 2,
  timing: "activation",
  intervalSeconds: null,
  notes: ""
}
```

Timings aceitos:

```text
activation
deactivation
maintenance
unspecified
```

O agregado declara custos, mas não os consome.

## Testes

```js
{
  id,
  kind: "attribute",
  target: "Will",
  modifier: -2,
  notes: ""
}
```

Kinds aceitos:

```text
attribute
skill
selfControl
other
```

O agregado não realiza a rolagem.

## Requisitos, gatilhos e impedimentos

```js
{
  id,
  kind,
  description,
  notes
}
```

Esses registros permanecem declarativos. Um serviço operacional futuro verificará se foram satisfeitos.

## Retorno

Modes aceitos:

```text
manual
automatic
involuntary
locked
unspecified
```

`targetFormId`, quando informado, deve apontar para uma forma do mesmo conjunto.

## Resolver

```js
analyzeFormTransitionRules(character, setId, formId, options)
resolveFormTransitionRules(character, setId, formId, options)
applyResolvedFormTransitionRules(character, setId, formId, options)
applyResolvedFormTransitionRulesToAll(character, options)
```

A resolução segue:

```text
padrão do conjunto ou da forma
regras internas
regras de campanha
diretivas explícitas
override manual
```

## Evidências

Para uma forma, são analisados somente:

- seu `sourceTraitId`;
- modificadores e features desse trait;
- seu template;
- traits, modificadores e features do template.

A forma-base não herda automaticamente os modificadores de uma forma alternativa.

## Regras internas iniciais

```text
Custa Fadiga / Costs Fatigue
Gasto Adicional de Tempo / Takes Extra Time
Tempo Reduzido / Reduced Time
Gatilho / Trigger
Preparação Necessária / Preparation Required
Impedimento / Hindrance
Incontrolável / Uncontrollable
```

Somente modificadores habilitados produzem efeitos declarativos.

## Regras de campanha

Filtros disponíveis:

```text
setIds
formIds
mechanisms
modifierNames
featureTypes
traitNames
templateIds
```

Coleções usam `merge` por padrão e podem usar `replace`.

## Resolução explicável

```js
{
  setId,
  formId,
  resolvedAt,
  baseRules,
  transitionRules,
  decisions,
  diagnostics,
  evidence
}
```

Cada decisão registra fonte, prioridade, evidências, override e conflito.

## Recomposição

Uma nova resolução usa `transitionRulesResolution.baseRules`.

Assim, remover ou desabilitar um modificador desfaz corretamente sua contribuição anterior.

## Override manual

Overrides são persistidos em `AlternateForm.transitionRulesOverride`.

Passar `manualOverride: null` remove o override e recompõe as regras.

## Não responsabilidades

FormTransitionRules não:

- desconta recursos;
- executa testes;
- avança relógio;
- verifica ambiente;
- dispara transformação involuntária;
- bloqueia ativação;
- troca a forma ativa;
- calcula o tempo-base oficial.
