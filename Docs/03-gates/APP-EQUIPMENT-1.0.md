# Gate — APP-EQUIPMENT-1.0

**Status:** Em validação  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Contratos de Aplicação da Alpha  
**Branch:** `feature/app-equipment-commands-1.0`  
**Base validada:** `main` em `b5c925c71d48252c8c5370bc3a303ae3a3192e0e`

## Objetivo

Certificar comandos estruturais de equipamentos pelo App Core canônico, sem cálculo de carga, sem ligação com UI e sem persistência concreta nova.

## Arquivos

- `src/domain/character/EquipmentOperations.js`
- `src/application/equipment/EquipmentCommandHandlers.js`
- `src/application/equipment/EquipmentCommands.test.js`
- `Docs/01-arquitetura/AppEquipment.md`
- `Docs/02-decisoes/ADR-0064-AppEquipmentCommands.md`
- `Docs/03-gates/APP-EQUIPMENT-1.0.md`

## Coordenação

A `main` vigente contém APP-ATTACK 1.2 e UI-MOBILE 0.9. A PR aberta da frente principal é #121, UI-MOBILE 1.0, restrita a arquivos de `src/ui/mobile/*`. APP-EQUIPMENT 1.0 permanece restrito a domínio de Equipment, aplicação de Equipment e documentação própria, sem tocar UI ou composition roots.

## Critérios arquiteturais

- [x] reutiliza Equipment e EquipmentOperations;
- [x] reutiliza ApplicationSession, CommandRegistry e CommandExecutor;
- [x] não cria segunda sessão, executor ou histórico;
- [x] não altera Character, UI, persistência concreta ou bootstrap;
- [x] referências usam IDs, nunca nomes;
- [x] não resolve ou copia entidades de outros agregados;
- [x] não calcula regras de carga, custo, peso, deslocamento, esquiva ou combate;
- [x] não registra handlers em composition root nesta etapa;
- [x] alteração de domínio restrita a operações estruturais indispensáveis.

## Critérios funcionais

- [x] comando para adicionar;
- [x] comando para editar por patch estrito;
- [x] comando para remover;
- [x] comando para reordenar;
- [x] comando para alterar quantidade;
- [x] comando para alterar estado;
- [x] comando para guardar em recipiente;
- [x] comando para retirar para a raiz;
- [x] payloads superiores estritos;
- [x] novo Character canônico em resultados aplicados;
- [x] no-op estrutural para atualização, quantidade, estado ou posição redundante;
- [x] recibos com identidade, índices e valores relevantes;
- [x] revisão e histórico somente em `applied`;
- [x] falhas de payload e domínio preservam a sessão;
- [x] persistência, undo e redo cobertos pelo App Core existente.

## Evidência

Testes adicionados cobrem comandos, no-op, falha atômica, persistência em memória, undo e redo. A CI integral deve ser executada no head da PR antes de merge.

## Integração

- [x] branch própria única: `feature/app-equipment-commands-1.0`;
- [x] nenhuma sobreposição com a PR #121;
- [x] nenhuma alteração em UI ou arquivos compartilhados de bootstrap;
- [ ] PR própria aberta;
- [ ] CI integral verde no head da PR;
- [ ] nenhuma revisão bloqueante;
- [ ] merge serializado em `main`.

## Próxima etapa automática

Após a integração verde, revalidar a `main` e iniciar APP-EQUIPMENT 1.1: projeção portátil de leitura de Equipment consumindo contratos e totais canônicos, sem cálculo na aplicação.
