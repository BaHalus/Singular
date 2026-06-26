# Gate — APP-POOL-1.0

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Comandos de Pools  
**Branch:** `feature/app-pool-commands-1.0`

## Objetivo

Certificar comandos de aplicação para alterar valores atuais de Pools pelo App Core canônico, com revisão, histórico, persistência, undo e redo.

## Arquivos

- `src/application/pools/PoolCommandHandlers.js`
- `src/application/pools/PoolCommandHandlers.test.js`
- `Docs/01-arquitetura/AppPool.md`
- `Docs/02-decisoes/ADR-0058-AppPoolCommands.md`
- `Docs/03-gates/GATE-APP-POOL-1.0.md`

## Coordenação

Durante a implementação existe a PR #103, restrita a `src/ui/mobile/*`.

APP-POOL altera apenas `src/application/pools/*` e documentação própria. Não há sobreposição de arquivos.

## Critérios de aceite

- [x] Reutiliza `PoolsOperations`.
- [x] Reutiliza `CommandRegistry` e `CommandExecutor`.
- [x] Não cria segundo registro, executor, sessão ou histórico.
- [x] Define valor atual por comando.
- [x] Ajusta valor atual por delta.
- [x] Restaura valor atual ao máximo.
- [x] Payloads possuem vocabulário estrito.
- [x] Alterações produzem novo `Character` canônico.
- [x] Operações sem mudança retornam `no-op`.
- [x] Revisão obsoleta é rejeitada antes do handler.
- [x] Falhas preservam a sessão original.
- [x] Valores negativos e acima do máximo não são limitados.
- [x] Energy Reserve existente é suportada.
- [x] Histórico é criado pelo executor existente.
- [x] Persistência, undo e redo são cobertos verticalmente.
- [x] Não altera `Character.js`, DOM-POOL, App Core central ou UI.
- [ ] Branch atualizada sobre a `main` vigente.
- [ ] Suíte completa verde na CI.
- [ ] Ausência de revisão ou thread bloqueante.

## Casos cobertos

- registro das três entradas de comando;
- set aplicado;
- ajuste positivo ou negativo;
- valor abaixo de zero;
- reset ao máximo;
- Energy Reserve;
- set igual, delta zero e reset redundante como `no-op`;
- revisão obsoleta;
- propriedade extra no payload;
- pool ausente;
- delta não finito;
- persistência da sessão;
- undo e redo por snapshots.

## Fora de escopo

- regras mecânicas de dano, cura, fadiga ou recuperação;
- comandos de máximo, criação ou remoção de pools;
- registro global automático;
- componentes visuais;
- persistência concreta de navegador.

## Condição de fechamento

O gate será aprovado quando:

1. a branch estiver atualizada sobre a `main` vigente;
2. a CI completa estiver verde;
3. não houver revisão bloqueante;
4. a integração respeitar a ordem das PRs abertas.
