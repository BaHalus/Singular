# Gate — PERSISTENCE-LOCAL-INTEGRATION-1.0

**Status:** Aprovado  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Integração da Persistência Local na Alpha Mobile  
**Branch:** `feature/alpha-mobile-local-persistence-integration`

## Objetivo

Certificar a ligação vertical entre a persistência local aprovada, a sessão autoritativa e a página mobile executável da Alpha.

## Arquivos

Novos:

- `src/application/persistence/LocalPersistenceCoordinator.js`
- `src/application/bootstrap/AlphaMobilePersistenceBootstrap.js`
- `src/application/bootstrap/AlphaMobilePersistenceBootstrap.test.js`
- `src/ui/mobile/AlphaMobilePersistenceUi.js`
- `src/ui/mobile/AlphaMobilePersistenceUi.test.js`
- `Docs/02-decisoes/ADR-0061-IntegracaoPersistenciaLocalAlphaMobile.md`
- `Docs/03-gates/GATE-PERSISTENCE-LOCAL-INTEGRATION-1.0.md`

Compartilhados com UI-MOBILE 0.4:

- `src/ui/mobile/CharacterMobileApp.js`
- `src/ui/mobile/CharacterMobileApp.test.js`
- `src/ui/mobile/CharacterMobileApp.css`
- `mobile.html`

## Critérios

- [x] bootstrap executável cria uma única ApplicationSession inicial;
- [x] bootstrap cria e injeta CharacterRepository e SessionRepository concretos;
- [x] storage é injetável;
- [x] root injetado não exige acesso ao document;
- [x] não existe singleton global oculto;
- [x] última sessão válida é restaurada antes da montagem final;
- [x] ausência de última sessão preserva inicialização normal;
- [x] corrupção não quebra a aplicação nem apaga dados;
- [x] salvar usa SessionRepository;
- [x] falha de salvamento preserva a sessão ativa;
- [x] falha do ponteiro de última sessão compensa registro e índice parciais;
- [x] salvamentos podem ser listados, abertos e excluídos;
- [x] falha de abertura preserva a sessão ativa;
- [x] exportação usa `createSingularCharacterExport`;
- [x] importação usa `parseSingularCharacterExport`;
- [x] JSON inválido e versão incompatível são rejeitados;
- [x] sessão ativa só muda após validação bem-sucedida;
- [x] revisão, histórico e dados canônicos sobrevivem ao roundtrip;
- [x] UI não acessa storage diretamente;
- [x] UI apresenta ações, lista, sucesso, falha e diagnósticos;
- [x] `mobile.html` aguarda o bootstrap assíncrono;
- [x] não há autosave contínuo;
- [x] nenhum arquivo central ou domínio mecânico foi alterado.

## Testes executados

A suíte integral canônica `npm test` passou na CI da PR com **1.433 testes aprovados e zero falhas**.

A cobertura específica inclui:

- inicialização sem sessão salva;
- restauração da última sessão;
- ponteiro ausente ou corrompido;
- salvar e falha de storage;
- rollback quando a gravação do ponteiro `last-session` falha;
- listar, abrir e excluir;
- falha de abertura preservando sessão;
- exportar Character;
- importar documento válido;
- rejeitar JSON inválido;
- rejeitar versão incompatível;
- snapshots independentes;
- revisão e histórico preservados;
- página executável restaura e salva;
- bootstrap com root injetado sem document;
- fluxo mobile renderizado e despachável;
- ausência textual e arquitetural de acesso da UI ao storage.

## Evidências

- CI verde no workflow **Tests #884**, sobre o código e ADR aceito;
- feedback P2 de atomicidade corrigido com compensação e teste dedicado;
- thread de revisão respondida e resolvida;
- feedback P1 sobre root injetado corrigido no código e coberto pelo teste vertical;
- branch baseada no head `d6d179b` da `main`;
- PR #108 é a única PR aberta;
- frente concorrente de controles de PV/PF permanece sem PR e sem escrita sobre os arquivos compartilhados até esta integração.

## Resultado

O gate `PERSISTENCE-LOCAL-INTEGRATION-1.0` está aprovado. A integração preserva as autoridades canônicas, não introduz acesso direto da UI ao storage e entrega o fluxo mobile mínimo de restauração, salvar, abrir, excluir, exportar, importar e diagnosticar falhas.
