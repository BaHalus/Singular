# App Equipment

**Código:** APP-EQUIPMENT-1.0  
**Status:** Aprovado  
**Camada:** Application  
**Dependências:** APP-CORE-1.0 e DOM-EQP-1.3

## Objetivo

APP-EQUIPMENT conecta intenções estruturais de edição ao inventário canônico do `Character`. A aplicação valida o envelope e o payload, delega a alteração a `EquipmentOperations` e devolve ao `CommandExecutor` um novo `Character` ou um resultado `no-op`.

## Comandos

```text
equipment.add
equipment.update
equipment.remove
equipment.reorder
equipment.quantity.set
equipment.state.set
equipment.move
```

Payloads:

```js
{ item }
{ itemId, patch }
{ itemId }
{ itemId, targetIndex }
{ itemId, quantity }
{ itemId, state }
{ itemId, targetContainerId }
```

`targetContainerId: null` retira o item para a raiz do inventário. Um ID de recipiente guarda o item dentro do recipiente canônico. Payloads com propriedades adicionais são rejeitados.

## Fluxo

```text
UI futura
→ CommandEnvelope
→ CommandRegistry
→ EquipmentCommandHandlers
→ EquipmentOperations
→ Character
→ CommandExecutor
→ revisão, histórico e recibo
→ persistência, undo e redo
```

`createEquipmentCommandHandlerEntries()` produz entradas isoladas para o registro existente. Esta etapa não modifica um registro global, composition root, sessão, executor, persistência concreta ou UI.

## Operações

- `equipment.add` acrescenta uma entrada canônica ao final da raiz do inventário;
- `equipment.update` aplica somente patch estrutural aceito e preserva ID, tipo e filhos;
- `equipment.remove` remove a entrada identificada, inclusive seus filhos;
- `equipment.reorder` move uma entrada dentro da sua lista irmã;
- `equipment.quantity.set` altera quantidade declarada;
- `equipment.state.set` altera estado canônico;
- `equipment.move` guarda em recipiente ou retira para a raiz.

Atualização estruturalmente idêntica, quantidade igual, estado igual e reordenação para a posição atual produzem `no-op`, preservando revisão, histórico, sessão e fila de redo.

## Recibos

Resultados aplicados informam operação, ID canônico e índices ou valores relevantes. Recibos não carregam cópias de outros agregados nem calculam totais.

## Autoridades

- Equipment declara os dados;
- EquipmentOperations altera a coleção;
- Character permanece o Aggregate Root;
- ApplicationSession permanece a sessão autoritativa;
- CommandExecutor permanece a autoridade de revisão, atomicidade e histórico;
- a persistência continua armazenando snapshots da sessão;
- a UI futura apenas emitirá intenção e apresentará resultados.

## Ausência de cálculo

APP-EQUIPMENT não calcula peso total, custo total, carga, deslocamento, esquiva, penalidades, moeda, comércio, fabricação, manutenção ou qualquer regra de equipamento. Valores declarados e totais continuam sob autoridade do domínio ou de projeções posteriores.

## Atomicidade

Payload inválido, ID ausente, ID duplicado, patch não suportado, índice inválido, recipiente ausente, destino não recipiente, ciclo de contenção ou entrada não portátil geram falha pelo executor e preservam a sessão anterior. Revisões obsoletas são rejeitadas antes do handler.

## Fronteiras

Esta etapa não altera UI, `CommandRegistry`, composition roots, `ApplicationReadModel`, persistência concreta, `Character.js`, Attacks, Skills, Spells, Powers ou outros domínios da ficha.

## API

```js
EQUIPMENT_COMMAND_TYPES
createEquipmentCommandHandlerEntries()
handleAddEquipmentCommand(context)
handleUpdateEquipmentCommand(context)
handleRemoveEquipmentCommand(context)
handleReorderEquipmentCommand(context)
handleSetEquipmentQuantityCommand(context)
handleSetEquipmentStateCommand(context)
handleMoveEquipmentCommand(context)
```
