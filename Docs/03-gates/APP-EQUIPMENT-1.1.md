# Gate — APP-EQUIPMENT-1.1

**Status:** Em validação  
**Data:** 2026-06-26  
**Branch:** `feature/app-equipment-read-projection-1.1`

## Objetivo

Certificar a projeção portátil de leitura de Equipment para a Alpha, consumindo o contrato canônico de Equipment e os totais determinísticos do domínio.

## Arquivos

- `src/application/projections/EquipmentReadProjection.js`
- `src/application/projections/EquipmentReadProjection.test.js`
- `Docs/02-decisoes/ADR-0067-EquipmentReadProjection.md`
- `Docs/03-gates/APP-EQUIPMENT-1.1.md`

## Critérios

- [x] projeção destacada do Character vivo;
- [x] `equipment` vem de `serializeEquipment`;
- [x] `totals` vem de `calculateEquipmentTotals`;
- [x] validação de schema, pertencimento por `characterId` e portabilidade JSON;
- [x] congelamento profundo;
- [x] sem UI mobile;
- [x] sem bootstrap, persistence concreta ou composition root;
- [x] sem cálculo de carga, deslocamento, esquiva ou combate;
- [ ] CI integral verde no head da PR;
- [ ] revisão sem bloqueio;
- [ ] merge serializado.

## Coordenação

APP-EQUIPMENT 1.0 foi integrada pela PR #126. Esta etapa começa de `main` após essa integração e evita arquivos compartilhados de alto risco, especialmente `ApplicationReadModel.js`, para não competir com a frente UI mobile.
