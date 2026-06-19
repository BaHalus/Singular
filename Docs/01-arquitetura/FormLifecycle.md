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

ou, para todos os conjuntos:

```js
{
  executeReadyReturns: true
}
```

Somente planos `ready` são executados.

Planos `pending` ou `blocked` permanecem preparados e são devolvidos ao chamador.

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

## Contexto

O mesmo contexto usado para observar o runtime é reaproveitado na revalidação do executor.

Opções específicas podem ser fornecidas por conjunto:

```js
executionOptionsBySet: {
  "set-body": {
    executionId: "return-body-001"
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

- resolve testes pendentes;
- inventa fatos do contexto;
- executa planos bloqueados;
- transforma todos os conjuntos como uma transação global única;
- agenda chamadas futuras;
- avança o relógio global da campanha.
