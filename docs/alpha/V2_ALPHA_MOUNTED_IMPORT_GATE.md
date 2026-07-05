# V2_ALPHA_MOUNTED_IMPORT_GATE

## Objetivo

Garantir, no Alpha mobile montado em `mobile.html`, que a ação de importar leia apenas o campo montado, delegue o JSON ao coordenador canônico e renderize a sessão ativa retornada pelo fluxo de importação.

## Superfícies cobertas

- `mobile.html`
- `CharacterMobileCompositionRoot.js`
- `bootstrapCharacterMobileApp()`
- `mountAlphaMobilePersistenceUi()`
- `AlphaMobilePersistenceUi.js`
- `persistence-import`
- `data-role="persistence-import-json"`
- `persistence.importCharacter(input)`
- `requestRender()`
- `data-session-id`
- `data-character-id`
- feedback visível de importação

## Critérios de aceitação

1. A UI montada reage ao clique/ação `persistence-import`.
2. A UI lê o valor do elemento montado `data-role="persistence-import-json"` sem acessar storage ou formatos internos.
3. A importação delega para `persistence.importCharacter(input)` sem criar domínio, sessão, executor ou persistência paralelos.
4. O feedback exibido informa a importação concluída com a nova sessão ativa.
5. A ficha renderizada passa a mostrar os dados únicos da sessão importada.
6. A renderização montada preserva `data-session-id`, `data-character-id` e o modo Criação/Mesa.
7. As fronteiras Criação/Mesa continuam preservadas; Mesa continua modo de transitórios.

## Limites arquiteturais

Este gate não cria storage paralelo, não cria persistência paralela, não cria cálculo ou regra de domínio na UI e não cria mutação direta do personagem fora dos comandos/coordenadores existentes.

Também não cria domínio paralelo, não cria sessão paralela, não cria executor paralelo, não cria registry paralelo, não cria persistence layer paralela, não cria pipeline paralelo e não cria composition root paralelo.

## Fora de escopo

- formato universal;
- sincronização remota;
- reparo automático de registros;
- combinação de sessões;
- mecanismo adicional de persistência.
