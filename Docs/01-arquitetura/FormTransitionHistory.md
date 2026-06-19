# FormTransitionHistory

**Código:** DOM-FORM-1.8  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Histórico persistente append-only

FormTransitionHistory preserva eventos relevantes do ciclo de formas dentro do Character.

## Localização

```text
Character.formTransitionHistory
```

O histórico é serializado junto com o personagem e não depende de logs externos.

## Eventos

```text
transition-executed
maintenance-charged
maintenance-unpaid
return-requested
```

## Estrutura

```js
{
  id,
  type,
  occurredAt,
  characterId,
  formSetId,
  formId,
  fromFormId,
  targetFormId,
  activationId,
  runtimeId,
  executionId,
  data
}
```

`data` preserva o recibo completo ou os detalhes específicos do evento.

## Garantias

- IDs de eventos são únicos;
- todos os eventos pertencem ao `identity.id` do Character;
- referências obrigatórias variam conforme o tipo;
- eventos repetidos com o mesmo ID e conteúdo são idempotentes;
- reutilizar um ID com conteúdo diferente é erro;
- o histórico é copiado e validado na criação e serialização do Character.

## Transições executadas

O executor registra automaticamente seu recibo depois que a transição termina com sucesso.

Falhas de planejamento, revalidação, consumo ou ativação não criam evento de execução.

## Runtime

O runtime registra apenas mudanças significativas:

- manutenção realmente cobrada;
- tentativa de manutenção não paga;
- criação ou ampliação de um pedido de retorno.

Uma simples observação sem efeito não cria evento.

Repetir a mesma observação não duplica recibos.

## Dados preservados

### transition-executed

```js
{
  receipt completo
}
```

Inclui custos consumidos, impressão digital, formas, intenção, tempo e IDs da sessão.

### maintenance-charged

```js
{
  consumedResources,
  dueMaintenance
}
```

### maintenance-unpaid

```js
{
  error,
  dueMaintenance
}
```

### return-requested

```js
{
  request,
  previousRequest
}
```

## Não responsabilidades

O histórico não:

- reverte eventos;
- recalcula regras;
- substitui snapshots de forma;
- executa transições;
- agenda tarefas;
- mantém logs de interface.
