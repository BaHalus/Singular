# Gate — APP-POOL-1.0

**Status:** Aprovado  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Comandos de Pools  
**Branch:** `feature/app-pool-commands-1.0`  
**Base validada:** `main` em `c8114bba2be28655ae6a8aa0b37e626ca874aa04`

## Objetivo

Certificar comandos para alterar valores atuais de Pools pelo App Core canônico, com revisão, histórico, persistência, undo e redo.

## Arquivos

- `src/application/pools/PoolCommandHandlers.js`
- `src/application/pools/PoolCommandHandlers.test.js`
- `Docs/01-arquitetura/AppPool.md`
- `Docs/02-decisoes/ADR-0058-AppPoolCommands.md`
- `Docs/03-gates/GATE-APP-POOL-1.0.md`

## Coordenação

A PR #103 foi integrada antes da validação final. APP-POOL permanece restrito a `src/application/pools/*` e documentação própria.

## Critérios

- [x] Reutiliza DOM-POOL e App Core.
- [x] Não cria autoridade paralela.
- [x] Implementa set, ajuste e restauração.
- [x] Payloads são estritos.
- [x] Mudanças produzem `Character` canônico.
- [x] Redundâncias produzem `no-op`.
- [x] Revisões obsoletas são rejeitadas.
- [x] Falhas preservam a sessão.
- [x] Não existe clamp estrutural.
- [x] Energy Reserve é suportada.
- [x] Pools importados não reidratáveis são bloqueados antes de `applied`.
- [x] Histórico, persistência, undo e redo foram testados.
- [x] Não altera arquivos centrais nem UI.
- [x] Branch atualizada após UI-MOBILE 0.2.
- [x] CI completa verde.
- [x] Revisão P2 sobre perda de pools importados endereçada por guarda explícita e teste.

## Evidência

GitHub Actions `Tests`, execução `28254610768`: sucesso integral no commit `51cc469850959bd1db9693d092edd7ce66a3e754` antes do ajuste documental final.

## Fora de escopo

Regras de dano, cura, fadiga ou recuperação; comandos de máximo, criação ou remoção de pools; registro global automático; componentes visuais e persistência concreta; suporte operacional a pools importados/customizados arbitrários.

## Resultado

**APP-POOL-1.0 aprovado para integração sequencial**, condicionado à CI verde do commit documental final e à ausência de novo conflito.
