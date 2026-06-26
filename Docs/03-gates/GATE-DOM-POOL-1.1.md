# Gate — DOM-POOL-1.1

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Pools transitórios  
**Branch:** `feature/dom-pool-operations-1.1`  
**Base:** `main` em `3a7898ae23e559361677f3c2cc62cfb9dc8a57c7`

## Objetivo

Certificar operações puras e imutáveis para os valores transitórios de PV, PF e reservas opcionais, sem antecipar regras de dano, cura, fadiga ou recuperação.

## Arquivos desta frente

- `src/domain/character/PoolsOperations.js`
- `src/domain/character/PoolsOperations.test.js`
- `Docs/01-arquitetura/Pools.md`
- `Docs/02-decisoes/ADR-0057-PoolsOperations.md`
- `Docs/03-gates/GATE-DOM-POOL-1.1.md`

## Coordenação

No momento da implementação existem duas PRs paralelas:

- #93 altera somente `src/ui/mobile/*`;
- #94 altera `src/engine/equipment/*` e documentação específica de Equipamentos.

Esta frente altera somente o domínio e a documentação de Pools. Não há sobreposição de arquivos.

## Critérios de aceite

- [x] O `PoolsOperations` existente foi evoluído, não substituído por contrato paralelo.
- [x] `setPoolCurrent` foi preservado.
- [x] `setPoolMaximum` foi preservado.
- [x] `addPool` foi preservado.
- [x] `removePool` foi preservado.
- [x] `adjustPoolCurrent` foi adicionado.
- [x] `resetPoolCurrentToMaximum` foi adicionado.
- [x] Operações são imutáveis.
- [x] HP e FP continuam obrigatórios.
- [x] Pools opcionais e importados continuam suportados.
- [x] Valores numéricos não finitos são rejeitados.
- [x] `null` continua representando valor desconhecido.
- [x] Valores atuais negativos ou acima do máximo não são limitados.
- [x] A UI não recebe responsabilidade mecânica.
- [x] Não há alteração em `Character.js`, App Core, UI, Equipment ou Skills.
- [x] A branch foi atualizada sobre a `main` vigente observada.
- [ ] A suíte completa passa na CI.
- [ ] Não existe revisão ou thread bloqueante.

## Casos cobertos

- definição de valor atual e máximo;
- ajuste incremental positivo e negativo;
- ausência deliberada de clamp;
- restauração ao máximo conhecido;
- Energy Reserve opcional;
- pools importados adicionais;
- adição e remoção imutáveis;
- proteção de HP e FP obrigatórios;
- valores desconhecidos;
- chaves ausentes ou inválidas;
- `NaN`, infinitos e overflow da soma;
- normalização de `-0`.

## Fora de escopo

- regras de dano, cura, fadiga ou recuperação;
- comandos de aplicação;
- histórico e desfazer/refazer;
- persistência concreta;
- componentes visuais;
- alteração de máximos derivados pelo motor.

## Condição de fechamento

O gate muda para **Aprovado** somente quando:

1. a branch estiver atualizada sobre a `main` vigente;
2. a CI estiver verde;
3. não houver revisão bloqueante;
4. a PR estiver pronta para integração sequencial.
