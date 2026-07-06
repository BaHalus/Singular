# V2_ALPHA_A5_FULL_ACCEPTANCE_GATE

## Objetivo

Provar, em uma única capacidade A5, o fluxo completo de persistência do Alpha mobile montado a partir da superfície usada por `mobile.html`, sem criar persistência paralela ou regras de domínio na UI.

## Fluxo coberto

1. Inicialização restaura a última sessão válida.
2. Salvamento manual chama o coordenador canônico e atualiza a lista de salvamentos.
3. Sem autosave contínuo: esta aceitação respeita a ADR-0061 e não inventa registro de autosave fora do coordenador real.
4. Lista de salvamentos distingue registros disponíveis e ilegíveis.
5. Abrir salvamento troca a sessão ativa pelo coordenador.
6. Excluir salvamento remove apenas o registro solicitado e mantém os demais registros válidos.
7. Exportar formato SINGULAR usa o documento retornado pelo coordenador e delega ao adaptador de download.
8. Importar formato SINGULAR cria nova sessão via coordenador.
9. Documento corrompido comunica rejeição/diagnóstico sem apagar registros válidos.
10. Restaurar última sessão após corrupção continua retornando o último snapshot válido.

## Fronteiras arquiteturais

- UI apresenta/coleta e chama `mountAlphaMobilePersistenceUi()`.
- Aplicação/coordenador orquestra `initialize`, `saveActiveSession`, `listSavedSessions`, `openSession`, `removeSession`, `exportActiveCharacter` e `importCharacter`.
- Persistência guarda snapshots.
- Motor/domínio continuam fora da UI.
- Não cria storage paralelo, domínio paralelo, executor paralelo, registry paralelo, composition root paralelo, pipeline paralelo nem cálculo GURPS na UI.

## Fora de escopo

- redesenhar a tela;
- alterar formato universal;
- reparar automaticamente registros corrompidos;
- sincronização remota;
- combinar sessões;
- criar novo mecanismo de persistência;
- criar autosave contínuo enquanto a ADR-0061 mantiver essa capacidade fora da decisão.