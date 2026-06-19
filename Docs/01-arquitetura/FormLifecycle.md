# FormLifecycle

**Código:** DOM-FORM-1.8  
**Status:** Aprovado  
**Camada:** Domain / Application boundary  
**Tipo:** Orquestrador explícito

FormLifecycle fecha o fluxo entre runtime, planner e executor sem introduzir mudanças silenciosas.

## API

```js
advanceFormLifecycle(character, formSetId, context, options)
advanceAllFormLifecycles(character, context, options)
```

## Comportamento padrão

Sem opção de execução, o ciclo apenas:

1. avança o runtime;
2. cobra manutenção vencida;
3. registra eventos persistentes;
4. prepara eventual plano de retorno;
5. devolve o Character atualizado.

A forma ativa não muda automaticamente.

## Execução explícita

```js
{
  executeReadyReturn: true
}
```

Para todos os conjuntos:

```js
{
  executeReadyReturns: true
}
```

Somente planos `ready` são executados.

Planos `pending` ou `blocked` permanecem preparados e são devolvidos ao chamador.

## Resolução explícita de pendências

O contexto inicial observa o runtime. Resultados adicionais podem ser fornecidos especificamente à execução:

```js
{
  executeReadyReturn: true,
  executionOptions: {
    context: {
      testResults: {
        "test-return": "passed"
      },
      requirementResults,
      triggerResults,
      impedimentResults,
      resources
    }
  }
}
```

Antes de executar, o ciclo cria um novo plano com esse contexto combinado.

Assim, um teste antes `pending` pode tornar-se `passed`, mas o ciclo nunca escolhe ou inventa o resultado.

## Resultado de um conjunto

```js
{
  character,
  report,
  returnPlan,
  execution,
  executionStatus
}
```

`executionStatus` aceita:

```text
not-requested
prepared
not-ready
executed
```

## Resultado de todos os conjuntos

```js
{
  character,
  results,
  executions,
  pendingReturnPlans
}
```

Conjuntos são processados sequencialmente. Cada transição executada continua atomicamente protegida pelo executor.

## Contexto por conjunto

Opções específicas podem ser fornecidas:

```js
executionOptionsBySet: {
  "set-body": {
    executionId: "return-body-001",
    context: {
      testResults: {
        "test-return": "passed"
      }
    }
  }
}
```

## Histórico

O fluxo completo persiste:

```text
transição executada
manutenção cobrada ou recusada
pedido de retorno
retorno executado
```

O histórico permanece no Character depois de serialização e restauração.

## Garantia de não silêncio

O runtime pode detectar e preparar retorno automático ou involuntário.

A execução só ocorre quando o chamador declara explicitamente `executeReadyReturn` ou `executeReadyReturns`.

## Não responsabilidades

FormLifecycle não:

- escolhe resultados de testes;
- inventa fatos do contexto;
- executa planos bloqueados;
- transforma todos os conjuntos como uma transação global única;
- agenda chamadas futuras;
- avança o relógio global da campanha.
