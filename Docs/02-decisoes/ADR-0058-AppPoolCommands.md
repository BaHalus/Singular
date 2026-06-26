# ADR-0058 — Comandos de aplicação para Pools

**Status:** Aceito  
**Data:** 2026-06-26  
**Decisão:** APP-POOL-1.0

## Contexto

DOM-POOL-1.1 já oferece operações puras para definir, ajustar e restaurar valores atuais. APP-CORE-1.0 já oferece envelope de comando, registro, executor atômico, revisão, histórico, persistência, undo e redo.

A ficha mobile precisa alterar PV, PF e reservas sem modificar diretamente o `Character` e sem copiar regras para a UI.

## Decisão

Criar handlers isolados em `src/application/pools/PoolCommandHandlers.js`.

Os handlers serão registrados no `CommandRegistry` existente e consumidos pelo `CommandExecutor` existente.

Tipos canônicos:

```text
pool.current.set
pool.current.adjust
pool.current.reset-to-maximum
```

APP-POOL 1.0 aceita somente os pools reidratáveis pelo `Character` canônico atual: `HP`, `FP` e `EnergyReserve`.

## Autoridades

- `PoolsOperations` continua sendo a autoridade de alteração do agregado.
- `Character` continua sendo o Aggregate Root.
- `CommandExecutor` continua sendo a autoridade de revisão, histórico e atomicidade.
- `ApplicationSession` continua sendo a autoridade da sessão ativa.
- A UI apenas cria intenção e apresenta o resultado.

## Recriação do Character

O handler serializa o `Character` atual, substitui apenas `pools` pelo resultado do domínio e reidrata pelo `createCharacter` canônico.

Como `createCharacter` ainda não preserva pools importados ou customizados arbitrários, o handler bloqueia sessões que contenham chaves de pool fora de `HP`, `FP` e `EnergyReserve` antes de produzir `applied`. Assim, a aplicação não gera histórico ou recibo de sucesso enquanto descartaria dados importados.

Não existe segundo modelo de personagem nem mutação direta do objeto da sessão.

## No-op

Quando a operação não altera o valor atual, o handler retorna `no-op`.

O executor preserva sessão, revisão, histórico e `future`.

## Falhas

Erros de payload, domínio ou fronteira de reidratação são propagados ao executor. O executor produz resultado `failed` e preserva a sessão original.

## Consequências

- controles mobile de `+`, `−`, definição direta e restauração podem usar o mesmo fluxo;
- undo e redo funcionam por snapshots canônicos;
- persistência não precisa conhecer comandos de Pools;
- regras futuras podem interpretar dano ou fadiga antes de emitir estes comandos, sem alterar o contrato estrutural;
- pools importados exigem uma evolução futura do `Character`/DOM-POOL antes de serem operados pelo App Core.

## Fora de escopo

- registrar handlers automaticamente em um registro global;
- alterar arquivos centrais do App Core;
- comandos para definir máximos;
- adicionar ou remover pools pela UI;
- regras de dano, cura, fadiga ou recuperação;
- componentes visuais;
- persistência concreta de navegador.
