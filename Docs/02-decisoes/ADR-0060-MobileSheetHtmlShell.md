# ADR-0060 — Shell HTML da ficha mobile

**Status:** Aceito  
**Data:** 2026-06-26  
**Decisão:** UI-MOBILE-0.3

## Contexto

UI-MOBILE 0.1 criou uma projeção portátil de `Character` para a ficha mobile. UI-MOBILE 0.2 criou um render model portátil, ainda sem DOM visual.

A Alpha precisa avançar para uma tela utilizável no celular sem colocar cálculo na UI e sem depender da conclusão de persistência, equipamentos ou polimento visual.

## Decisão

Criar `src/ui/mobile/CharacterMobileSheetHtml.js` como shell HTML semântico mínimo produzido a partir de `CharacterMobileSheetRenderModel` validado.

O shell renderiza:

- toolbar com modo Criação, modo Mesa e Salvar ainda pendentes;
- resumo de identidade;
- faixa de ST, DX, IQ e HT;
- faixa de PV/PF atuais;
- cards de identidade, atributos, secundários e pools;
- marcadores das próximas seções, preservando `pending` e `external-front`.

## Autoridades

- O domínio e o motor continuam fornecendo dados e cálculos.
- `CharacterMobileProjection` continua sendo a ponte de dados canônicos para mobile.
- `CharacterMobileSheetRenderModel` continua sendo o contrato portátil de apresentação.
- O shell HTML apenas transforma o render model em marcação.

## Modos

O shell aceita `creation` e `table` como estado visual inicial. Isso não altera permissões, regras, comandos ou dados do personagem.

## Segurança de conteúdo

Texto e atributos são escapados para impedir que nomes, conceitos ou rótulos virem HTML arbitrário.

## Fora de escopo

- CSS final;
- hidratação interativa;
- ligação com CommandExecutor;
- ligação com persistência local;
- cálculo na UI;
- edição inline;
- drag-and-drop;
- integração do contrato canônico de Equipamentos;
- ataques, magias e poderes manuais.
