# V2_ALPHA_MOUNTED_RESTORE_LAST_SESSION_GATE

## Objetivo

Garantir, no Alpha mobile montado em `mobile.html`, que a inicialização da persistência restaure a última sessão válida através do coordenador canônico e renderize essa sessão restaurada como sessão ativa.

## Superfícies cobertas

- `mobile.html`
- `CharacterMobileCompositionRoot.js`
- `bootstrapCharacterMobileApp()`
- `mountAlphaMobilePersistenceUi()`
- `AlphaMobilePersistenceUi.js`
- `persistence.initialize()`
- `status: "restored"`
- `persistence.listSavedSessions()`
- `requestRender()`
- `data-session-id` e `data-character-id`
- `Sessão restaurada: <activeSessionId>`

## Critérios de aceitação

1. A montagem chama `persistence.initialize()` e aceita `status: "restored"` como restauração válida.
2. Após a restauração, a UI lista salvamentos por `persistence.listSavedSessions()`.
3. A renderização montada usa a sessão ativa restaurada para `data-session-id` e `data-character-id`.
4. O feedback exibido informa `Sessão restaurada: <activeSessionId>`.
5. A ficha renderizada mostra dados únicos da sessão restaurada, provando que não é apenas a lista de salvamentos que foi atualizada.
6. O fluxo restaura a sessão ativa sem alterar diretamente personagem, sessão ou storage pela UI.
7. As fronteiras Criação/Mesa continuam preservadas; Mesa continua modo de transitórios.

## Limites arquiteturais

Este gate não cria persistência paralela, não cria cálculo ou regra de domínio na UI e não cria mutação direta do personagem fora dos comandos/coordenadores existentes.

Também não cria domínio paralelo, não cria sessão paralela, não cria executor paralelo, não cria registry paralelo, não cria persistence layer paralela, não cria pipeline paralelo e não cria composition root paralelo.

## Fora de escopo

- formato universal;
- sincronização remota;
- reparo automático de registros;
- combinação de sessões;
- mecanismo adicional de persistência.
