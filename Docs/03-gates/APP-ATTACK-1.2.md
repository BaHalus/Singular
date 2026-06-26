# Gate — APP-ATTACK-1.2

**Status:** Aprovado  
**Data:** 2026-06-26  
**Branch:** `feature/app-read-model-attacks-1.2`  
**Base validada:** `main` em `df4ebbb980c2b33e31aacf2f002f067e567c60ab`

## Objetivo

Certificar a integração opcional da `AttackReadProjection` ao `ApplicationReadModel` sem UI e sem cálculo automático.

## Arquivos

- `src/application/projections/ApplicationReadModel.js`
- `src/application/projections/ApplicationReadModelAttackProjection.test.js`
- `Docs/01-arquitetura/AppAttacks.md`
- `Docs/02-decisoes/ADR-0065-ReadModelProjection.md`
- `Docs/03-gates/APP-ATTACK-1.2.md`

## Critérios

- [x] projeção opcional e independente de Skill Mechanics;
- [x] pertencimento ao mesmo Character;
- [x] cópia destacada e congelamento profundo;
- [x] `null` quando ausente em modelos novos;
- [x] snapshots v2 antigos sem o campo permanecem válidos;
- [x] opções desconhecidas são rejeitadas;
- [x] nenhuma criação automática da projeção;
- [x] nenhum cálculo de combate;
- [x] nenhuma alteração de UI, domínio ou persistência.

## Coordenação

A PR #115 permanece restrita a `src/ui/mobile/*`. Não há sobreposição com os arquivos desta etapa.

## Evidência

GitHub Actions `Tests`, execução `28268624516`, concluiu com sucesso no commit de implementação `3d7c2294f1dc2a05fb213332cf043c826278dc9c`. A execução `28268674720` concluiu com sucesso no head documental `383c39b7330ce72402f94c11b60883d329d27e13`.

## Integração

- [x] PR própria única: #118;
- [x] branch atualizada na abertura;
- [x] CI integral verde no head de implementação;
- [x] CI integral verde no head documental;
- [x] nenhuma revisão bloqueante observada;
- [x] nenhuma thread própria aberta observada;
- [ ] merge serializado.
