# V2_ALPHA_MOUNTED_SAVE_REFRESH_GATE

## Objetivo

Adicionar o menor guard executável/manual de A5 para confirmar que o botão **Salvar** da UI Alpha mobile montada persiste a sessão ativa, atualiza a lista de salvamentos e re-renderiza a raiz existente sem criar infraestrutura paralela.

## Caminho montado coberto

- Abrir `mobile.html` pela composição canônica de `CharacterMobileCompositionRoot.js`.
- Usar `bootstrapCharacterMobileApp()` como ponto de entrada da aplicação.
- Montar a persistência com `mountAlphaMobilePersistenceUi()` em `AlphaMobilePersistenceUi.js`.
- Acionar o botão `Salvar`, declarado como `persistence-save`.
- Confirmar que o handler montado chama `ui.save()`.
- Confirmar que `ui.save()` delega ao coordenador por `persistence.saveActiveSession()`.
- Confirmar que, após `status: "saved"`, a UI chama `persistence.listSavedSessions()`.
- Confirmar que o feedback visível mostra `Sessão salva: <activeSessionId>`.
- Confirmar que a lista re-renderizada mostra o salvamento com `data-save-status="available"`.
- Confirmar que o item salvo expõe as ações existentes `persistence-open` e `persistence-remove`.
- Confirmar que o botão `Abrir`, declarado como `persistence-refresh`, continua disponível para listar salvamentos manualmente.

## Critério executável

O teste `src/ui/mobile/CharacterMobileMountedSaveRefreshGate.test.js` monta a UI real com storage em memória, dispara o clique em `persistence-save`, valida que a sessão ativa foi preservada, confirma atributos montados da raiz e verifica feedback/lista/ações após o re-render.

## Fronteiras arquiteturais

Esta fatia:

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

Criação/Mesa continuam preservados. Mesa continua modo de transitórios; salvar apenas passa pelo coordenador canônico e pela persistência local já existente.

## Fora de escopo

- formato universal;
- sincronização remota;
- recuperação automática;
- merge de sessões;
- storage novo;
- alteração visual ampla fora do feedback/lista já existentes.
