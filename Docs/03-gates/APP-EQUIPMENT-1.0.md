# Gate — APP-EQUIPMENT-1.0

**Status:** Em revalidação  
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

## Critérios

- [x] reutiliza `EquipmentOperations` sem alterar o domínio;
- [x] usa IDs explícitos em toda subárvore adicionada;
- [x] adiciona itens no topo ou em recipiente;
- [x] renomeia e altera quantidade ou estado;
- [x] remove e move itens preservando hierarquia;
- [x] produz novo `Character` canônico;
- [x] intenções redundantes produzem `no-op`;
- [x] nomes não textuais e IDs ausentes falham atomicamente;
- [x] não calcula quantidade, peso, custo ou carga;
- [x] não toca UI, domínio ou persistência concreta.

## Coordenação

A PR #122 foi encerrada sem merge por duplicidade. As PRs #123 e #125 foram encerradas sem merge após ficarem desatualizadas. A `main` atual inclui UI-MOBILE 1.1 pela PR #124 e suas alterações permanecem restritas a `src/ui/mobile/*`.

Esta branch foi criada diretamente de `b3cc79f` e não incorpora `EquipmentOperations.js` da PR #122 nem resíduos operacionais das branches substituídas.

## Integração pendente

- [ ] PR própria única aberta;
- [ ] CI integral verde no head reaplicado;
- [ ] nenhuma revisão bloqueante;
- [ ] nenhuma thread própria aberta;
- [ ] branch sem atraso em relação à `main` vigente;
- [ ] merge serializado.

## Próxima etapa

Após integração, iniciar APP-EQUIPMENT 1.1: projeção portátil de leitura consumindo o contrato MVP resolvido pelo motor.
