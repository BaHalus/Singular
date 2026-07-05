# V2_ALPHA_EXPORT_IMPORT_SUCCESS_FEEDBACK_GATE

## Escopo

Guard mínimo para confirmar que uma importação válida comunica sucesso e atualiza a sessão ativa pelo caminho de persistência Alpha mobile já existente.

## Caminho real coberto

1. `mobile.html` carrega `./src/ui/mobile/CharacterMobileCompositionRoot.js`.
2. `CharacterMobileCompositionRoot.js` delega o bootstrap para `bootstrapCharacterMobileApp()`.
3. `CharacterMobileApp.js` monta a persistência com `mountAlphaMobilePersistenceUi()`.
4. `AlphaMobilePersistenceUi.js` expõe `persistence-import-json` e o botão `Importar` com `persistence-import`.
5. O clique em `persistence-import` chama somente `ui.importJson(input.value)`.
6. `ui.importJson()` chama somente o coordenador existente `persistence.importCharacter(input)`.
7. Quando o coordenador retorna `status: "imported"`, a UI apresenta feedback de sucesso com `Personagem importado em nova sessão: <activeSessionId>`.
8. A sessão ativa exibida pelo estado da UI passa a vir de `persistence.getActiveSession().id` após a importação válida.

## Critérios obrigatórios

- `Importar` continua alcançável no caminho real `mobile.html` → composition root mobile → app mobile → `AlphaMobilePersistenceUi.js`.
- `persistence-import-json` continua sendo a entrada textual usada pela UI existente.
- `persistence-import` continua sendo a ação do botão de importação existente.
- Importação válida comunica sucesso por `role="status"`/feedback textual da UI existente.
- Importação válida atualiza a sessão ativa através do coordenador existente.
- Criação/Mesa continuam alcançáveis pelo render da UI mobile.
- Mesa continua modo de transitórios e não ganha editores estruturais.
- O guard não cria persistência paralela.
- O guard não cria cálculo ou regra de domínio na UI.
- O guard não cria mutação direta do personagem fora dos comandos/coordenadores existentes.
- O guard não cria domínio paralelo.
- O guard não cria sessão paralela.
- O guard não cria executor paralelo.
- O guard não cria registry paralelo.
- O guard não cria persistence layer paralela.
- O guard não cria pipeline paralelo.
- O guard não cria composition root paralelo.
- O guard não anuncia capacidades de importação/exportação ausentes do fluxo Alpha mobile atual.

## Evidência executável

`src/ui/mobile/CharacterMobileImportSuccessFeedbackGate.test.js` valida o comportamento com o bootstrap/coordenador reais existentes, exportando um JSON válido pela própria UI, reimportando-o pela UI pública e verificando feedback, `activeSessionId`, render em Criação/Mesa e ausência de promessas/camadas paralelas neste checklist.
