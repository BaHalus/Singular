# V2_ALPHA_MOUNTED_REMOVE_REFRESH_GATE

## Objetivo

Adicionar um gate executável mínimo para o fluxo A5 em que o usuário toca em `Excluir` na lista real de salvamentos montada pelo `mobile.html` e o salvamento escolhido é removido sem trocar a sessão ativa apresentada na ficha mobile.

## Caminho canônico coberto

- `mobile.html`
- `CharacterMobileCompositionRoot.js`
- `bootstrapCharacterMobileApp()`
- `mountAlphaMobilePersistenceUi()`
- `AlphaMobilePersistenceUi.js`
- lista montada de salvamentos locais
- botão com `data-action="persistence-remove"`
- `data-session-id` do salvamento escolhido
- `ui.remove(sessionId)`
- `persistence.removeSession(sessionId)`
- `persistence.listSavedSessions()` após a remoção
- `requestRender()` após a exclusão
- feedback `Salvamento excluído: <sessionId>`
- atributos montados `data-session-id` e `data-character-id` preservando a sessão ativa

## Critérios de aceite

- A lista inicial de salvamentos vem de `persistence.listSavedSessions()` durante a montagem.
- O clique em `persistence-remove` usa o `data-session-id` do item clicado.
- A exclusão delega ao coordenador canônico por `persistence.removeSession(sessionId)`.
- Após a exclusão, a UI relista por `persistence.listSavedSessions()`.
- Após sucesso, o root montado é renderizado novamente pelo mesmo `requestRender()`.
- O item excluído desaparece da lista montada.
- Os demais salvamentos continuam listados e acionáveis.
- O fluxo preserva a sessão ativa, sem abrir ou recriar personagem.
- Os atributos `data-session-id` e `data-character-id` continuam refletindo a sessão ativa retornada pelo coordenador.
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
