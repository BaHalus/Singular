# ADR-0026 — Integração contínua canônica

**Status:** Aprovado  
**Data:** 2026-06-20

## Contexto

Durante os blocos DOM-MORPH-1.3 e DOM-MORPH-1.4 foram criados workflows temporários em branches de funcionalidade, diagnóstico, verificação e manutenção. Esses workflows produziram históricos difíceis de interpretar, execuções sem jobs, falhas que não pertenciam à suíte de testes e riscos de mutação de branches a partir de eventos amplos de `pull_request`.

A auditoria confirmou que a `main` possui uma suíte funcional e que as falhas mais recentes da interface do Actions misturavam regressões reais de domínio com falhas operacionais de workflows descartáveis.

## Decisão

### Workflow canônico

A integração contínua regular será centralizada em:

```text
.github/workflows/tests.yml
```

Gatilhos obrigatórios:

```text
push em main
pull_request
workflow_dispatch
```

Não serão usados filtros de caminhos para omitir partes da suíte.

### Runtime

O projeto declara Node 22 em `package.json`, e o workflow usa Node 22 explicitamente.

As mensagens sobre a depreciação do Node interno de `actions/checkout`, `actions/setup-node` ou outras actions não alteram a versão usada pelo código do projeto e não devem motivar troca do runtime da SINGULAR.

### Comando de teste

O comando canônico permanece:

```text
npm test
```

com:

```json
"test": "node --test"
```

Ele deve executar descoberta completa. É proibido reduzir temporariamente `npm test` a arquivos específicos para obter um run verde.

### Dependências

No estado atual não há dependências declaradas; portanto a CI não executa instalação vazia.

No primeiro PR que adicionar dependência, será obrigatório:

1. gerar e versionar `package-lock.json`;
2. usar `npm ci` na CI;
3. manter o lockfile coerente com `package.json`.

`npm install` sem lockfile não será adotado como instalação canônica.

### Workflows temporários

Não serão adicionados workflows descartáveis para:

- diagnosticar uma única branch;
- alterar automaticamente a branch de um PR;
- reduzir a suíte;
- apagar branches;
- verificar manualmente um run já consultável pela API;
- aplicar patches de domínio.

Diagnósticos devem usar logs e artefatos do workflow canônico. Operações de repositório devem usar ações explícitas da API ou da interface e nunca permanecer na árvore da `main`.

### Condições e jobs

Um workflow canônico não deve possuir condição global capaz de pular todos os jobs por causa do ator do commit. Condições `if` devem ser justificadas e testadas nos eventos correspondentes.

A suíte possui timeout e concorrência para impedir jobs presos e cancelar apenas execuções obsoletas de um mesmo PR.

### Lint, typecheck e build

A auditoria não encontrou ferramentas ou scripts reais de lint, typecheck ou build. Eles não serão simulados por comandos vazios.

Quando essas ferramentas forem introduzidas, deverão receber scripts reais, testes próprios e jobs visíveis na CI.

## Consequências

- falhas do workflow `Tests` passam a representar a suíte real;
- execuções “No jobs were run” deixam de ser produzidas por workflows auxiliares do projeto;
- o histórico do Actions ainda preserva runs antigos, mas novos blocos não aumentarão essa ambiguidade;
- a CI continua simples e compatível com a arquitetura atual;
- não há alteração de regra de domínio, schema ou UI.
