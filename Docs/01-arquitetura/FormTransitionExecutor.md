# FormTransitionExecutor

**Código:** DOM-FORM-1.7  
**Status:** Aprovado  
**Camada:** Domain / Application boundary  
**Tipo:** Executor atômico

FormTransitionExecutor recebe um plano `ready`, revalida o estado atual e troca a forma sem expor mutação parcial.

## API

```js
executeFormTransition(character, plan, options)
```

## Fluxo

```text
validar o plano
confirmar characterId e forma de origem
replanejar com o estado atual
comparar a impressão digital
preparar o consumo dos recursos
chamar activateAlternateForm
inicializar o runtime da forma de destino
retornar Character novo e recibo
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

## Revalidação

O executor reconstrói do plano os resultados conhecidos e chama novamente:

```js
planFormTransition(character, formSetId, targetFormId, context)
```

Uma mudança que bloqueia a transição produz `REVALIDATION_FAILED`.

Mudanças nas regras produzem `PLAN_STALE`.

## Recursos

Custos são agregados por:

```text
HP
FP
EnergyReserve
```

O débito registra valor anterior, valor posterior, quantidade e IDs dos custos.

Custos de manutenção não entram no débito inicial. Eles são tratados pelo FormTransitionRuntime.

## Runtime

Depois da troca, o executor chama:

```js
initializeFormTransitionRuntime(character, formSetId, { now })
```

Uma forma alternativa recebe runtime iniciado no instante da execução. A forma-base mantém runtime nulo.

Se a inicialização falhar, a execução inteira falha como `TRANSITION_FAILED` e nenhuma versão parcial é retornada.

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
  runtimeId,
  maneuvers,
  timeSeconds,
  timeKnown,
  consumedResources,
  consumedCostIds
}
```

`runtimeId` identifica a sessão criada e é nulo quando o destino é a forma-base.

## Erros principais

```text
PLAN_NOT_READY
PLAN_CHARACTER_MISMATCH
PLAN_STALE
REVALIDATION_FAILED
RESOURCE_CONSUMPTION_FAILED
TRANSITION_FAILED
```

## Garantias

- o Character recebido não é modificado;
- plano pendente ou bloqueado não é executado;
- plano de outro personagem não é executado;
- recursos são rechecados;
- custos iniciais são consumidos uma vez;
- a mesma execução não pode ser repetida;
- o runtime corresponde à forma ativada;
- falha não deixa débito ou runtime parcial.

## Não responsabilidades

O executor não rola dados, não avança tempo posterior, não cobra manutenção, não resolve gatilhos futuros, não executa retornos preparados pelo runtime e não persiste histórico por conta própria.
