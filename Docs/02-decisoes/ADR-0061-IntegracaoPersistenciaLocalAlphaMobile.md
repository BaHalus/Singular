# ADR-0061 — Integração da Persistência Local na Alpha Mobile

**Status:** Aceito  
**Data:** 2026-06-26  
**Decisão:** PERSISTENCE-LOCAL-INTEGRATION-1.0

## Contexto

A PR #105 integrou a persistência local de navegador, mas deixou deliberadamente fora do escopo o bootstrap, a sessão ativa e os controles mobile. A PR #107 integrou `mobile.html` e `CharacterMobileApp.js` como primeira página executável, ainda sem persistência.

A Alpha de 31/07/2026 precisa de um fluxo vertical mínimo para restaurar, salvar, listar, abrir, exportar e importar sem criar uma segunda sessão, um segundo histórico ou um pipeline paralelo de serialização.

## Decisão

Criar três componentes isolados e conectá-los ao bootstrap executável existente:

1. `LocalPersistenceCoordinator`, na camada de aplicação, como autoridade dos casos de uso de persistência da sessão ativa;
2. `AlphaMobilePersistenceBootstrap`, como composition root explícito dos repositórios concretos de navegador e do runtime injetável;
3. `AlphaMobilePersistenceUi`, como apresentação mobile e ponte de eventos para o coordenador.

`CharacterMobileApp.js` permanece o bootstrap executável canônico. Ele cria uma única `ApplicationSession` inicial, compõe a persistência e aguarda a restauração antes de concluir a montagem. Nenhum componente é singleton. Quando um `root` é injetado, o bootstrap não depende de `document`; a consulta ao DOM ocorre somente quando o próprio bootstrap precisa localizar o root.

## Restauração

Na inicialização, o coordenador solicita `loadLastSession()` ao `SessionRepository` concreto.

- sessão válida: substitui a sessão ativa somente após reidratação e validação;
- ausência: preserva a sessão inicial;
- corrupção ou falha: preserva a sessão inicial e apresenta diagnósticos da inspeção canônica;
- nenhum registro é apagado automaticamente.

## Salvamento e abertura

O salvamento manual usa somente `SessionRepository.save()` e não altera a sessão ativa. A abertura usa `SessionRepository.load()` e só substitui a sessão ativa depois de validar o resultado.

Como o repositório aprovado grava registro e índice antes do ponteiro de última sessão, o coordenador executa compensação se a etapa final falhar. O bootstrap injeta uma operação de rollback baseada no `BrowserLocalPersistenceAdapter` canônico: ela remove o novo registro parcial ou restaura o snapshot anterior diretamente no registro e no índice, sem escrever o ponteiro. Assim, a seleção anterior de última sessão permanece inalterada. Falha da própria compensação produz diagnóstico explícito e não é ocultada.

A listagem pode carregar cada snapshot para apresentar identidade e revisão, mas não promove nenhuma sessão a ativa.

## Exportação e importação

A exportação usa exclusivamente `createSingularCharacterExport` e entrega o documento versionado como JSON.

A importação usa exclusivamente `parseSingularCharacterExport`. Documento rejeitado ou factory de sessão inválida preserva a sessão corrente. Documento aceito cria uma nova `ApplicationSession` canônica, com revisão zero, histórico vazio e metadados explícitos de importação.

A importação é uma substituição explícita de sessão, não um comando de edição do Character existente. Portanto, não altera nem contorna o `CommandExecutor`.

## UI

A UI:

- renderiza a ficha mobile a partir das projeções já existentes;
- apresenta Salvar, Abrir, Exportar, Importar, lista de salvamentos e diagnósticos;
- despacha intenções ao coordenador;
- não acessa storage;
- não monta snapshots;
- não interpreta o formato de exportação;
- não calcula regras.

## Arquivos

Novos:

- `src/application/persistence/LocalPersistenceCoordinator.js`
- `src/application/bootstrap/AlphaMobilePersistenceBootstrap.js`
- `src/ui/mobile/AlphaMobilePersistenceUi.js`
- testes correspondentes

Compartilhados, com alteração mínima após a PR #107:

- `src/ui/mobile/CharacterMobileApp.js`
- `src/ui/mobile/CharacterMobileApp.test.js`
- `src/ui/mobile/CharacterMobileApp.css`
- `mobile.html`

## Invariantes

1. `ApplicationSession` continua sendo a sessão autoritativa.
2. `Character` continua sendo o Aggregate Root.
3. revisão e histórico carregados são preservados integralmente.
4. falha de storage, abertura ou importação não substitui a sessão ativa.
5. a UI não acessa `localStorage`.
6. namespace, versão, reidratação e diagnósticos continuam pertencendo à infraestrutura aprovada.
7. não existe autosave contínuo nesta decisão.
8. não existe compatibilidade GCS nesta decisão.
9. `CharacterMobileApp.js` continua sendo o único bootstrap executável da página mobile.

## Consequências

A Alpha passa a ter persistência manual e restauração automática utilizáveis sem alterar contratos centrais. O bootstrap da PR #107 é evoluído, não substituído por um pipeline paralelo.

O estado `dirty` não é limpo após salvar porque não existe ainda uma operação canônica aprovada para essa transição. O salvamento registra o snapshot sem fabricar mutação de sessão.
