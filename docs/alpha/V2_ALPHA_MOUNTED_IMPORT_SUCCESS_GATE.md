# V2 Alpha — mounted import success gate

## Scope

This checklist guards the smallest mounted UI path proving that a valid exported SINGULAR JSON can be imported from the rendered Alpha mobile persistence controls without bypassing the existing application/persistence wiring.

## User-visible path

1. Open `mobile.html` through the canonical mobile entrypoint.
2. Reach `CharacterMobileCompositionRoot.js` and `bootstrapCharacterMobileApp()`.
3. Mount persistence through `mountAlphaMobilePersistenceUi()` in `AlphaMobilePersistenceUi.js`.
4. Paste valid JSON into the `persistence-import-json` textarea.
5. Activate the `Importar` button with `data-action="persistence-import"`.
6. The mounted handler calls `ui.importJson(input.value)`.
7. The UI delegates to `persistence.importCharacter(input)`.
8. A successful import returns `status: "imported"` and changes the active session.
9. The mounted root is re-rendered with the new active session id.
10. The feedback says `Personagem importado em nova sessão: <activeSessionId>`.
11. Criação/Mesa remains reachable after the import.
12. Mesa continua modo de transitórios; this gate does not make Mesa a full editing mode.

## Architecture boundaries

- não cria persistência paralela;
- não cria cálculo ou regra de domínio na UI;
- não cria mutação direta do personagem fora dos comandos/coordenadores existentes;
- não cria domínio paralelo;
- não cria sessão paralela;
- não cria executor paralelo;
- não cria registry paralelo;
- não cria persistence layer paralela;
- não cria pipeline paralelo;
- não cria composition root paralelo.

## Non-goals

- No formato universal.
- No sincronização remota.
- No recuperação automática.
- No merge de sessões.
- No storage novo.
