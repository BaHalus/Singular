# Gate — DOM-POOL-1.1

**Status:** Aprovado  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Pools transitórios  
**Branch:** `feature/dom-pool-operations-1.1`  
**Base validada:** `main` em `f869b553e74aaed9d232bd87ab9b5cb11f6d287c`

## Objetivo

Certificar operações puras e imutáveis para PV, PF e reservas opcionais, sem antecipar regras de dano, cura, fadiga ou recuperação.

## Arquivos

- `src/domain/character/PoolsOperations.js`
- `src/domain/character/PoolsOperations.test.js`
- `Docs/01-arquitetura/Pools.md`
- `Docs/02-decisoes/ADR-0057-PoolsOperations.md`
- `Docs/03-gates/GATE-DOM-POOL-1.1.md`

## Coordenação

As frentes #93, de projeção mobile, e #94, de contrato portátil de Equipamentos, foram integradas antes desta validação. Esta frente permanece restrita a Pools.

## Critérios de aceite

- [x] O `PoolsOperations` existente foi evoluído.
- [x] `setPoolCurrent`, `setPoolMaximum`, `addPool` e `removePool` foram preservados.
- [x] `adjustPoolCurrent` e `resetPoolCurrentToMaximum` foram adicionados.
- [x] Operações são imutáveis.
- [x] HP e FP continuam obrigatórios.
- [x] Pools opcionais e importados continuam suportados.
- [x] Valores não finitos são rejeitados.
- [x] `null` representa valor desconhecido.
- [x] Não existe clamp estrutural.
- [x] A UI não recebe responsabilidade mecânica.
- [x] Não há alteração em `Pools.js`, `Character.js`, App Core, UI, Equipment ou Skills.
- [x] A branch foi atualizada após as integrações anteriores.
- [x] A suíte completa passou na CI.
- [x] Não existe revisão ou thread bloqueante.

## Evidência

GitHub Actions `Tests`, execução `28250773576`: job `test` concluído com sucesso e zero falhas.

## Cobertura

A suíte cobre definição e ajuste de valores, ausência de clamp, restauração ao máximo, pools opcionais/importados, imutabilidade, proteção de HP/FP, valores desconhecidos, chaves inválidas, `NaN`, infinitos, overflow e `-0`.

## Fora de escopo

Regras mecânicas de PV/PF, comandos de aplicação, histórico, persistência concreta, componentes visuais e cálculo de máximos.

## Resultado

**DOM-POOL-1.1 aprovado para integração sequencial**, condicionado à CI verde do commit documental final e à ausência de conflito novo.
