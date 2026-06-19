# ADR-0017 — Execução atômica de transições de forma

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

`FormTransitionPlanner` produz um plano puro e explicável, mas não altera o personagem.

A execução precisa:

- recusar planos pendentes ou bloqueados;
- confirmar que a forma de origem ainda está ativa;
- revalidar recursos, testes e condições;
- detectar mudanças nas regras depois do planejamento;
- consumir os custos uma única vez;
- trocar a forma;
- não deixar estado parcial quando qualquer etapa falhar.

## Decisão

`FormTransitionExecutor` recebe um Character e um plano `ready`:

```js
executeFormTransition(character, plan, options)
```

A operação é funcional e atômica: nenhum objeto recebido é mutado.

O fluxo é:

```text
validar contrato do plano
↓
confirmar forma de origem
↓
replanejar contra o Character atual
↓
comparar impressão digital do plano
↓
preparar consumo dos recursos
↓
executar activateAlternateForm
↓
retornar Character novo + recibo
```

## Revalidação

O executor reconstrói o contexto resolvido do plano e chama novamente `planFormTransition`.

O chamador pode fornecer um contexto mais recente:

```js
{
  context: {
    triggerResults,
    impedimentResults,
    requirementResults,
    testResults,
    resources
  }
}
```

Se a nova avaliação não for `ready`, a execução falha com `REVALIDATION_FAILED`.

## Plano obsoleto

Uma impressão digital canônica preserva apenas os elementos relevantes à execução:

- formas de origem e destino;
- fases;
- manobras;
- tempo;
- custos;
- testes;
- requisitos;
- gatilhos;
- impedimentos;
- duração;
- retorno.

Valores momentâneos como `available` e `payable` não fazem parte da impressão digital, pois são reavaliados separadamente.

Se as regras mudaram, a execução falha com `PLAN_STALE`.

## Consumo de recursos

Custos da mesma reserva são agregados e consumidos uma única vez.

Exemplo:

```text
1 PF para sair do Lobo
2 PF para entrar no Morcego
Total debitado: 3 PF
```

O débito ocorre sobre os pools atuais antes da troca estrutural da forma. Isso corresponde ao mesmo estado usado pelo planner para verificar disponibilidade.

Custos de manutenção não são consumidos pelo executor de transição.

## Atomicidade

O consumo é preparado em uma cópia dos pools.

Depois, `activateAlternateForm` recebe um Character intermediário imutável.

Se a ativação falhar por template ausente, colisão de ID ou outra invariante, o Character original permanece intacto e nenhum débito parcial é exposto.

## Recibo

Uma execução bem-sucedida retorna:

```js
{
  character,
  plan,
  receipt: {
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
}
```

O recibo é devolvido ao chamador, mas ainda não é incorporado a um histórico persistente do Character.

## Erros tipados

O executor usa `FormTransitionExecutionError` com códigos:

```text
PLAN_NOT_READY
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

O mesmo plano não pode ser executado duas vezes.

Depois da primeira execução, a forma de origem planejada já não está ativa e a segunda tentativa falha como plano obsoleto.

## Não responsabilidades

O executor não:

- realiza rolagens;
- escolhe resultados de testes;
- resolve fatos desconhecidos do mundo;
- consome custos de manutenção;
- avança o relógio da campanha;
- agenda retorno automático;
- persiste recibos em histórico;
- calcula máximos de pools.
