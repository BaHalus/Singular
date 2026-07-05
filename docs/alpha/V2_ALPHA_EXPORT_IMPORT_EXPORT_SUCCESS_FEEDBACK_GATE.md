# V2_ALPHA_EXPORT_IMPORT_EXPORT_SUCCESS_FEEDBACK_GATE

## Escopo

Guard mínimo para confirmar que uma exportação comunica sucesso/download pelo caminho de persistência Alpha mobile já existente, sem criar autoridade nova de persistência e sem prometer formatos ou capacidades ausentes.

## Caminho real coberto

1. `mobile.html` carrega `./src/ui/mobile/CharacterMobileCompositionRoot.js`.
2. `CharacterMobileCompositionRoot.js` delega o bootstrap para `bootstrapCharacterMobileApp()`.
3. `CharacterMobileApp.js` monta a persistência com `mountAlphaMobilePersistenceUi()`.
4. `AlphaMobilePersistenceUi.js` expõe o botão `Exportar` com a ação `persistence-export`.
5. O clique em `persistence-export` chama somente `ui.exportCharacter()`.
6. `ui.exportCharacter()` chama somente o coordenador existente `persistence.exportActiveCharacter()`.
7. Quando o coordenador retorna `status: "exported"`, a UI chama `downloadText()` com `filename`, `text` e `mimeType` do resultado existente.
8. Quando o download conclui, a UI apresenta feedback de sucesso com `Personagem exportado: <filename>`.
9. A sessão ativa permanece a sessão retornada pelo coordenador existente; exportar não troca nem recria sessão.

## Critérios obrigatórios

- `Exportar` continua alcançável no caminho real `mobile.html` → composition root mobile → app mobile → `AlphaMobilePersistenceUi.js`.
- `persistence-export` continua sendo a ação do botão de exportação existente.
- Exportação válida comunica sucesso por `role="status"`/feedback textual da UI existente.
- Exportação válida entrega `filename`, `text` e `mimeType` ao adaptador de download recebido por injeção.
- Exportação válida preserva a sessão ativa; exportar não abre, importa ou cria sessão.
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
- O guard fica restrito ao fluxo Alpha mobile atual e às mensagens já suportadas pela UI/coordenador existentes.

## Evidência executável

`src/ui/mobile/CharacterMobileExportSuccessFeedbackGate.test.js` valida o comportamento com o bootstrap/coordenador reais existentes, exportando pela UI pública, verificando chamada de download, feedback `Personagem exportado: <filename>`, preservação de `activeSessionId`, render em Criação/Mesa e ausência de promessas/camadas paralelas neste checklist.
