# V2_ALPHA_EXPORT_IMPORT_ENTRYPOINT_GATE

Guard versionado para confirmar que as affordances `Exportar`/`Importar` já existentes continuam alcançáveis pelo caminho real de entrada do Alpha mobile, a partir de `mobile.html`, sem criar autoridade nova de persistência e sem prometer formatos ou capacidades ausentes.

## Caminho protegido

Esta fatia protege somente o encadeamento já integrado:

1. `mobile.html` monta `[data-singular-mobile-root]` e importa `./src/ui/mobile/CharacterMobileCompositionRoot.js`;
2. `mobile.html` chama `bootstrapCharacterMobileCompositionRoot()` como bootstrap real da página;
3. `CharacterMobileCompositionRoot.js` compõe sobre `bootstrapCharacterMobileApp()` sem criar composition root paralelo;
4. `CharacterMobileApp.js` monta `mountAlphaMobilePersistenceUi()` como parte do bootstrap canônico;
5. `AlphaMobilePersistenceUi.js` renderiza a seção `Persistência local`;
6. `AlphaMobilePersistenceUi.js` mantém o botão `Exportar` ligado à ação `persistence-export`;
7. `AlphaMobilePersistenceUi.js` mantém o campo `persistence-import-json` para colar JSON SINGULAR;
8. `AlphaMobilePersistenceUi.js` mantém o botão `Importar` ligado à ação `persistence-import`;
9. o fluxo Criação/Mesa continua ao redor da persistência já existente;
10. Mesa continua modo de transitórios, sem editores estruturais.

## Limites explícitos

O guard não adiciona nem autoriza:

- cálculo ou regra de domínio na UI;
- mutação direta do personagem fora dos comandos/coordenadores existentes;
- formato novo de exportação/importação não suportado;
- domínio paralelo;
- sessão paralela;
- executor paralelo;
- registry paralelo;
- persistence layer paralela;
- pipeline paralelo;
- composition root paralelo.

## Critério mínimo de aceite

A fatia passa quando um teste executável confirma que `mobile.html` alcança export/import pelo encadeamento real `mobile.html` → composition root mobile → app mobile → UI de persistência, e que o checklist limita o escopo à alcançabilidade das affordances existentes.