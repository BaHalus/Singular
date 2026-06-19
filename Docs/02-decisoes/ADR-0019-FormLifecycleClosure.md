# ADR-0019 — Fechamento do ciclo de Forma Alternativa

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

O subsistema já possui:

- templates e incorporações permanentes;
- conjuntos de formas;
- linker seguro;
- continuidade de estado;
- regras de transição;
- planner;
- executor atômico;
- runtime de duração e manutenção.

Faltava consolidar:

- persistência dos recibos;
- histórico auditável;
- integração explícita Runtime → Planner → Executor;
- invariantes finais;
- regressão completa do ciclo.

## Decisão

O Character passa a manter:

```js
formTransitionHistory: []
```

O histórico é append-only, validado, serializável e vinculado ao `identity.id` do personagem.

## Eventos persistidos

```text
transition-executed
maintenance-charged
maintenance-unpaid
return-requested
```

Somente eventos significativos são persistidos. Observações sem mudança não geram ruído.

## Executor

Depois de uma execução bem-sucedida, o executor incorpora seu recibo ao histórico do Character retornado.

Nenhuma falha intermediária cria recibo de sucesso.

## Runtime

O runtime registra:

- recursos realmente consumidos por manutenção;
- falhas atômicas de manutenção;
- novos pedidos de retorno ou ampliação de seus motivos.

Eventos repetidos com o mesmo ID e conteúdo são idempotentes.

## Orquestração

`FormLifecycle` integra runtime, planner e executor.

O comportamento padrão apenas prepara retornos.

A execução depende de opção explícita:

```js
executeReadyReturn: true
```

ou:

```js
executeReadyReturns: true
```

Essa decisão mantém a regra de que nenhuma transformação acontece silenciosamente.

## Invariantes finais

- a forma-base não possui `transitionRuntime`;
- runtime existente referencia a forma ativa;
- runtime e ativação usam o mesmo ID quando há ativação explícita;
- histórico possui IDs únicos;
- todo evento pertence ao Character;
- planos pertencem ao Character que os originou;
- apenas planos `ready` são executados;
- custos são consumidos atomicamente;
- mudança de forma limpa o runtime anterior;
- recibos sobrevivem à serialização.

## Regressão de ciclo completo

O fechamento deve provar:

```text
forma-base
→ ativação com custo
→ runtime iniciado
→ manutenção periódica
→ duração máxima ou gatilho
→ pedido de retorno
→ planejamento
→ execução explícita
→ forma-base
→ histórico serializado
```

## Limites

Este fechamento encerra Forma Alternativa, mas não implementa Morfo.

Morfo reutilizará:

- conjuntos de formas;
- políticas de estado;
- regras;
- planner;
- executor;
- runtime;
- histórico.

Aquisição dinâmica, catálogo conhecido, limites de pontos e improvisação permanecem numa frente própria.
