# FormTransitionRuntime

**Código:** DOM-FORM-1.7  
**Status:** Aprovado  
**Camada:** Domain / Application boundary  
**Tipo:** Runtime persistente e motor de avanço

FormTransitionRuntime acompanha uma forma ativa depois da execução da transição.

## Estrutura

```js
{
  activationId,
  formId,
  startedAt,
  observedAt,
  elapsedSeconds,
  status,

  maintenance: [
    {
      costId,
      resource,
      resourceKey,
      amount,
      intervalSeconds,
      chargedIntervals,
      lastChargedAt,
      nextDueAt,
      notes
    }
  ],

  duration: {
    minimumSeconds,
    maximumSeconds,
    minimumReached,
    maximumReached
  },

  returnRequest
}
```

## Localização

```text
AlternateFormSet.transitionRuntime
```

Existe no máximo um runtime por conjunto, sempre vinculado à forma ativa.

Quando a forma muda, `AlternateFormOperations` limpa o runtime anterior.

`FormTransitionExecutor` inicializa o runtime da nova forma. Ao retornar à forma-base, o runtime fica nulo.

## Inicialização

```js
initializeFormTransitionRuntime(character, formSetId, options)
clearFormTransitionRuntime(character, formSetId, options)
```

A inicialização usa:

- `activeSince` como início;
- `activeActivationId`, quando existir;
- regras efetivas da forma ativa;
- custos com `timing: "maintenance"`;
- duração mínima e máxima.

## Avaliação pura

```js
evaluateFormTransitionRuntime(character, formSetId, context)
```

Produz:

```js
{
  status,
  observedAt,
  elapsedSeconds,
  dueMaintenance,
  unscheduledMaintenance,
  duration,
  returnMode,
  returnTargetFormId,
  returnTriggers,
  activeTriggerIds,
  returnReasons
}
```

A avaliação não altera o Character.

## Avanço

```js
advanceFormTransitionRuntime(character, formSetId, context)
advanceAllFormTransitionRuntimes(character, context)
```

O avanço:

1. inicializa runtime ausente de forma ativa;
2. calcula tempo decorrido;
3. calcula intervalos de manutenção vencidos;
4. tenta cobrar todos atomicamente;
5. atualiza contadores;
6. verifica duração e gatilhos;
7. registra pedido de retorno;
8. chama o planner para preparar o retorno;
9. devolve Character novo, relatório e plano eventual.

## Cobrança de manutenção

```text
totalIntervals = floor(elapsedSeconds / intervalSeconds)
dueIntervals = totalIntervals - chargedIntervals
dueAmount = amount × dueIntervals
```

Custos da mesma reserva são agregados pelo consumidor de recursos já usado pelo executor.

Em falha:

```js
{
  status: "maintenance-unpaid",
  maintenancePaid: false,
  maintenanceError,
  returnRequest
}
```

Nenhum contador ou pool é parcialmente alterado.

## Duração

A duração mínima é informativa.

A duração máxima produz:

```text
maximum-duration-reached
```

O runtime entra em `expired` e prepara retorno.

## Retorno

Motivos iniciais:

```text
maximum-duration-reached
return-trigger-active
maintenance-unpaid
```

O runtime escolhe intenção:

```text
involuntary, quando o modo é involuntary
automatic, nos demais retornos preparados pelo runtime
```

O plano retornado ainda pode estar `ready`, `pending` ou `blocked`.

## Isolamento entre conjuntos

Cada conjunto possui seu relógio, manutenção e pedido de retorno.

`advanceAllFormTransitionRuntimes` processa os conjuntos sequencialmente sem fundir seus estados.

## Serialização

`transitionRuntime` integra a serialização de AlternateForms.

Isso permite salvar e restaurar:

- instante inicial;
- tempo observado;
- intervalos já cobrados;
- próxima cobrança;
- duração atingida;
- pedido de retorno pendente.

## Não responsabilidades

O runtime não:

- executa o plano de retorno;
- resolve testes;
- cria fatos de contexto;
- avança tempo global;
- agenda tarefas externas;
- mantém histórico definitivo de execuções.
