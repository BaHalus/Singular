# FormTransitionExecutor

**Código:** DOM-FORM-1.6  
**Status:** Aprovado  
**Camada:** Domain / Application boundary  
**Tipo:** Executor atômico

FormTransitionExecutor recebe um plano `ready`, revalida o estado atual e executa a troca de forma sem expor mutação parcial.

## API

```js
executeFormTransition(character, plan, options)
```

## Fluxo

```text
plano ready
↓
validação estrutural
↓
forma de origem ainda ativa?
↓
replanejamento com contexto atual
↓
impressão digital equivalente?
↓
consumo preparado dos recursos
↓
activateAlternateForm
↓
Character novo + recibo
```

## Opções

```js
{
  now,
  executionId,
  activationId,
  context
}
```

`context` pode atualizar fatos do mundo e recursos antes da execução.

## Revalidação

O executor reconstrói do plano:

- resultados de testes;
- requisitos;
- gatilhos;
- impedimentos;
- intenção.

Depois chama novamente:

```js
planFormTransition(character, formSetId, targetFormId, context)
```

Uma mudança confirmada que bloqueia a transição produz `REVALIDATION_FAILED`.

## Impressão digital

`FormTransitionPlan.js` fornece:

```js
validateExecutableFormTransitionPlan(plan)
createFormTransitionPlanFingerprint(plan)
createExecutionContextFromPlan(plan)
```

A impressão digital ignora disponibilidade instantânea de recursos, mas inclui todas as condições e regras que definem o que será executado.

Mudanças nas regras produzem `PLAN_STALE`.

## Recursos

`FormTransitionExecutorResources.js` agrega os custos por pool canônico:

```text
HP
FP
EnergyReserve
```

O resultado registra:

```js
{
  resourceKey,
  amount,
  before,
  after,
  costIds
}
```

Custos de manutenção não fazem parte do débito inicial.

## Atomicidade

O executor nunca altera o Character recebido.

Ele cria pools descontados em memória e usa esse estado apenas para construir o Character transformado.

Se `activateAlternateForm` lançar erro, nenhuma versão parcialmente descontada é retornada.

## Recibo

```js
{
  id,
  executedAt,
  characterId,
  formSetId,
  fromFormId,
  targetFormId,
  transitionKind,
  intent,
  planFingerprint,
  activationId,
  maneuvers,
  timeSeconds,
  timeKnown,
  consumedResources,
  consumedCostIds
}
```

O recibo serve para auditoria do chamador e para futura persistência de histórico.

## Erros

```js
FormTransitionExecutionError
```

Campos:

```js
{
  name,
  code,
  message,
  details,
  cause
}
```

Códigos principais:

```text
PLAN_NOT_READY
PLAN_STALE
REVALIDATION_FAILED
RESOURCE_CONSUMPTION_FAILED
TRANSITION_FAILED
```

## Garantias

- plano pendente não é executado;
- plano bloqueado não é executado;
- plano de origem antiga não é executado;
- regras alteradas invalidam o plano;
- recursos atuais são rechecados;
- custos são consumidos uma vez;
- a mesma execução não pode ser repetida;
- falha de ativação não deixa débito parcial.

## Não responsabilidades

O executor não:

- rola dados;
- decide resultados;
- mede passagem de tempo;
- agenda duração;
- consome manutenção;
- resolve gatilhos futuros;
- persiste histórico por conta própria.
