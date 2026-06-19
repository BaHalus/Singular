# FormTransitionExecutor

**Código:** DOM-FORM-1.8  
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
validar plano
confirmar characterId e forma de origem
replanejar com o estado atual
comparar impressão digital
preparar consumo dos recursos
chamar activateAlternateForm
inicializar ou limpar runtime
criar recibo
persistir recibo no histórico
retornar Character novo
```

## Revalidação

O executor reconstrói resultados conhecidos e chama novamente:

```js
planFormTransition(character, formSetId, targetFormId, context)
```

Uma mudança bloqueadora produz `REVALIDATION_FAILED`. Mudanças nas regras produzem `PLAN_STALE`.

## Recursos

Custos são agregados por HP, FP e EnergyReserve. O débito registra valor anterior, valor posterior, quantidade e IDs.

Custos de manutenção permanecem sob responsabilidade do runtime.

## Runtime

Depois da troca, o executor chama:

```js
initializeFormTransitionRuntime(character, formSetId, { now })
```

Formas alternativas recebem runtime novo. A forma-base mantém runtime nulo.

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

O recibo é devolvido e também persistido como evento `transition-executed` em `Character.formTransitionHistory`.

Falhas anteriores à conclusão não criam evento de sucesso.

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
- custos são consumidos uma vez;
- runtime corresponde à forma ativada;
- recibo corresponde à execução concluída;
- falha não deixa débito, runtime ou histórico parcial.

## Não responsabilidades

O executor não rola dados, não avança o relógio posterior, não cobra manutenção, não decide fatos do mundo e não executa retornos sem chamada explícita.
