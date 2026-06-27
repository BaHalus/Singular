# Gate — APP-EQUIPMENT-1.0

**Status:** Bloqueado por lacuna canônica  
**Data:** 2026-06-26  
**Branch:** `feature/equipment-app-current`  
**Base validada:** `main` em `b3cc79f8d3df81962bb4782c930baac0141ff25e`

## Objetivo

Certificar comandos estruturais de Equipment pelo App Core, sem cálculo de totais e sem UI.

## Arquivos

- `src/application/equipment/EquipmentCommandHandlers.js`
- `src/application/equipment/InventoryCommandFlow.test.js`
- `src/application/equipment/InventoryCommandNoOp.test.js`
- `src/application/equipment/InventoryCommandIdentity.test.js`
- `Docs/01-arquitetura/Equipment.md`
- `Docs/02-decisoes/ADR-0066-EquipmentCommands.md`
- `Docs/03-gates/APP-EQUIPMENT-1.0.md`

## Operações canônicas cobertas

- [x] adicionar no topo;
- [x] adicionar dentro de recipiente;
- [x] renomear;
- [x] alterar quantidade;
- [x] alterar estado;
- [x] remover;
- [x] guardar em recipiente;
- [x] retirar de recipiente;
- [x] mover entre recipientes;
- [x] intenções redundantes produzem `no-op`;
- [x] IDs explícitos em toda subárvore adicionada;
- [x] nomes não textuais falham atomicamente;
- [x] nenhuma soma de quantidade, peso, custo ou carga;
- [x] nenhuma alteração de UI, domínio ou persistência concreta.

## Lacuna bloqueante

A fila autorizada exige também:

- edição geral dos campos canônicos de um item;
- reordenação por índice dentro do nível atual da árvore.

A `main` não possui operações canônicas correspondentes em `EquipmentOperations.js`. As operações existentes permitem somente renomear, alterar quantidade/estado e mover um item para o final do destino. Isso não equivale a `updateEquipment` nem a `reorderEquipment(targetIndex)`.

A PR #122 tentou suprir a lacuna alterando o domínio, mas foi encerrada sem merge porque essa mudança não estava autorizada e misturava a extensão de domínio com os comandos de aplicação.

## Coordenação

As PRs #122, #123 e #125 foram encerradas sem merge. A `main` atual inclui UI-MOBILE 1.1 pela PR #124, restrita a `src/ui/mobile/*`. Esta branch foi criada diretamente de `b3cc79f` e não incorpora mudanças de domínio da #122.

## Evidência

- PR própria única: #126;
- branch 7 commits à frente e 0 atrás na abertura;
- GitHub Actions `Tests`, execução `28272732474`, concluída com sucesso;
- PR mergeável;
- nenhuma revisão ou thread própria aberta observada.

## Decisão necessária

APP-EQUIPMENT 1.0 não deve ser integrada como etapa completa enquanto faltarem as duas operações canônicas.

Opções:

1. autorizar uma microetapa de domínio isolada para `updateEquipment` e `reorderEquipment`, com testes e ADR próprios, seguida da complementação desta PR;
2. reduzir formalmente o contrato de APP-EQUIPMENT 1.0 às operações atualmente existentes.

**Recomendação:** opção 1. Preserva a fila originalmente autorizada e evita implementar lógica paralela na aplicação.
