# V2_ALPHA_MOUNTED_OPEN_REFRESH_GATE

## Objetivo

Adicionar um gate executável mínimo para o fluxo A5 em que o usuário toca em `Abrir` na lista real de salvamentos montada pelo `mobile.html` e a sessão salva passa a ser a sessão ativa apresentada na ficha mobile.

## Caminho canônico coberto

- `mobile.html`
- `CharacterMobileCompositionRoot.js`
- `bootstrapCharacterMobileApp()`
- `mountAlphaMobilePersistenceUi()`
- `AlphaMobilePersistenceUi.js`
- lista montada de salvamentos locais
- botão com `data-action="persistence-open"`
- `data-session-id` do salvamento escolhido
- `ui.open(sessionId)`
- `persistence.openSession(sessionId)`
- `requestRender()` após a abertura
- atributos montados `data-session-id` e `data-character-id`
- feedback `Sessão aberta: <activeSessionId>`

## Critérios de aceite

- A lista de salvamentos vem de `persistence.listSavedSessions()` durante a montagem.
- O clique em `persistence-open` usa o `data-session-id` do item clicado.
- A abertura delega ao coordenador canônico por `persistence.openSession(sessionId)`.
- Após sucesso, o root montado é renderizado novamente pelo mesmo `requestRender()`.
- A ficha renderizada passa a exibir a sessão/personagem aberto.
- Os atributos `data-session-id` e `data-character-id` refletem a sessão ativa retornada pelo coordenador.
- Criação/Mesa permanece controlado por `mode`/`data-mode`, sem liberar edição indevida no modo Mesa.
- Mesa continua modo de transitórios.
- O fluxo não cria persistência paralela.
- O fluxo não cria cálculo ou regra de domínio na UI.
- O fluxo não cria mutação direta do personagem fora dos comandos/coordenadores existentes.
- O fluxo não cria domínio paralelo.
- O fluxo não cria sessão paralela.
- O fluxo não cria executor paralelo.
- O fluxo não cria registry paralelo.
- O fluxo não cria persistence layer paralela.
- O fluxo não cria pipeline paralelo.
- O fluxo não cria composition root paralelo.

## Fora de escopo

- Alterar formato universal de exportação.
- Sincronização remota.
- Reparo automático de registros corrompidos.
- Combinação de sessões.
- Mecanismo adicional de persistência.
- Redesenhar a tela de salvamentos.
- Alterar regras de cálculo ou domínio.