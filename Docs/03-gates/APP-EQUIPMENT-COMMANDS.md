# Gate — APP-EQUIPMENT-1.0

**Status:** Em revalidação  
**Data:** 2026-06-26  
**Branch:** `feature/app-inventory-commands-current`  
**Base validada:** `main` em `029e47dcc0ec86d260218379ecdafa30c3127cf2`

## Objetivo

Certificar comandos estruturais de Equipment pelo App Core, sem cálculo de totais e sem UI.

## Arquivos

- `src/application/equipment/EquipmentCommandHandlers.js`
- `src/application/equipment/InventoryCommandFlow.test.js`
- `src/application/equipment/InventoryCommandNoOp.test.js`
- `src/application/equipment/InventoryCommandIdentity.test.js`
- `Docs/01-arquitetura/Equipment.md`
- `Docs/02-decisoes/ADR-0066-EquipmentCommands.md`
- `Docs/03-gates/APP-EQUIPMENT-COMMANDS.md`

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

A PR #122 foi encerrada sem merge por duplicidade. A PR #123 antiga também foi encerrada sem merge após ficar desatualizada. A PR #121 foi integrada em `029e47d` e alterou somente `src/ui/mobile/*`. Esta entrega foi reaplicada sobre essa `main`, sem incorporar `EquipmentOperations.js` da #122.

## Evidência anterior

A implementação equivalente passou na suíte integral antes da atualização da base. Essa evidência não será reutilizada para merge; a nova branch deve executar CI e revisão próprias sobre `029e47d`.

## Integração pendente

- [ ] PR substituta única aberta;
- [ ] CI integral verde no head reaplicado;
- [ ] nenhuma revisão bloqueante;
- [ ] nenhuma thread própria aberta;
- [ ] branch sem atraso em relação à `main` vigente;
- [ ] merge serializado.

## Próxima etapa

Após integração, iniciar APP-EQUIPMENT 1.1: projeção portátil de leitura consumindo o contrato MVP resolvido pelo motor.
