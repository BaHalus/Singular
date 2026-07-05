# V2_ALPHA_MOUNTED_EXPORT_GATE

## Objetivo

Garantir, no Alpha mobile montado em `mobile.html`, que a ação de exportar use somente o coordenador canônico para obter o personagem ativo e acione o download com o payload retornado por esse coordenador.

## Superfícies cobertas

- `mobile.html`
- `CharacterMobileCompositionRoot.js`
- `bootstrapCharacterMobileApp()`
- `mountAlphaMobilePersistenceUi()`
- `AlphaMobilePersistenceUi.js`
- `persistence-export`
- `persistence.exportActiveCharacter()`
- `downloadText(filename, json)`
- `requestRender()`
- `data-session-id`
- `data-character-id`
- feedback visível de exportação

## Critérios de aceitação

1. A UI montada reage ao clique/ação `persistence-export`.
2. A exportação delega para `persistence.exportActiveCharacter()` sem ler storage, sessão ou domínio por conta própria.
3. O download recebe exatamente o `filename` e o `json` retornados pelo coordenador de persistência.
4. O feedback exibido informa a exportação concluída com o nome do arquivo.
5. A sessão ativa permanece preservada após a exportação.
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
