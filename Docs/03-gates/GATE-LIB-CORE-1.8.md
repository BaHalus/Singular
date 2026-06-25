# GATE-LIB-CORE-1.8 — Integração da Library com o App Core

**Status:** Marco aprovado para revisão  
**Data:** 2026-06-25  
**ADR:** ADR-0044, ADR-0042

## Objetivo

Certificar a passagem da instanciação da Library pela fronteira canônica de comandos do App Core, sem criar mutação paralela do `Character`, histórico alternativo ou regras GURPS na aplicação.

## Entregas certificadas

### Comando canônico

- tipo `library.instantiate`;
- handler construído por `createLibraryInstantiationCommandHandler`;
- constante e handler exportados para composição no `CommandRegistry` da aplicação;
- execução exclusivamente pelo `CommandExecutor` quando o handler estiver registrado pelo compositor da aplicação.

### Contexto de aplicação

- ID e revisão atuais da `ApplicationSession` entregues à análise;
- snapshot serializado do `Character` atual disponível aos adapters;
- contexto adicional do pedido preservado como valor portátil;
- nenhuma referência a objeto vivo persistida no recibo.

### Bloqueios

- análise bloqueante produz `no-op` diagnosticado;
- planejamento bloqueante produz `no-op` diagnosticado;
- runner e fronteira de aplicação não são chamados quando o plano não é executável;
- diagnósticos da Library permanecem disponíveis no resultado.

### Fronteira de aplicação

- `applyInstantiation` é injetada explicitamente;
- resultado `applied` exige `Character` válido;
- resultado `no-op` não pode devolver `Character`;
- exceções ou resultados inválidos preservam integralmente a sessão recebida;
- não existe patch genérico de `Character` no App Core.

### Atomicidade e recibo

- o `CommandExecutor` continua sendo a única autoridade de commit;
- uma aplicação bem-sucedida incrementa exatamente uma revisão;
- histórico e `future` seguem o contrato canônico do App Core;
- o recibo de domínio preserva raízes, plano, orquestração e recibo específico da aplicação;
- falha não cria histórico nem recibo aplicado.

## Evidências

- PR #71 integrada;
- Tests #757 verde no head final `224d7a4`;
- observação P2 sobre bloqueio durante planejamento atendida;
- thread de revisão resolvida antes da integração;
- cobertura de aplicação, bloqueio em análise, bloqueio em planejamento, falha atômica e resultado inválido.

## Fronteiras preservadas

- a Library declara, analisa e planeja;
- adapters proprietários executam ações de domínio;
- a fronteira injetada compõe APIs públicas dos domínios;
- o `CommandExecutor` efetiva a transição da sessão;
- o motor continua calculando;
- a UI continua sem cálculo;
- não existe segundo histórico, segundo despachante ou segundo `Character`.

## Regressões proibidas

- escrever diretamente na sessão fora do `CommandExecutor`;
- aceitar resultado `applied` sem `Character` válido;
- chamar a aplicação após análise ou planejamento bloqueante;
- criar patch genérico para qualquer domínio do `Character`;
- interpretar payloads da Library no App Core;
- duplicar handlers, registries, recibos, histórico ou pipelines de importação;
- mover regras GURPS para a aplicação ou UI.

## Limites deste gate

Este gate não certifica:

- registro automático de `library.instantiate` em um `CommandRegistry` global já montado;
- adapters concretos de inserção para todos os domínios;
- importação/exportação modular da Library;
- persistência concreta da Library em navegador ou arquivo;
- picker, UI ou fluxo visual de biblioteca;
- fechamento definitivo da frente LIB-CORE.

## Próxima etapa

Definir o contrato portátil de importação e exportação modular da Library, reutilizando `LibraryDefinition`, `LibraryRegistry` e adapters existentes. A etapa não deve duplicar parsers externos, normalizadores ou catálogos proprietários.

## Resultado

A instanciação da Library possui comando, handler e fronteira de aplicação integrados à autoridade canônica do App Core. A composição concreta deve registrar o handler no `CommandRegistry` usado pela aplicação. O próximo domínio aberto é a portabilidade modular do catálogo; UI e persistência concreta permanecem posteriores.
