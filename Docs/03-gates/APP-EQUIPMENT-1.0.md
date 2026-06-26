# Gate — APP-EQUIPMENT-1.0

**Status:** Aprovado  
**Data:** 2026-06-26  
**Branch:** `feature/app-inventory-commands`  
**Base validada:** `main` em `b31a367113faf98bd0e403805eb55503cc0db560`

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

- [x] reutiliza EquipmentOperations;
- [x] usa IDs canônicos e explícitos em toda subárvore adicionada;
- [x] adiciona itens no topo ou em recipiente;
- [x] renomeia e altera quantidade/estado;
- [x] remove e move itens preservando hierarquia;
- [x] produz novo Character canônico;
- [x] intenções redundantes produzem `no-op`;
- [x] nomes não textuais e IDs ausentes falham atomicamente;
- [x] não cria sessão, executor ou registro paralelo;
- [x] não calcula quantidade, peso, custo ou carga;
- [x] não toca UI, domínio ou persistência concreta.

## Coordenação

A PR #121 altera exclusivamente `src/ui/mobile/*` e possui CI/revisões próprias. Esta etapa permanece isolada em `src/application/equipment/*` e documentação.

## Evidência

GitHub Actions `Tests`, execução `28271000579`, concluiu com sucesso no commit `11eafdbd0c85e0f2b2b18731f022ae56bee0a221`, já contendo identidade explícita, coerção textual bloqueada e regressões próprias.

## Integração

- [x] PR própria única: #123;
- [x] branch sem atraso em relação à `main` na abertura;
- [x] CI integral verde no head funcional;
- [x] nenhuma revisão bloqueante observada;
- [x] nenhuma thread própria aberta observada;
- [ ] CI integral verde no commit documental final;
- [ ] merge serializado.

## Próxima etapa

Após integração, iniciar APP-EQUIPMENT 1.1: projeção portátil de leitura consumindo o contrato MVP resolvido pelo motor.
