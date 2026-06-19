# ADR-0018 — Runtime de duração, manutenção e retorno de formas

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

Depois que uma forma é ativada, a SINGULAR precisa acompanhar:

- quanto tempo ela permanece ativa;
- duração mínima e máxima;
- custos periódicos de manutenção;
- gatilhos de retorno;
- incapacidade de pagar manutenção;
- preparação de retornos automáticos ou involuntários.

Esse acompanhamento não pode trocar a forma silenciosamente. Toda mudança continua passando por planner e executor.

## Decisão

Cada `AlternateFormSet` pode manter um `transitionRuntime` referente apenas à forma atualmente ativa.

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

Ao mudar a forma ativa, o runtime anterior é descartado. O executor cria um runtime novo para a forma de destino. A forma-base mantém `transitionRuntime: null`.

## Estados

```text
active
maintenance-due
maintenance-unpaid
return-pending
expired
```

O relatório de avanço também pode retornar `base-form` quando o conjunto está na forma-base.

## Duração

O runtime registra o instante inicial e calcula:

```text
elapsedSeconds = observedAt - startedAt
```

Ele informa separadamente:

```text
minimumReached
maximumReached
```

Atingir a duração máxima cria um pedido de retorno, mas não executa a transição.

## Manutenção

Cada custo periódico mantém:

```js
{
  costId,
  resource,
  resourceKey,
  amount,
  intervalSeconds,
  chargedIntervals,
  lastChargedAt,
  nextDueAt
}
```

O total vencido é calculado pela diferença entre intervalos decorridos e intervalos já cobrados.

Todos os custos vencidos no mesmo avanço são cobrados atomicamente. Se qualquer reserva for insuficiente:

- nenhum custo é descontado;
- os contadores não avançam;
- o runtime entra em `maintenance-unpaid`;
- um pedido de retorno é preparado.

Repetir o avanço no mesmo instante não cobra novamente intervalos já processados.

## Custos incompletos

Custos sem intervalo, quantidade ou recurso reconhecido são preservados como manutenção não agendável.

O runtime não inventa valores nem calendários para esses casos.

## Gatilhos de retorno

Gatilhos são avaliados pelo contexto externo.

Quando um gatilho está ativo e o modo de retorno é `automatic` ou `involuntary`, o runtime registra um pedido de retorno.

## Pedido de retorno

```js
{
  requestedAt,
  intent,
  reasons,
  triggerIds,
  targetFormId
}
```

Pedidos persistem no runtime até que a forma mude. Isso evita que uma condição já detectada desapareça silenciosamente numa atualização posterior.

## Planejamento do retorno

Quando existe pedido de retorno, o runtime chama:

```js
planFormReturn(character, formSetId, context)
```

Ele devolve o plano ao chamador, mas não chama o executor.

Fluxo obrigatório:

```text
runtime detecta condição
↓
planner prepara retorno
↓
chamador resolve pendências
↓
executor realiza retorno
```

## Avanço de todos os conjuntos

```js
advanceAllFormTransitionRuntimes(character, context)
```

Conjuntos independentes são processados separadamente. Um pedido de retorno em Revestimento não altera Corpo.

## Atomicidade

O avanço do runtime é funcional:

- não modifica o Character recebido;
- prepara pools novos;
- atualiza runtime e metadados em um Character novo;
- não expõe desconto parcial.

## Não responsabilidades

O runtime não:

- avança o relógio global da campanha;
- executa rolagens;
- decide fatos ausentes do mundo;
- executa retornos;
- incorpora templates;
- calcula máximos de pools;
- persiste histórico definitivo de eventos.
