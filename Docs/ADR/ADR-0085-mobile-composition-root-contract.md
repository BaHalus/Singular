# ADR-0061 — Contrato do Composition Root Mobile

Status: Proposto

## Contexto

A Alpha mobile já possui um entrypoint único em `CharacterMobileCompositionRoot.js`, mas ele ainda delega diretamente ao último bootstrap da cadeia de editores. Essa cadeia faz cada módulo chamar o bootstrap anterior e depois destruir o anterior como parte do seu próprio ciclo de vida.

Esse desenho preservou compatibilidade incremental, porém não representa um composition root real: a orquestração ainda está distribuída pelos módulos, e a ordem efetiva de montagem/destruição fica codificada em dependências entre módulos.

## Decisão

O composition root mobile deve ser o único responsável por orquestrar a montagem e destruição dos módulos da aplicação mobile.

O contrato alvo é:

1. `bootstrapCharacterMobileApp(options)` cria uma única instância da aplicação mobile, incluindo sessão, persistência, comandos, repositórios, UI, modo e runtime.
2. Cada módulo mobile expõe um montador independente que recebe a aplicação já criada e instala apenas os seus efeitos próprios: renderização complementar, listeners, observers e handlers.
3. Nenhum módulo de feature deve chamar o bootstrap de outro módulo de feature.
4. Nenhum módulo de feature deve destruir outro módulo de feature.
5. `bootstrapCharacterMobileCompositionRoot(options)` chama o bootstrap base uma vez, executa os montadores na ordem declarada e destrói os módulos em ordem inversa.
6. A aplicação e os módulos continuam sem cálculo derivado de GURPS; cálculo permanece no motor, schema declara e UI coleta intenção/apresenta resultado.

## Não decisão

Esta ADR não cria novo pipeline, nova sessão, novo executor, novo normalizador, nova persistência nem novo domínio. A mudança é apenas de orquestração da camada mobile.

## Critérios de aceite para H3

- O root não delega ao último bootstrap da cadeia.
- A criação de `ApplicationSession`, persistência e comandos ocorre uma única vez por bootstrap do composition root.
- Módulos de feature são montados por funções independentes que recebem `app`.
- Destruição ocorre no root, em ordem inversa.
- Testes cobrem ausência de encadeamento crítico, ausência de listeners duplicados e preservação de sessão/persistência única.

## Sequência recomendada

1. Extrair montador independente do primeiro módulo da cadeia e preservar o bootstrap legado como compatibilidade temporária.
2. Repetir a extração módulo a módulo até `PowerEdit`.
3. Trocar o composition root para usar os montadores independentes.
4. Remover a dependência crítica de bootstrap/destroy entre módulos.
5. Consolidar testes redundantes H1/H2 antes de iniciar H5.
