# V2_ALPHA_EXPORT_IMPORT_FAILURE_FEEDBACK_GATE

Guard versionado para confirmar que importação rejeitada/corrompida comunica feedback e preserva a sessão ativa através da UI de persistência Alpha mobile existente, sem criar persistence layer paralela e sem prometer recuperação ou capacidades ausentes.

## Caminho protegido

Esta fatia protege somente o fluxo já integrado:

1. `AlphaMobilePersistenceUi.js` renderiza a seção `Persistência local` dentro do Alpha mobile;
2. o campo `persistence-import-json` continua sendo a entrada do JSON SINGULAR existente;
3. o botão `Importar` continua ligado à ação `persistence-import`;
4. `mountAlphaMobilePersistenceUi()` encaminha a intenção para `ui.importJson()`;
5. `ui.importJson()` delega para `persistence.importCharacter()` do coordenador existente;
6. importação rejeitada/corrompida retorna `status: "rejected"` ou falha sem trocar a sessão ativa;
7. a UI apresenta feedback textual de rejeição/falha;
8. os diagnósticos existentes continuam renderizados para o usuário;
9. Criação/Mesa continuam alcançáveis em volta da persistência;
10. Mesa continua modo de transitórios, sem editores estruturais.

## Limites explícitos

O guard não adiciona nem autoriza:

- cálculo ou regra de domínio na UI;
- mutação direta do personagem fora dos comandos/coordenadores existentes;
- recuperação automática de documento corrompido;
- promessa de formato novo de exportação/importação;
- domínio paralelo;
- sessão paralela;
- executor paralelo;
- registry paralelo;
- persistence layer paralela;
- pipeline paralelo;
- composition root paralelo.

## Critério mínimo de aceite

A fatia passa quando um teste executável confirma que um clique no botão `Importar`, usando JSON corrompido no campo `persistence-import-json`, preserva a sessão ativa, renderiza feedback de rejeição/falha e mantém a arquitetura limitada à UI/coordenador de persistência já existentes.