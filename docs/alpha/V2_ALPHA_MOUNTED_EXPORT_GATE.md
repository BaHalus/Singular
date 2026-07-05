# V2_ALPHA_MOUNTED_EXPORT_GATE

## Objetivo

Garantir, no Alpha mobile montado em `mobile.html`, que a ação de exportar delegue a exportação ao coordenador canônico, entregue o documento gerado ao adaptador de download montado e preserve a sessão ativa renderizada.

## Superfícies cobertas

- `mobile.html`
- `CharacterMobileCompositionRoot.js`
- `bootstrapCharacterMobileApp()`
- `mountAlphaMobilePersistenceUi()`
- `AlphaMobilePersistenceUi.js`
- botão com `data-action="persistence-export"`
- `ui.exportCharacter()`
- `persistence.exportActiveCharacter()`
- `downloadText({ filename, text, mimeType })`
- feedback `Personagem exportado: <filename>`
- `requestRender()` após a exportação
- atributos montados `data-session-id` e `data-character-id` preservando a sessão ativa

## Critérios de aceitação

1. A UI montada reage ao clique/ação `persistence-export`.
2. O fluxo delega ao coordenador canônico por `persistence.exportActiveCharacter()`.
3. O adaptador de download recebe o `filename` e o JSON retornados pelo coordenador, sem recompor dados na UI.
4. O download usa `mimeType: "application/json"`.
5. Após sucesso, o root montado é renderizado novamente pelo mesmo `requestRender()`.
6. O feedback exibido informa `Personagem exportado: <filename>`.
7. A exportação preserva a sessão ativa; `data-session-id` e `data-character-id` continuam refletindo a sessão ativa retornada pelo coordenador.
8. As fronteiras Criação/Mesa continuam preservadas; Mesa continua modo de transitórios.

## Limites arquiteturais

Este gate não cria persistência paralela, não cria cálculo ou regra GURPS na UI e não cria mutação direta do personagem fora dos comandos/coordenadores existentes.

Também não cria domínio paralelo, não cria sessão paralela, não cria executor paralelo, não cria registry paralelo, não cria persistence layer paralela, não cria pipeline paralelo e não cria composition root paralelo.

## Fora de escopo

- alterar formato universal de exportação;
- sincronização remota;
- reparo automático de registros corrompidos;
- combinação de sessões;
- mecanismo adicional de persistência;
- redesenhar a tela de salvamentos;
- alterar regras de cálculo ou domínio.
