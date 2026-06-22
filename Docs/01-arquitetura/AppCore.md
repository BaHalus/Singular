# App Core — Camada de aplicação da SINGULAR

**Código:** APP-CORE-1.0  
**Status:** Implementado; sujeito ao gate final  
**Camada:** Application  
**Decisão:** ADR-0042  
**Dependências:** Character, operações de domínio e Point Ledger

## Objetivo

O App Core coordena os casos de uso da SINGULAR sem assumir regras pertencentes aos domínios.

```text
A UI despacha intenção.
O App Core valida revisão e coordena o caso de uso.
O domínio valida e calcula.
O App Core registra sessão, histórico e recibo.
A projeção reúne dados já calculados.
A UI apresenta o resultado.
```

## Regra central

```text
O motor calcula.
O schema declara.
A aplicação orquestra.
A UI não calcula.
```

O App Core não cria outro `Character`, outro Point Ledger nem um calculador paralelo.

## ApplicationSession

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

Invariantes:

- existe um único `Character` atual;
- `revision` é inteiro seguro, não negativo e monotônico;
- a sessão é profundamente imutável;
- histórico e refazer são pilhas canônicas de transições;
- o topo de cada pilha deve corresponder ao `Character` atual;
- a mesma transição não pode existir nas duas pilhas;
- snapshots carregados são reidratados e validados.

API:

```js
createApplicationSession(input)
validateApplicationSession(session)
serializeApplicationSession(session)
nextApplicationSessionRevision(session)
```

## Comandos

### Envelope

```js
{
  id,
  type,
  expectedRevision,
  issuedAt,
  payload,
}
```

API:

```js
createCommandEnvelope(input)
validateCommandEnvelope(command)
serializeCommandEnvelope(command)
```

O envelope é destacado da entrada, profundamente imutável e não aceita estruturas cíclicas.

### Registro

`CommandRegistry` é a única autoridade que liga `type` a handler.

```js
createCommandRegistry(entries)
registerCommandHandler(registry, entry)
resolveCommandHandler(registry, type)
```

A UI não mantém `switch` paralelo de comandos.

### Execução

```js
executeCommand(session, command, registry, runtime)
```

Estados:

```text
applied
no-op
rejected
failed
```

Fluxo aplicado:

1. validar sessão, registro e runtime;
2. validar envelope;
3. comparar `expectedRevision`;
4. resolver handler;
5. aceitar somente resultado `applied` ou `no-op`;
6. validar o `Character` retornado;
7. obter tempo e ID pelas portas;
8. criar recibo e transição;
9. incrementar uma revisão;
10. limpar `future`;
11. construir nova sessão.

Rejeição, exceção, resultado inválido ou `Character` inválido preservam a sessão recebida e não criam histórico.

`no-op` preserva sessão, revisão, histórico e refazer.

## Histórico

Uma transição canônica contém:

```js
{
  schemaVersion,
  kind,
  id,
  commandId,
  commandType,
  issuedAt,
  appliedAt,
  beforeRevision,
  afterRevision,
  beforeFingerprint,
  afterFingerprint,
  beforeCharacter,
  afterCharacter,
  commandPayload,
  receipt,
}
```

O fingerprint cobre o snapshot integral do `Character`, incluindo metadados.

API:

```js
createApplicationHistory(input)
createApplicationHistoryEntry(input)
validateApplicationHistory(history)
restoreCharacterFromHistorySnapshot(snapshot)
fingerprintApplicationCharacter(character)
```

### Desfazer e refazer

```js
undoApplicationSession(session, options, runtime)
redoApplicationSession(session, options, runtime)
```

As operações:

- exigem revisão esperada;
- movem a mesma transição entre `history` e `future`;
- restauram snapshot validado;
- incrementam a revisão atual;
- produzem recibo;
- não sintetizam operação inversa;
- retornam `no-op` quando a pilha está vazia;
- preservam atomicidade em falhas.

Uma edição nova após desfazer limpa toda a pilha de refazer.

## Portas

### Persistência

```text
CharacterRepository
SessionRepository
```

Contrato assíncrono comum:

```text
load(id)
save(entity)
remove(id)
listIds()
```

API de validação:

```js
validateCharacterRepository(repository)
validateSessionRepository(repository)
```

Adaptadores em memória:

```js
createInMemoryCharacterRepository(initialCharacters)
createInMemorySessionRepository(initialSessions)
```

Eles armazenam apenas snapshots serializados e devolvem novas instâncias hidratadas e validadas.

### Runtime

```text
Clock.now()
IdGenerator.next(prefix)
```

API:

```js
validateClock(clock)
readClock(clock)
validateIdGenerator(generator)
generateId(generator, prefix)
validateApplicationRuntime(runtime)
```

Adaptadores determinísticos:

```js
createFixedClock(value)
createSequentialIdGenerator(options)
```

Executor e histórico não chamam `new Date()`, `crypto.randomUUID()` nem geradores ocultos.

## Projeção de leitura

```js
createApplicationReadModel(session)
```

Estrutura:

```js
{
  schemaVersion,
  session: {
    id,
    revision,
    dirty,
    canUndo,
    canRedo,
    historyDepth,
    futureDepth,
    lastReceipt,
  },
  character,
  pointLedger,
}
```

A projeção:

- serializa o `Character` atual;
- consome `evaluateCharacterPointLedger`;
- preserva integralmente o snapshot soberano do ledger;
- deriva capacidades apenas do estado da sessão;
- não recalcula pontos, custos, níveis, dano, carga ou defesas;
- é profundamente imutável e serializável.

## Fluxo vertical certificado

```text
Character
→ ApplicationSession
→ CommandEnvelope
→ CommandRegistry
→ CommandExecutor
→ histórico
→ SessionRepository
→ ApplicationReadModel + Point Ledger
→ undo
→ save/load
→ redo
→ CharacterRepository
```

O mesmo fluxo também certifica a rejeição de comando com revisão obsoleta.

## Fronteiras

### Domain

Responsável por:

- invariantes do `Character`;
- cálculos GURPS;
- operações mecânicas;
- serialização canônica;
- Point Ledger.

### Application

Responsável por:

- sessão e revisão;
- comandos e despacho;
- coordenação atômica;
- histórico, desfazer e refazer;
- portas;
- projeções compostas.

### Infrastructure

Responsável por:

- armazenamento concreto;
- relógios concretos;
- geração concreta de IDs;
- navegador, arquivos e rede.

### UI

Responsável por:

- apresentar `ApplicationReadModel`;
- coletar intenção;
- despachar comandos;
- mostrar recibos e diagnósticos.

## Compatibilidade

Handlers de aplicação podem encapsular APIs públicas dos domínios. Eles não copiam nem reimplementam regras.

Importadores continuam convertendo fontes externas antes da abertura ou substituição explícita de uma sessão.

Não há compatibilidade com históricos ad hoc anteriores: APP-CORE-1.0 inaugura a autoridade canônica da camada de aplicação.

## Não responsabilidades

APP-CORE-1.0 não:

- implementa componentes visuais;
- decide o fluxo completo dos modos Criação e Mesa;
- persiste diretamente em `localStorage`;
- calcula regras GURPS;
- cria outro Point Ledger;
- abre DOM-SKILL, DOM-EQUIPMENT, DOM-COMBAT, DOM-POWER ou DOM-MAGIC;
- associa entidades por nome;
- mantém segundo histórico ou segundo runtime.

## Artefatos normativos

```text
Docs/02-decisoes/ADR-0042-FundacaoAppCore.md
Docs/03-gates/GATE-APP-CORE-1.0.md
```

## Próxima frente

Após aprovação do gate:

```text
DOM-SKILL
```
