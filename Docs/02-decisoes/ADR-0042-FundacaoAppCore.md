# ADR-0042 — Fundação canônica do App Core

**Status:** Aprovado  
**Data:** 2026-06-22  
**Bloco:** APP-CORE-1.0

## Contexto

A SINGULAR já possuía um `Character` canônico, domínios soberanos, operações atômicas, importadores e Point Ledger. Faltava uma camada única para coordenar intenção de usuário, revisão do estado, histórico, persistência e projeções sem deslocar regras GURPS para a UI.

Sem essa camada, cada interface poderia criar seu próprio fluxo de mutação, histórico, save/load e tratamento de concorrência.

## Decisão

### Uma sessão ativa

`ApplicationSession` é a única autoridade de aplicação para o personagem aberto:

```js
{
  id,
  revision,
  character,
  history,
  future,
  dirty,
  lastReceipt,
  metadata,
}
```

O `Character` atual é único. Snapshots no histórico são evidências imutáveis de transições e não autoridades concorrentes.

### Revisão monotônica

Toda mutação aplicada, desfazer ou refazer aumenta `revision` exatamente uma vez.

Uma revisão nunca volta para o valor histórico restaurado. O número representa a evolução da sessão, não a versão original do snapshot.

### Comandos explícitos

Casos de uso mutáveis usam envelope imutável:

```js
{
  id,
  type,
  expectedRevision,
  issuedAt,
  payload,
}
```

`expectedRevision` divergente bloqueia o comando antes da execução do handler.

### Registro único de handlers

`CommandRegistry` é a única autoridade de resolução entre `type` e handler. Não haverá `switch` paralelo na UI nem segundo despachante.

### Execução atômica

`CommandExecutor` aceita somente resultados:

```text
applied
no-op
```

O resultado externo pode ser:

```text
applied
no-op
rejected
failed
```

Rejeição, exceção, retorno inválido ou `Character` inválido preservam a mesma sessão recebida.

### Histórico por snapshots

Cada comando aplicado registra uma transição com:

- identidade do comando;
- revisões original e resultante;
- snapshots serializados de antes e depois;
- fingerprints dos dois snapshots;
- payload;
- recibo.

Desfazer e refazer restauram esses snapshots validados. Não tentam sintetizar comandos inversos.

Uma edição nova após desfazer limpa integralmente `future`.

### Runtime injetado

Tempo e IDs são dependências explícitas:

```text
Clock
IdGenerator
```

Executor e operações de histórico não chamam relógio global nem geram IDs internamente.

### Persistência por portas

A aplicação depende apenas de:

```text
CharacterRepository
SessionRepository
```

Métodos canônicos:

```text
load
save
remove
listIds
```

Os adaptadores em memória armazenam snapshots serializados e hidratam novas instâncias validadas. Armazenamento nunca se torna autoridade mecânica.

### Projeção composta

`ApplicationReadModel` reúne:

- estado da sessão;
- capacidades de desfazer/refazer;
- `Character` serializado;
- Point Ledger soberano.

A projeção não replica totais nem executa regras GURPS.

## Consequências

- interfaces futuras compartilham o mesmo fluxo de mutação;
- comandos obsoletos são rejeitados deterministicamente;
- histórico é auditável e independente de operações inversas;
- testes podem controlar tempo e IDs;
- persistência concreta pode variar sem contaminar a aplicação;
- a UI permanece passiva;
- o Point Ledger continua sendo a única autoridade de agregação de pontos.

O custo inicial é armazenar snapshots completos no histórico. Otimização por deltas só poderá ser introduzida posteriormente sem alterar a semântica pública.

## Alternativas rejeitadas

### Mutação direta pela UI

Rejeitada por criar múltiplos pipelines de escrita e permitir cálculos locais.

### Histórico de funções inversas

Rejeitado porque nem toda operação possui inversa segura e porque versões futuras das regras poderiam alterar o comportamento da inversão.

### Reduzir a revisão ao desfazer

Rejeitado porque permitiria reutilizar comandos obsoletos contra um estado semanticamente novo.

### Persistir objetos vivos

Rejeitado porque permitiria referências compartilhadas e mutações fora do agregado.

### Relógio e UUID globais

Rejeitados porque tornam testes e recibos não determinísticos e escondem dependências.

### Projeção recalculando pontos

Rejeitada porque duplicaria o Point Ledger e violaria a soberania dos domínios.

## Invariantes

1. Há uma única sessão ativa por fluxo de aplicação.
2. A revisão é monotônica.
3. Toda mutação exige `expectedRevision`.
4. Falha ou rejeição não altera a sessão recebida.
5. Um comando aplicado cria exatamente uma transição.
6. `no-op` não altera revisão nem histórico.
7. Novo comando aplicado limpa a pilha de refazer.
8. Desfazer/refazer restauram snapshots validados.
9. Tempo e IDs entram por portas.
10. Repositórios persistem snapshots, não autoridades paralelas.
11. A projeção não calcula regras de domínio.
12. A UI não calcula.
13. Domínios fechados não são reabertos.
