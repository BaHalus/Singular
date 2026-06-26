# App Core — Camada de aplicação da SINGULAR

**Código:** APP-CORE-1.0 a 1.1  
**Status:** Implementado  
**Camada:** Application  
**Decisões:** ADR-0042 e ADR-0055  
**Dependências:** Character, operações de domínio, Point Ledger e projeções mecânicas validadas

## Objetivo

O App Core coordena os casos de uso da SINGULAR sem assumir regras pertencentes aos domínios ou motores.

```text
A UI despacha intenção.
O App Core valida revisão e coordena o caso de uso.
O domínio e os motores validam e calculam.
O App Core registra sessão, histórico e recibo.
As projeções reúnem dados já calculados.
A UI apresenta o resultado.
```

## Regra central

```text
O motor calcula.
O schema declara.
A aplicação orquestra.
A UI não calcula.
```

O App Core não cria outro `Character`, outro Point Ledger, outro histórico nem um calculador paralelo.

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

Eles armazenam somente snapshots serializados e devolvem novas instâncias hidratadas e validadas.

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

## Projeções mecânicas de Skills e Techniques

A composição mecânica global permanece separada do read model central:

```text
SkillMechanicsResolutionPlan
→ SkillBatchResolutionExecutor
→ SkillMechanicsGlobalExecutor
→ SkillMechanicsReadProjection
```

`SkillMechanicsReadProjection`:

- recebe somente um relatório global já validado;
- projeta atributos, Skills, defaults e Techniques por IDs canônicos;
- preserva status, níveis, bases, modificadores e diagnósticos;
- não contém nomes ou especializações editoriais;
- não recebe o Character como fallback;
- não recalcula regras;
- é portátil e profundamente imutável.

## Application Read Model v2

API:

```js
createApplicationReadModel(session, {
  skillMechanics,
})
```

A opção pode ser omitida. A estrutura serializada sempre contém o campo:

```js
{
  schemaVersion: 2,
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
  skillMechanics,
}
```

`skillMechanics` é:

- uma `SkillMechanicsReadProjection` validada e pertencente ao mesmo Character; ou
- `null`, quando a aplicação ainda não possui candidatos canônicos suficientes para gerar a mecânica.

A projeção central:

- serializa o `Character` atual;
- consome `evaluateCharacterPointLedger`;
- preserva integralmente o snapshot soberano do ledger;
- deriva capacidades apenas do estado da sessão;
- valida e serializa a projeção mecânica já pronta;
- rejeita mecânica pertencente a outro Character;
- rejeita opções desconhecidas e snapshots v1;
- não recalcula pontos, custos, níveis, dano, carga ou defesas;
- é profundamente imutável e serializável.

`skillMechanics: null` significa ausência explícita. Não autoriza fallback para `importedLevel`, resolução por nome ou cálculo local.

## Fluxo vertical certificado

```text
Character
→ ApplicationSession
→ CommandEnvelope
→ CommandRegistry
→ CommandExecutor
→ histórico
→ SessionRepository
→ ApplicationReadModel v2
   ├── Character serializado
   ├── Point Ledger soberano
   └── SkillMechanicsReadProjection opcional
→ undo
→ save/load
→ redo
→ CharacterRepository
```

O mesmo fluxo certifica a rejeição de comando com revisão obsoleta.

## Fronteiras

### Domain e motores

Responsáveis por:

- invariantes do `Character`;
- cálculos GURPS;
- operações mecânicas;
- serialização canônica;
- Point Ledger;
- relatórios mecânicos de Skills, Techniques e outros domínios.

### Application

Responsável por:

- sessão e revisão;
- comandos e despacho;
- coordenação atômica;
- histórico, desfazer e refazer;
- portas;
- planos e projeções compostas;
- verificação de que projeções anexadas pertencem ao mesmo Character.

### Infrastructure

Responsável por:

- armazenamento concreto;
- relógios concretos;
- geração concreta de IDs;
- navegador, arquivos e rede.

### UI

Responsável por:

- apresentar `ApplicationReadModel` e projeções autorizadas;
- coletar intenção;
- despachar comandos;
- mostrar recibos e diagnósticos.

A UI não reconstitui bases, defaults ou fórmulas a partir de campos editoriais.

## Compatibilidade

Handlers de aplicação podem encapsular APIs públicas dos domínios. Eles não copiam nem reimplementam regras.

Importadores continuam convertendo fontes externas antes da abertura ou substituição explícita de uma sessão.

O read model é derivado e reconstruível. APP-CORE-1.1 não oferece compatibilidade automática com snapshots ad hoc de `ApplicationReadModel` v1.

## Não responsabilidades

APP-CORE-1.0 a 1.1 não:

- implementa componentes visuais;
- decide o fluxo completo dos modos Criação e Mesa;
- persiste diretamente em `localStorage`;
- calcula regras GURPS;
- cria outro Point Ledger;
- interpreta payloads opacos de defaults;
- cria `SkillDefaultCandidate` por heurística;
- associa entidades por nome;
- mantém segundo histórico, segundo runtime ou segundo read model.

## Artefatos normativos

```text
Docs/02-decisoes/ADR-0042-FundacaoAppCore.md
Docs/02-decisoes/ADR-0055-ReadModelMecanicaSkills.md
Docs/03-gates/GATE-APP-CORE-1.0.md
Docs/03-gates/GATE-APP-CORE-1.1.md
```

## Próxima frente

A próxima integração segura deve resolver a origem canônica de `SkillDefaultCandidate` a partir de fontes externas. Somente depois a aplicação poderá construir automaticamente a projeção mecânica completa a partir de uma sessão.
