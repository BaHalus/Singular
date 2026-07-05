# V2_ALPHA_EXPORT_IMPORT_REACHABILITY_GATE

Guard versionado para validar que as affordances de export/import já existentes no Alpha mobile continuam alcançáveis a partir de `mobile.html`, sem criar autoridade nova de persistência e sem prometer formatos ou capacidades ausentes.

## Escopo protegido

Este gate cobre somente o que já está integrado no caminho mobile canônico:

1. abrir `mobile.html` e montar a raiz `[data-singular-mobile-root]`;
2. carregar a composition root mobile canônica `CharacterMobileCompositionRoot.js`;
3. renderizar a seção `Persistência local` produzida por `AlphaMobilePersistenceUi.js`;
4. manter a ação `persistence-export` alcançável pelo botão `Exportar`;
5. manter a área de entrada `persistence-import-json` visível para colar JSON SINGULAR;
6. manter a ação `persistence-import` alcançável pelo botão `Importar`;
7. preservar o fluxo Criação/Mesa já integrado ao redor da persistência;
8. preservar Mesa como modo de transitórios, sem editores estruturais;
9. preservar salvamento/listagem existentes sem adicionar persistence layer paralela;
10. comunicar rejeição/falha de importação preservando a sessão ativa.

## Proibições de escopo

O gate não deve introduzir:

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

A fatia passa quando um teste executável confirma que a UI de persistência já renderiza as affordances `Exportar`/`Importar` e que o checklist continua limitando o escopo a alcançabilidade, sem criar persistência paralela nem prometer capacidades ausentes.
