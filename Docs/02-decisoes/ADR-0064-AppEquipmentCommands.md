# ADR-0064 — Comandos de aplicação para Equipment

**Status:** Aceito  
**Data:** 2026-06-26  
**Decisão:** APP-EQUIPMENT-1.0

## Contexto

DOM-EQP-1.3 oferece inventário canônico, validação, serialização, hierarquia por `children`, estados e operações mínimas. O App Core já oferece `CommandEnvelope`, `CommandRegistry`, `CommandExecutor`, `ApplicationSession`, revisão, histórico, persistência, undo e redo.

A Alpha precisa editar equipamentos futuramente pela interface sem mutar o `Character`, duplicar o domínio ou mover regras de carga para a aplicação.

A auditoria mostrou que as operações existentes cobriam adição, remoção, renomeação, quantidade, estado e movimentação para recipiente, mas não expunham patch estrutural estrito nem reordenação. Esses dois pontos são indispensáveis para comandos canônicos sem criar cálculo ou schema paralelo.

## Decisão

Criar handlers isolados em:

```text
src/application/equipment/EquipmentCommandHandlers.js
```

Tipos canônicos:

```text
equipment.add
equipment.update
equipment.remove
equipment.reorder
equipment.quantity.set
equipment.state.set
equipment.move
```

Ajustar minimamente `EquipmentOperations` para expor:

```text
updateEquipment
reorderEquipment
findEquipmentItemIndex
```

A alteração de domínio é restrita a operações estruturais já exigidas pelo inventário canônico. Não cria novo schema, não altera `Character.js` e não calcula totais.

## Delegação

Cada handler valida somente contexto e forma do payload. A alteração é delegada a `EquipmentOperations`. Depois da operação, o handler serializa o `Character` atual, substitui somente `equipment` pelo snapshot canônico resultante e reidrata pelo `createCharacter` existente.

Não existe segundo modelo de personagem nem mutação direta da sessão.

## Edição

`equipment.update` aceita patch de campos portáteis do item, mas preserva obrigatoriamente:

- `id`;
- `kind`;
- `containerKind`;
- `children`.

Assim, a edição não converte item em recipiente, não troca identidade e não move filhos implicitamente.

## Reordenação e movimentação

`equipment.reorder` move um item dentro da sua lista irmã, seja na raiz ou dentro de um recipiente. `equipment.move` usa `targetContainerId` para guardar em recipiente e `null` para retirar para a raiz.

Ciclos de contenção, destino inexistente e destino não recipiente continuam falhando no domínio.

## No-op

Atualização estruturalmente idêntica, quantidade igual, estado igual e reordenação para a posição atual retornam `no-op`. O `CommandExecutor` preserva revisão, histórico, sessão e fila de redo.

## Autoridades

- Equipment declara os dados;
- EquipmentOperations altera a coleção;
- Character é o Aggregate Root;
- ApplicationSession é a sessão autoritativa;
- CommandExecutor controla revisão, recibo, histórico e atomicidade;
- a UI futura somente emitirá comandos;
- a persistência armazena snapshots resultantes.

## Falhas

Erros de payload ou domínio propagam ao `CommandExecutor`, que produz `failed` e preserva a sessão original. Revisões obsoletas produzem `rejected` antes do handler. IDs duplicados, patches não suportados, índices inválidos e ciclos de contenção também falham atomicamente.

## Consequências

- a UI mobile poderá emitir intenções estáveis sem chamar domínio diretamente;
- histórico, undo, redo e persistência continuam reutilizando snapshots canônicos;
- comandos não dependem de cálculo de peso, custo, carga ou combate;
- a composição com bootstrap e UI permanece para outra frente;
- a projeção de leitura será tratada separadamente em APP-EQUIPMENT-1.1.

## Fora de escopo

- registrar handlers globalmente;
- alterar UI ou bootstrap;
- criar projeção de leitura;
- calcular peso, custo, carga, deslocamento ou esquiva;
- implementar comércio, fabricação, manutenção ou moedas avançadas;
- alterar persistência concreta.
