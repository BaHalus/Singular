# Gate - APP-POWER-1.1

**Status:** Em validacao  
**Data:** 2026-06-27  
**Branch:** `feature/app-power-read-projection-1.1`

## Objetivo

Certificar a projecao portatil de leitura de Powers para a Alpha, consumindo somente campos canonicos declarados e serializados pelo dominio, com referencias por ID e diagnosticos portateis.

## Arquivos

- `src/application/projections/PowerReadProjection.js`
- `src/application/projections/PowerReadProjection.test.js`
- `Docs/02-decisoes/ADR-0071-PowerReadProjection.md`
- `Docs/03-gates/APP-POWER-1.1.md`

## Criterios

- [x] projecao destacada do Character vivo;
- [x] `powers` vem de `serializePowers`;
- [x] referencias preservam `powerId`, `talentTraitId` e `memberTraitIds`;
- [x] diagnosticos sao portateis, declarativos e sem calculo;
- [x] validacao de schema, pertencimento por `characterId` e portabilidade JSON;
- [x] congelamento profundo;
- [x] sem UI mobile;
- [x] sem bootstrap, persistencia concreta ou composition root;
- [x] sem alteracao de `ApplicationReadModel` compartilhado;
- [x] sem calculo de custo, habilidades, efeitos, ataques ou relacao por nome;
- [ ] CI integral verde no head da PR;
- [ ] revisao sem bloqueio;
- [ ] merge serializado.

## Coordenacao

APP-POWER 1.0 foi integrada pela PR #134. Esta etapa comeca de `main` apos essa integracao e evita arquivos compartilhados de alto risco, especialmente `ApplicationReadModel.js`, para nao competir com a frente UI mobile.
