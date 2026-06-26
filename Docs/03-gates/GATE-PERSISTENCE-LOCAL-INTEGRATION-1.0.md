# Gate — PERSISTENCE-LOCAL-INTEGRATION-1.0

**Status:** Em validação  
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
- [x] não existe singleton global oculto;
- [x] última sessão válida é restaurada antes da montagem final;
- [x] ausência de última sessão preserva inicialização normal;
- [x] corrupção não quebra a aplicação nem apaga dados;
- [x] salvar usa SessionRepository;
- [x] falha de salvamento preserva a sessão ativa;
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

## Testes mínimos

- inicialização sem sessão salva;
- restauração da última sessão;
- ponteiro ausente ou corrompido;
- salvar e falha de storage;
- listar, abrir e excluir;
- falha de abertura preservando sessão;
- exportar Character;
- importar documento válido;
- rejeitar JSON inválido;
- rejeitar versão incompatível;
- snapshots independentes;
- revisão e histórico preservados;
- página executável restaura e salva;
- fluxo mobile renderizado e despachável;
- ausência textual e arquitetural de acesso da UI ao storage.

## Evidência pendente

- suíte integral `npm test` na CI da PR;
- revisão sem bloqueios;
- branch atualizada sobre a `main` antes do merge.

## Resultado

O gate será aprovado apenas com CI verde, ausência de threads bloqueantes e confirmação de não sobreposição com outra frente.
