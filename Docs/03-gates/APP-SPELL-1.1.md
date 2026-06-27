# Gate - APP-SPELL-1.1

**Status:** Em validacao  
**Data:** 2026-06-26  
**Branch:** `feature/app-spell-read-projection-1.1`

## Objetivo

Certificar a projecao portatil de leitura de Spells para a Alpha, consumindo somente campos canonicos declarados e serializados pelo dominio.

## Arquivos

- `src/application/projections/SpellReadProjection.js`
- `src/application/projections/SpellReadProjection.test.js`
- `Docs/02-decisoes/ADR-0069-SpellReadProjection.md`
- `Docs/03-gates/APP-SPELL-1.1.md`

## Criterios

- [x] projecao destacada do Character vivo;
- [x] `spells` vem de `serializeSpells`;
- [x] validacao de schema, pertencimento por `characterId` e portabilidade JSON;
- [x] congelamento profundo;
- [x] sem UI mobile;
- [x] sem bootstrap, persistencia concreta ou composition root;
- [x] sem calculo de NH, custo, duracao, resistencia, ataques ou pre-requisitos;
- [ ] CI integral verde no head da PR;
- [ ] revisao sem bloqueio;
- [ ] merge serializado.

## Coordenacao

APP-SPELL 1.0 foi integrada pela PR #132. Esta etapa comeca de `main` apos essa integracao e evita arquivos compartilhados de alto risco, especialmente `ApplicationReadModel.js`, para nao competir com a frente UI mobile.