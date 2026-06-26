# Gate — APP-ATTACK-1.0

**Status:** Em validação  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Contratos de Aplicação da Alpha  
**Branch:** `feature/app-attack-commands-1.0`  
**Base validada:** `main` em `615402d51ae04e0624c50ad222ba6438e99d0e11`

## Objetivo

Certificar comandos estruturais de ataques pelo App Core canônico, sem cálculo de combate e sem ligação com UI.

## Arquivos

- `src/application/attacks/AttackCommandHandlers.js`
- `src/application/attacks/AttackCommands.test.js`
- `src/application/attacks/AttackCommandsValidation.test.js`
- `Docs/01-arquitetura/AppAttacks.md`
- `Docs/02-decisoes/ADR-0063-AppAttackCommands.md`
- `Docs/03-gates/APP-ATTACK-1.0.md`

## Coordenação

A `main` vigente contém UI-MOBILE 0.8. A PR #115 da frente principal está aberta e altera exclusivamente cinco arquivos em `src/ui/mobile/*`. Sua CI está verde e sua thread P2 aberta trata somente da projeção mobile de papéis customizados de traços. APP-ATTACK permanece restrito a `src/application/attacks/*` e documentação própria, sem sobreposição.

## Critérios arquiteturais

- [x] reutiliza Attacks e AttacksOperations;
- [x] reutiliza ApplicationSession, CommandRegistry e CommandExecutor;
- [x] não cria segunda sessão, executor ou histórico;
- [x] não altera Character, domínio, UI ou persistência concreta;
- [x] referências usam IDs, nunca nomes;
- [x] não resolve ou copia entidades de outros agregados;
- [x] não calcula regras de GURPS;
- [x] não registra handlers em composition root nesta etapa.

## Critérios funcionais

- [x] comando para adicionar;
- [x] comando para editar;
- [x] comando para remover;
- [x] comando para reordenar;
- [x] payloads superiores estritos;
- [x] novo Character canônico em resultados aplicados;
- [x] no-op para atualização ou posição redundante;
- [x] recibos com identidade e índices relevantes;
- [x] revisão e histórico somente em `applied`;
- [x] revisão obsoleta rejeitada antes do handler;
- [x] falhas de payload e domínio preservam a sessão;
- [x] ID duplicado falha atomicamente;
- [x] persistência, undo e redo cobertos pelo App Core existente.

## Condições pendentes

- [ ] PR própria aberta;
- [ ] suíte integral verde no head final;
- [ ] nenhuma revisão bloqueante da própria PR;
- [ ] nenhuma thread aberta da própria PR;
- [ ] branch atualizada após a integração serializada da PR #115;
- [ ] merge em `main`.

## Próxima etapa automática

Após a integração verde, revalidar a `main` e iniciar APP-ATTACK 1.1: projeção portátil de leitura dos dados canônicos e declarados de ataques.
