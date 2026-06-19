# ADR-0017 — Execução atômica de transições de forma

**Status:** Aprovado  
**Data:** 2026-06-19  
**Complementado por:** ADR-0019

## Contexto

O planner produz um plano puro. A execução precisa revalidar o estado atual, consumir custos uma única vez, trocar a forma e não expor estado parcial.

## Decisão

```js
executeFormTransition(character, plan, options)
```

O executor:

1. aceita somente plano `ready`;
2. confirma `characterId` e forma de origem;
3. replaneja com o Character atual;
4. compara a impressão digital;
5. prepara o consumo dos recursos;
6. chama `activateAlternateForm`;
7. inicializa ou limpa o runtime;
8. cria recibo;
9. persiste o recibo em `formTransitionHistory`;
10. devolve Character novo, plano e recibo.

## Revalidação

Mudanças bloqueadoras produzem `REVALIDATION_FAILED`. Mudanças nas regras produzem `PLAN_STALE`.

## Recursos

Custos da mesma reserva são agregados e consumidos uma vez. Custos de manutenção pertencem ao runtime.

## Atomicidade

Pools são descontados numa cópia. Se ativação, runtime ou histórico falhar, nenhum Character parcial é devolvido e o objeto original permanece intacto.

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

O recibo é devolvido ao chamador e persistido como evento `transition-executed`.

## Erros principais

```text
PLAN_NOT_READY
PLAN_CHARACTER_MISMATCH
FORM_SET_NOT_FOUND
PLAN_STALE
REVALIDATION_FAILED
RESOURCE_CONSUMPTION_FAILED
TRANSITION_FAILED
INVALID_CHARACTER
INVALID_CONTEXT
INVALID_TIMESTAMP
```

## Idempotência

O mesmo plano não pode ser executado duas vezes. A primeira execução altera a forma ativa e torna a segunda tentativa obsoleta.

## Limites

O executor não realiza rolagens, não decide fatos do mundo, não cobra manutenção e não agenda chamadas futuras.
