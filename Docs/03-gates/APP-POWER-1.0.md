# Gate - APP-POWER-1.0

**Status:** Em validacao  
**Data:** 2026-06-26  
**Branch:** `feature/app-power-commands-1.0`

## Objetivo

Certificar comandos estruturais de Powers pelo App Core, reutilizando `PowersOperations`, sem UI e sem calculo.

## Arquivos

- `src/application/powers/PowerCommandHandlers.js`
- `src/application/powers/PowerCommandHandlers.test.js`
- `Docs/02-decisoes/ADR-0070-PowerCommands.md`
- `Docs/03-gates/APP-POWER-1.0.md`

## Criterios

- [x] adicionar poder com ID explicito;
- [x] remover poder;
- [x] renomear;
- [x] alterar fonte, modificador, talento e notas;
- [x] adicionar e remover membros por Trait id;
- [x] adicionar e remover tags;
- [x] no-op para membro ou tag sem alteracao;
- [x] sem UI mobile;
- [x] sem bootstrap, persistencia concreta ou composition root;
- [x] sem calculo de custo, habilidades ou efeitos;
- [ ] CI integral verde no head da PR;
- [ ] revisao sem bloqueio;
- [ ] merge serializado.

## Coordenacao

APP-SPELL 1.1 foi integrada pela PR #133. Esta etapa comeca de `main` apos essa integracao e evita arquivos compartilhados de alto risco.