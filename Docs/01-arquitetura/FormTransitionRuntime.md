# FormTransitionRuntime

**Código:** DOM-FORM-1.8  
**Status:** Aprovado  
**Camada:** Domain / Application boundary  
**Tipo:** Runtime persistente e motor de avanço

FormTransitionRuntime acompanha a sessão da forma ativa.

## Estado persistido

```js
{
  activationId,
  formId,
  startedAt,
  observedAt,
  elapsedSeconds,
  status,
  maintenance,
  duration,
  returnRequest
}
```

Ele fica em `AlternateFormSet.transitionRuntime`. A forma-base deve mantê-lo nulo.

## Operações

```js
initializeFormTransitionRuntime(character, formSetId, options)
clearFormTransitionRuntime(character, formSetId, options)
evaluateFormTransitionRuntime(character, formSetId, context)
advanceFormTransitionRuntime(character, formSetId, context)
advanceAllFormTransitionRuntimes(character, context)
```

## Avanço

O avanço calcula tempo, intervalos vencidos, manutenção, duração e pedidos de retorno.

Custos vencidos são cobrados atomicamente. Falha de pagamento não altera parcialmente os pools nem os contadores.

Repetir a mesma observação não cobra novamente.

## Histórico

Eventos significativos são persistidos em `Character.formTransitionHistory`:

```text
maintenance-charged
maintenance-unpaid
return-requested
```

Observações sem efeito não geram eventos.

## Retorno

O runtime prepara um plano de retorno para:

```text
maximum-duration-reached
return-trigger-active
maintenance-unpaid
```

O retorno não ocorre silenciosamente. A execução depende de chamada explícita ao ciclo ou ao executor.

## Serialização

Runtime, manutenção processada e pedido de retorno sobrevivem ao salvamento e carregamento do Character.

## Limites

O runtime não resolve testes, não cria fatos do mundo, não avança o relógio global e não agenda tarefas externas.
