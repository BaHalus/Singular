# Gate — UI-MOBILE-0.3

**Status:** Em validação  
**Data:** 2026-06-26  
**Frente:** SINGULAR MVP Julho  
**Branch:** `feature/mobile-sheet-html-shell`

## Objetivo

Certificar o primeiro shell HTML semântico da ficha mobile a partir do render model portátil, sem cálculo na UI e sem dependência da persistência local ou da frente de Equipamentos.

## Arquivos

- `src/ui/mobile/CharacterMobileSheetHtml.js`
- `src/ui/mobile/CharacterMobileSheetHtml.test.js`
- `Docs/02-decisoes/ADR-0060-MobileSheetHtmlShell.md`
- `Docs/03-gates/GATE-UI-MOBILE-0.3.md`

## Critérios

- [x] Consome somente `CharacterMobileSheetRenderModel` validado.
- [x] Não acessa `Character` diretamente.
- [x] Não calcula regras, pontos, níveis, carga ou derivados.
- [x] Renderiza identidade, atributos, PV/PF e cards já disponíveis.
- [x] Preserva seções pendentes e `external-front` sem inventar contrato.
- [x] Escapa texto e atributos.
- [x] Mantém modos Criação/Mesa como estado visual inicial, sem autorização funcional.
- [x] Não altera arquivos centrais, domínio, aplicação, persistência ou Equipamentos.

## Evidência esperada

A CI completa do repositório, workflow `Tests`, deve validar a PR antes de integração.

## Fora de escopo

CSS final, hidratação interativa, comandos, persistência, edição inline, drag-and-drop, integração de Equipamentos, ataques, magias e poderes.

## Resultado

**UI-MOBILE-0.3 fica apto a revisão quando a CI da PR estiver verde.**
