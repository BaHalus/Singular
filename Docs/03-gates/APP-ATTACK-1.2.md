# Gate — APP-ATTACK-1.2

**Status:** Aprovado  
**Data:** 2026-06-26  
**Branch:** `feature/app-read-model-attacks-current`  
**Base validada:** `main` em `b5c925c71d48252c8c5370bc3a303ae3a3192e0e`

## Objetivo

Certificar a integração opcional da `AttackReadProjection` ao `ApplicationReadModel` sem UI e sem cálculo automático.

## Arquivos

- `src/application/projections/ApplicationReadModel.js`
- `src/application/projections/ApplicationReadModelAttackProjection.test.js`
- `src/application/projections/ApplicationReadModelCompatibility.test.js`
- `Docs/01-arquitetura/AppAttacks.md`
- `Docs/02-decisoes/ADR-0065-ReadModelProjection.md`
- `Docs/03-gates/APP-ATTACK-1.2.md`

## Critérios

- [x] projeção opcional e independente de Skill Mechanics;
- [x] pertencimento ao mesmo Character;
- [x] cópia destacada e congelamento profundo;
- [x] `null` quando ausente em modelos novos;
- [x] snapshots v2 antigos sem o campo permanecem válidos;
- [x] campo presente com valor `undefined` é rejeitado;
- [x] opções desconhecidas são rejeitadas;
- [x] nenhuma criação automática da projeção;
- [x] nenhum cálculo de combate;
- [x] nenhuma alteração de UI, domínio ou persistência.

## Coordenação

A PR #115 foi integrada em `b5c925c` e alterou exclusivamente `src/ui/mobile/*`. A entrega foi reaplicada sobre esse head em um único commit, sem sobreposição.

## Evidência

GitHub Actions `Tests`, execução `28269692272`, concluiu com sucesso no commit reaplicado `9a30396e96cda29e7e8c7758b18b3fed1550f0c0` da PR #120. A correção do P2 e sua regressão fazem parte desse mesmo commit limpo.

## Integração

- [x] PR própria única: #120;
- [x] branch 1 commit à frente e 0 atrás na abertura;
- [x] CI integral verde no head reaplicado;
- [x] nenhuma revisão bloqueante observada;
- [x] nenhuma thread própria aberta observada;
- [ ] CI integral verde no commit documental final;
- [ ] merge serializado.
