# UI-MOBILE-TRAIT-EDIT-PERSISTENCE-FIX

## Status

Proposed

## Escopo

Corrige a renderização da camada mobile de edição inline de Traits para preservar o shell canônico de persistência após uma edição estrutural.

## Problema

A camada `CharacterMobileTraitEditApp` re-renderizava a ficha usando apenas `renderCharacterMobileApp`, o que removia a área de persistência local da árvore renderizada após `trait.update`.

Isso quebrava a expectativa dos testes e do fluxo mobile: editar um trait e salvar manualmente a sessão na sequência.

## Correção

A renderização da camada de Traits agora usa `app.ui.render({ mode })`, preservando a UI de persistência já montada, e injeta as camadas de edição em cima desse HTML.

## Fronteiras

- Não altera contratos de aplicação/domínio.
- Não altera persistência concreta.
- Não recalcula regras de GURPS na UI.
- Alteração restrita à camada mobile de Traits e documentação do fix.

## Evidência esperada

```bash
npm test
```
