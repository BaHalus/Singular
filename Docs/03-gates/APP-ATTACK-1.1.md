# Gate — APP-ATTACK-1.1

**Status:** Aprovado  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Contratos de Aplicação da Alpha  
**Branch:** `feature/app-attack-read-projection-1.1`  
**Base validada:** `main` em `2db42d8b0bed18385c6478a26a8684fe9efffca5`

## Objetivo

Certificar uma projeção portátil, versionada e imutável dos ataques canônicos e declarados do `Character`.

## Arquivos

- `src/application/projections/AttackReadProjection.js`
- `src/application/projections/AttackReadProjection.test.js`
- `Docs/01-arquitetura/AppAttacks.md`
- `Docs/02-decisoes/ADR-0064-AttackReadProjection.md`
- `Docs/03-gates/APP-ATTACK-1.1.md`

## Coordenação

APP-ATTACK 1.0 foi integrado pela PR #116. A PR #115 permanece restrita a `src/ui/mobile/*`; esta etapa não toca UI, bootstrap, `ApplicationReadModel` ou os arquivos da frente principal.

## Critérios arquiteturais

- [x] recebe somente `Character` canônico validado;
- [x] reutiliza `serializeAttacks` e `validateAttacks`;
- [x] não redefine o schema das entradas;
- [x] não resolve referências externas;
- [x] não calcula regras de GURPS;
- [x] não altera UI, domínio, persistência ou composition roots;
- [x] não anexa a projeção ao `ApplicationReadModel` nesta etapa.

## Critérios funcionais

- [x] schema version 1;
- [x] preserva `characterId`;
- [x] preserva ordem canônica;
- [x] preserva todos os campos declarados e de importação;
- [x] preserva autoridade `declared`;
- [x] produz projeção profundamente congelada;
- [x] serializa snapshot destacado;
- [x] rejeita propriedades extras e schema inválido;
- [x] rejeita IDs duplicados e autoridade inválida;
- [x] rejeita arrays esparsos, ciclos e valores não finitos;
- [x] preserva números finitos, inclusive `-0`;
- [x] projeta o `Character` resultante de comandos APP-ATTACK 1.0.

## Evidência

GitHub Actions `Tests`, execução `28267919916`, concluiu com sucesso no commit `f422f97fd6c1e55cd1c9004132ffecbd6fbf4292`, contendo implementação, testes, ADR e gate inicial.

## Integração

- [x] PR própria única: #117;
- [x] branch sem atraso em relação à `main` na abertura;
- [x] nenhuma sobreposição com a PR #115;
- [x] CI integral verde no head de implementação;
- [x] nenhuma revisão bloqueante observada;
- [x] nenhuma thread própria aberta observada;
- [ ] CI integral verde no commit documental final;
- [ ] merge serializado em `main`.

## Próxima etapa automática

Após integração, revalidar a arquitetura e iniciar APP-ATTACK 1.2: anexar a projeção opcional ao `ApplicationReadModel`, sem UI.
