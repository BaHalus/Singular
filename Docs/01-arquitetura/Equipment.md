# Equipment

**Código:** APP-EQUIPMENT-1.0  
**Status:** Em validação  
**Camadas:** Domain e Application

Equipment é o inventário canônico do personagem. A aplicação reutiliza o agregado e suas operações existentes, sem criar schema ou autoridade paralela.

## Escopo da Alpha

O domínio cobre:

- item canônico com identidade estável;
- quantidade;
- peso e custo unitários;
- estados `equipped`, `carried`, `stored` e `dropped`;
- recipientes pela hierarquia `children`;
- validação e serialização portátil;
- totais determinísticos de quantidade, peso e custo;
- operações mínimas e testes.

`ignored` permanece apenas para agrupamentos semânticos legados com `containerKind: "group"`.

## Contrato preservado

Os campos existentes do DOM-EQP-1.3 permanecem canônicos. Aliases de entrada já suportados, como `value`, `weight` e `max_uses`, continuam aceitos. A conversão histórica permanece `2 lb = 1 kg`.

A criação preserva referências legadas dos campos ricos depois de validar sua portabilidade. `serializeEquipment` produz clone profundo e independente destinado ao transporte.

## Comandos de aplicação

APP-EQUIPMENT-1.0 expõe entradas isoladas para o `CommandRegistry` existente:

```text
equipment.add
equipment.add-child
equipment.rename
equipment.quantity.set
equipment.state.set
equipment.remove
equipment.move
```

Os comandos usam IDs canônicos, delegam exclusivamente a `EquipmentOperations` e devolvem ao `CommandExecutor` um novo `Character` ou `no-op`. O executor existente continua responsável por revisão, recibos, histórico, persistência, undo e redo.

A aplicação valida somente forma do payload, presença dos IDs e pertencimento estrutural. Ela não soma peso, custo, quantidade ou carga.

## Invariantes

1. IDs são strings não vazias e únicas em toda a árvore.
2. Quantidade, peso, custo, usos e máximos são finitos e não negativos.
3. Somente recipientes podem possuir filhos.
4. Arrays precisam ser densos e valores preservados precisam ser JSON portáteis.
5. Ciclos de objeto são rejeitados.
6. Um recipiente não pode ser movido para dentro de si próprio ou de um descendente.
7. O destino de movimentação precisa existir e ser recipiente.
8. Comandos com revisão obsoleta são rejeitados antes do handler.
9. Falhas de payload ou domínio preservam a sessão original.

## Totais

`calculateEquipmentTotals(equipment)` e o resolvedor do motor permanecem autoridades dos totais. Quantidade, peso, custo e carga não são recalculados pelos handlers de aplicação.

Os totais estruturais não implementam regras completas de carga. A projeção portátil desses resultados pertence a APP-EQUIPMENT-1.1.

## Fronteiras

APP-EQUIPMENT-1.0 não altera UI, bootstrap, `Character.js`, `CommandExecutor`, `CommandRegistry`, persistência concreta, Library core, importadores ou outros domínios.

## Fora de escopo

Catálogo extenso, biblioteca visual, importação completa, moedas avançadas, comércio, fabricação, manutenção, regras detalhadas de consumíveis, ataques derivados, regras completas de carga, interface e persistência de navegador.

## API de aplicação

```js
EQUIPMENT_COMMAND_TYPES
createEquipmentCommandHandlerEntries()
handleAddEquipmentCommand(context)
handleAddChildEquipmentCommand(context)
handleRenameEquipmentCommand(context)
handleSetEquipmentQuantityCommand(context)
handleSetEquipmentStateCommand(context)
handleRemoveEquipmentCommand(context)
handleMoveEquipmentCommand(context)
```
