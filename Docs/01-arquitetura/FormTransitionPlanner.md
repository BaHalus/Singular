# FormTransitionPlanner

**Código:** DOM-FORM-1.5  
**Status:** Aprovado  
**Camada:** Domain / Application boundary  
**Tipo:** Planner puro

FormTransitionPlanner transforma regras declarativas e contexto atual em um plano de transição, sem modificar o Character.

## API

```js
planFormTransition(character, formSetId, targetFormId, context)
planFormReturn(character, formSetId, context)
```

## Saída

```js
{
  allowed,
  status,
  intent,
  transitionKind,

  formSetId,
  fromFormId,
  targetFormId,

  maneuver,
  maneuvers,
  timeSeconds,
  timeKnown,

  phases,
  costs,
  maintenanceCosts,
  requiredTests,

  unmetRequirements,
  unknownRequirements,
  activeImpediments,
  unknownImpediments,
  applicableTriggers,
  inactiveTriggers,
  unknownTriggers,

  duration,
  return,
  reasons
}
```

## Tipos de transição

```text
activation
```

Forma-base para forma alternativa.

```text
deactivation
```

Forma alternativa para forma-base.

```text
switch
```

Forma alternativa para outra forma alternativa. Possui fase de desativação e fase de ativação.

```text
none
```

Destino já ativo.

## Status

```text
ready
pending
blocked
already-active
```

`allowed` é verdadeiro somente para `ready`.

## Avaliação das fases

Cada fase expõe:

```js
{
  kind,
  formId,
  maneuver,
  involuntary,
  interruptible,
  baseTimeSeconds,
  timeStepsDelta,
  timeSeconds,
  timeKnown,
  costs,
  tests,
  requirements,
  triggers,
  impediments
}
```

Uma troca direta preserva as duas fases, em vez de reduzi-las a uma operação opaca.

## Resultados de testes

O contexto aceita:

```js
testResults: {
  "test-will": "passed"
}
```

Também aceita booleanos:

```js
true  // passed
false // failed
```

Sem resultado, o teste fica `pending`.

## Requisitos

```js
requirementResults: {
  "req-moon": "satisfied"
}
```

Aliases por lista:

```js
satisfiedRequirements: ["req-moon"]
unsatisfiedRequirements: []
```

Sem informação, o requisito fica `unknown`.

## Gatilhos e impedimentos

```js
triggerResults: {
  "trigger-night": "active"
}

impedimentResults: {
  "imp-silver": "inactive"
}
```

Também são aceitas listas de IDs ativos e inativos.

## Recursos

Custos da mesma reserva são somados antes da comparação.

Exemplo de troca:

```text
1 PF para sair do Lobo
2 PF para entrar no Morcego
Total exigido: 3 PF
```

Cada entrada do plano informa:

```js
{
  resourceKey: "FP",
  available: 4,
  totalRequired: 3,
  payable: true
}
```

O planner não reduz o valor atual.

## Tempo

Com tempo-base conhecido:

```text
baseTimeSeconds × 2^timeStepsDelta
```

O tempo total é a soma das fases.

Com qualquer fase desconhecida:

```js
timeKnown: false
timeSeconds: null
```

O chamador pode exigir tempo conhecido com `requireKnownTime: true`.

## Retorno

`planFormReturn` consulta as regras da forma ativa.

O alvo é:

1. `return.targetFormId`, quando declarado;
2. `baseFormId`, como fallback.

Gatilhos de retorno são avaliados apenas durante um retorno aplicável.

Uma troca entre formas alternativas não é tratada como violação do alvo de retorno.

## Pureza

O planner não:

- altera forma ativa;
- consome recursos;
- grava resultados;
- executa rolagens;
- modifica equipamentos;
- avança tempo;
- chama `activateAlternateForm`;
- resolve fatos ausentes do mundo.

## Relação com o executor

Fluxo previsto:

```text
FormTransitionRules
↓
FormTransitionPlanner
↓
resultados pendentes são resolvidos
↓
plano ready
↓
FormTransitionExecutor
```

O executor deverá revalidar o plano contra o Character atual, consumir os recursos e efetuar a troca de forma atomicamente.
