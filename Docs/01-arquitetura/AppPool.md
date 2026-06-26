# App Pool

**Código:** APP-POOL-1.0  
**Status:** Proposto para revisão  
**Camada:** Application  
**Dependências:** APP-CORE-1.0 e DOM-POOL-1.1

## Objetivo

APP-POOL conecta intenções de alteração de PV, PF e reservas ao App Core canônico.

A aplicação não interpreta dano, cura, fadiga ou recuperação. Ela valida o payload do caso de uso, delega a alteração a `PoolsOperations` e devolve ao `CommandExecutor` um novo `Character` ou um `no-op`.

## Tipos de comando

```text
pool.current.set
pool.current.adjust
pool.current.reset-to-maximum
```

Payloads:

```js
{ poolKey, current }
{ poolKey, delta }
{ poolKey }
```

Os payloads são estritos: propriedades adicionais são rejeitadas.

## Registro

`createPoolCommandHandlerEntries()` devolve entradas imutáveis compatíveis com o `CommandRegistry` existente.

A frente não cria outro registro, executor, histórico ou sessão.

## Fluxo

```text
UI coleta intenção
→ CommandEnvelope
→ CommandRegistry
→ PoolCommandHandlers
→ PoolsOperations
→ Character canônico
→ CommandExecutor
→ revisão + histórico + recibo
→ persistência / undo / redo existentes
```

## Estados do handler

### applied

Produz novo `Character` quando o valor do pool muda.

O recibo de domínio registra:

- operação;
- `poolKey`;
- valor anterior;
- valor resultante;
- delta ou máximo quando aplicável.

### no-op

Não cria revisão nem histórico quando:

- o valor definido já é o atual;
- o delta é zero e não altera o estado;
- o pool já está no máximo durante a restauração.

## Atomicidade

Payload inválido, pool ausente, valor não finito, atual desconhecido em ajuste ou máximo desconhecido em restauração fazem o handler lançar erro.

O `CommandExecutor` converte a falha em resultado `failed` e preserva integralmente a sessão recebida.

Revisões obsoletas são rejeitadas pelo executor antes do handler.

## Ausência de mecânica

APP-POOL não:

- limita o valor atual ao máximo;
- impede valores negativos;
- classifica a intenção como dano, cura, gasto ou recuperação;
- calcula morte, inconsciência ou exaustão;
- recalcula máximos;
- altera pontos de personagem.

## Fronteiras

Esta frente não modifica:

- `Character.js`;
- `Pools.js` ou `PoolsOperations.js`;
- `ApplicationSession`;
- `CommandExecutor`;
- `CommandRegistry`;
- histórico, persistência ou runtime;
- UI mobile;
- Equipment, Skills, Techniques, Magic, Power ou Combat.

## API

```js
POOL_COMMAND_TYPES
createPoolCommandHandlerEntries()
handleSetPoolCurrentCommand(context)
handleAdjustPoolCurrentCommand(context)
handleResetPoolCurrentToMaximumCommand(context)
```

## Checklist

- [x] Reutilizar o App Core canônico.
- [x] Reutilizar DOM-POOL-1.1.
- [x] Não criar segundo despachante.
- [x] Definir, ajustar e restaurar valor atual.
- [x] Produzir `no-op` determinístico.
- [x] Registrar histórico pelo executor existente.
- [x] Certificar persistência, undo e redo.
- [x] Preservar atomicidade em falhas.
- [ ] CI verde na base vigente.
- [ ] Ausência de revisão bloqueante.
