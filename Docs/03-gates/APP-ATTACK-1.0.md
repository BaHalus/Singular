# Gate — APP-ATTACK-1.0

**Status:** Em validação  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Contratos de Aplicação da Alpha  
**Branch:** `feature/app-attack-commands-1.0`  
**Base validada:** `main` em `280d4be234262bac1139999ac091f042c5f8133b`

## Objetivo

Certificar comandos estruturais pelo App Core canônico, sem cálculo de combate e sem ligação com UI.

## Arquivos

- `src/application/attacks/AttackCommandHandlers.js`
- `src/application/attacks/AttackCommands.test.js`
- `src/application/attacks/AttackCommandsValidation.test.js`
- `Docs/01-arquitetura/AppAttacks.md`
- `Docs/02-decisoes/ADR-0063-AppAttackCommands.md`
- `Docs/03-gates/APP-ATTACK-1.0.md`

## Coordenação

A `main` de partida já continha UI-MOBILE 0.6. Essa entrega alterou somente `src/ui/mobile/CharacterMobileApp.js` e seu teste de troca de modos. APP-ATTACK permanece restrito a `src/application/attacks/*` e documentação própria.

## Critérios arquiteturais

- [x] reutiliza Attacks e AttacksOperations;
- [x] reutiliza ApplicationSession, CommandRegistry e CommandExecutor;
- [x] não cria segunda sessão, executor ou histórico;
- [x] não altera Character, domínio, UI ou persistência concreta;
- [x] referências usam IDs, nunca nomes;
- [x] não resolve ou copia entidades de outros agregados;
- [x] não calcula regras de GURPS.

## Critérios funcionais

- [x] adicionar;
- [x] editar;
- [x] remover;
- [x] reordenar;
- [x] payloads superiores estritos;
- [x] novo Character canônico em resultados aplicados;
- [x] no-op para atualização ou posição redundante;
- [x] recibos com identidade e índices relevantes;
- [x] revisão e histórico somente em applied.
