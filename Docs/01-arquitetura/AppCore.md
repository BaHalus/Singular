# App Core — Camada de aplicação da SINGULAR

**Código:** APP-CORE-1.0  
**Status:** Fundação em desenvolvimento  
**Camada:** Application  
**Dependências:** Character, domínios fechados, importadores e Point Ledger

## Objetivo

O App Core coordena os casos de uso da SINGULAR sem assumir regras pertencentes aos domínios.

```text
A UI despacha intenção.
O App Core orquestra o caso de uso.
O domínio valida e calcula.
O App Core registra o resultado.
A UI apresenta o novo estado.
```

## Constatação da auditoria inicial

O repositório já possui:

- `Character` como agregado central;
- domínios soberanos de Templates, Traits, Morfose e Forma Alternativa;
- importação GCS com preservação de identidade e proveniência;
- Point Ledger derivado;
- operações de domínio atômicas e recibos específicos.

Ainda não existe uma camada de aplicação canônica para:

- manter a sessão ativa;
- despachar comandos de usuário;
- controlar revisão do estado;
- rejeitar comandos obsoletos;
- registrar histórico de alterações;
- desfazer e refazer;
- coordenar save/load;
- expor projeções prontas para a UI;
- padronizar erros e recibos entre casos de uso.

## Autoridade

O App Core não cria um segundo Character.

Em uma sessão existe uma única referência ativa ao estado canônico atual:

```text
ApplicationSession.character
```

Estados anteriores podem existir apenas como entradas imutáveis de histórico para desfazer/refazer. Eles não são autoridades concorrentes.

```text
estado atual ≠ histórico
histórico ≠ domínio
sessão ≠ ficha duplicada
```

## Escopo do APP-CORE-1.0

### Sessão de aplicação

A fundação deverá representar:

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

A forma concreta poderá ser refinada durante a implementação, mantendo estas invariantes:

- revisão monotônica;
- Character atual único;
- histórico imutável;
- pilha de refazer invalidada por novo comando;
- nenhuma mutação do estado recebido;
- save/load sem executar regra de jogo na UI.

### Comandos

Todo caso de uso mutável deverá receber um envelope explícito:

```js
{
  id,
  type,
  expectedRevision,
  issuedAt,
  payload,
}
```

O App Core deverá:

1. validar o envelope;
2. conferir a revisão esperada;
3. localizar o handler registrado;
4. executar exatamente uma operação de aplicação;
5. aceitar somente resultado validado pelo domínio;
6. criar nova revisão da sessão;
7. registrar recibo e histórico;
8. preservar atomicidade em falhas.

### Resultado de comando

```js
{
  status,
  session,
  receipt,
  diagnostics,
}
```

Estados mínimos:

```text
applied
no-op
rejected
failed
```

Falha ou rejeição não altera a sessão recebida.

### Histórico

O histórico de aplicação deverá registrar transições de estado, não tentar desfazer regras por operações inversas improvisadas.

A estratégia inicial recomendada é preservar snapshots serializados e validados do Character por revisão. Isso prioriza correção e auditabilidade; otimizações de armazenamento pertencem a etapa posterior.

### Persistência

APP-CORE-1.0 definirá portas, não dependências diretas de navegador:

```text
CharacterRepository
SessionRepository
Clock
IdGenerator
```

Implementações em memória podem ser usadas nos testes. `localStorage`, arquivos e demais adaptadores pertencem à infraestrutura.

### Projeções

O App Core pode reunir projeções já calculadas, como:

```text
Character serializado
Point Ledger
estado da sessão
capacidades disponíveis
```

Ele não pode recalcular custo, nível, dano, carga, defesa ou qualquer regra mecânica.

## Fronteiras

### Domain

Responsável por:

- invariantes do Character;
- cálculos GURPS;
- análise, planejamento e execução de operações mecânicas;
- recibos de domínio;
- serialização canônica.

### Application

Responsável por:

- casos de uso;
- sessão e revisão;
- comandos;
- histórico;
- coordenação transacional;
- portas de persistência;
- projeções compostas para consumo externo.

### Infrastructure

Responsável por:

- armazenamento concreto;
- relógio e geração de IDs concretos;
- arquivos;
- navegador;
- rede.

### UI

Responsável por:

- apresentar projeções;
- coletar intenção;
- despachar comandos;
- exibir resultados e diagnósticos.

## Compatibilidade

O App Core deverá consumir as APIs públicas existentes sem reabrir os domínios fechados.

Operações antigas podem ser encapsuladas por handlers de aplicação. Elas não serão copiadas nem reimplementadas.

Importadores continuam responsáveis por converter fontes externas. O App Core apenas coordena abrir/importar/substituir uma sessão mediante comando explícito.

## Não responsabilidades

APP-CORE-1.0 não:

- implementa componentes visuais;
- calcula regras GURPS;
- cria outro Point Ledger;
- modifica importadores para atender à UI;
- decide regras de modo Criação ou Mesa;
- implementa ainda o fluxo completo desses modos;
- abre DOM-SKILL, DOM-EQUIPMENT, DOM-COMBAT, DOM-POWER ou DOM-MAGIC;
- associa entidades por nome;
- persiste diretamente em `localStorage`;
- introduz um segundo histórico para a mesma sessão.

## Primeiras unidades de implementação

1. `ApplicationSession` e revisão monotônica;
2. envelope e registro de comandos;
3. executor atômico com rejeição de revisão obsoleta;
4. histórico, desfazer e refazer;
5. portas e adaptadores em memória;
6. projeção de leitura com Point Ledger;
7. testes verticais e ADR do bloco;
8. gate do APP-CORE-1.0.

## Critério de passagem

APP-CORE-1.0 só poderá ser integrado quando:

- existir uma única autoridade de sessão;
- comandos forem atômicos e revisionados;
- falhas não alterarem o estado;
- histórico, desfazer e refazer forem determinísticos;
- save/load usar portas explícitas;
- projeções não calcularem regras de domínio;
- a suíte integral permanecer verde;
- documentação e ADR estiverem concluídos;
- nenhuma API congelada tiver sido reaberta.
