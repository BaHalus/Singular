# Gate — APP-SPELL-1.0

**Status:** Em validação  
**Data:** 2026-06-26  
**Branch:** `feature/app-spell-commands-1.0`

## Objetivo

Certificar comandos estruturais mínimos de Spells pelo App Core, sem cálculo e sem UI.

## Arquivos

- `src/application/spells/SpellCommandHandlers.js`
- `src/application/spells/SpellCommandHandlers.test.js`
- `Docs/02-decisoes/ADR-0068-SpellCommands.md`
- `Docs/03-gates/APP-SPELL-1.0.md`

## Operações canônicas cobertas

- [x] adicionar magia com ID explícito;
- [x] editar campos declarados por patch estrito;
- [x] remover magia;
- [x] reordenar magia por índice;
- [x] intenções redundantes produzem `no-op`;
- [x] IDs explícitos em magias adicionadas;
- [x] payloads inválidos falham atomicamente;
- [x] nenhuma soma ou cálculo de NH, custo, duração, resistência, ataques ou pré-requisitos;
- [x] nenhuma alteração de UI, bootstrap ou persistência concreta.

## Coordenação

APP-EQUIPMENT 1.0 e APP-EQUIPMENT 1.1 já estão integradas. Esta etapa não altera arquivos da frente UI mobile nem arquivos compartilhados de alto risco.

## Evidência pendente

- [ ] CI integral verde no head da PR;
- [ ] revisão sem bloqueio;
- [ ] merge serializado.