# App Pool

**Código:** APP-POOL-1.0  
**Status:** Aprovado  
**Camada:** Application  
**Dependências:** APP-CORE-1.0 e DOM-POOL-1.1

## Objetivo

APP-POOL conecta alterações de PV, PF e reservas ao App Core canônico. A aplicação valida o payload, delega a alteração a `PoolsOperations` e devolve ao `CommandExecutor` um novo `Character` ou `no-op`.

## Comandos

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

Payloads com propriedades adicionais são rejeitados.

## Pools suportados

APP-POOL 1.0 opera somente sobre `HP`, `FP` e `EnergyReserve`, que são os pools reidratáveis pelo `Character` canônico atual.

Se a sessão contiver pools importados ou customizados fora desse conjunto, o comando falha antes de produzir `applied`. Essa barreira evita que a reidratação por `createCharacter` descarte silenciosamente dados importados aceitos por camadas mais amplas.

## Fluxo

```text
UI
→ CommandEnvelope
→ CommandRegistry
→ PoolCommandHandlers
→ PoolsOperations
→ Character
→ CommandExecutor
→ revisão, histórico e recibo
→ persistência, undo e redo
```

`createPoolCommandHandlerEntries()` usa o registro existente. Não existe segundo executor, sessão ou histórico.

## Resultados

`applied` produz novo `Character` e recibo com operação, pool, valor anterior e valor resultante.

`no-op` preserva revisão e histórico quando set, ajuste ou restauração não altera o estado.

## Atomicidade

Payload inválido, pool ausente, pool importado não reidratável ou valor inválido geram `failed` pelo executor e preservam a sessão. Revisões obsoletas são rejeitadas antes do handler.

## Ausência de mecânica

APP-POOL não limita o valor atual ao máximo, não impede valores negativos, não classifica dano, cura, gasto ou recuperação e não recalcula máximos.

## Fronteiras

Não modifica `Character.js`, DOM-POOL, arquivos centrais do App Core, UI, Equipment, Skills, Techniques, Magic, Power ou Combat.

## API

```js
POOL_COMMAND_TYPES
createPoolCommandHandlerEntries()
handleSetPoolCurrentCommand(context)
handleAdjustPoolCurrentCommand(context)
handleResetPoolCurrentToMaximumCommand(context)
```

## Checklist

- [x] Reutilizar APP-CORE e DOM-POOL.
- [x] Não criar autoridade paralela.
- [x] Definir, ajustar e restaurar valores atuais.
- [x] Produzir `no-op` determinístico.
- [x] Bloquear pools importados não reidratáveis antes de `applied`.
- [x] Certificar histórico, persistência, undo e redo.
- [x] Preservar atomicidade.
- [x] CI verde na base vigente.
- [x] Ausência de revisão bloqueante observada.
