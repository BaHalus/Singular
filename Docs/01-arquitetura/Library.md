# Library

**Código:** LIB-CORE-1.0 a 1.10  
**Status:** Fundação LIB-CORE concluída; adapters concretos, persistência e UI seguem em frentes posteriores  
**Camada:** Library / Application boundary  
**Tipo:** Registro federado de definições  
**Decisão:** ADR-0044

A Library reúne definições portáveis para consulta, importação, exportação e inserção explícita no `Character`.

## Regra central

```text
A biblioteca cataloga.
O domínio valida e instancia.
A aplicação orquestra.
O motor calcula.
A UI não calcula.
```

## Fronteira

A biblioteca não é:

- estado do personagem;
- cópia do `Character`;
- substituta do catálogo de Templates;
- substituta do catálogo de Morfose;
- schema genérico de todos os domínios;
- motor de regras;
- pipeline alternativo de importação.

## Definição portátil

```js
{
  id: "library-item-fireball",
  externalIds: {},
  domain: "spell",
  schemaVersion: 1,
  name: "Bola de Fogo",
  version: "1.0.0",
  source: {
    kind: "singular",
    provider: null,
    format: "singular-json",
    reference: null
  },
  payload: {},
  tags: [],
  dependencies: [],
  importMeta: null,
  raw: null
}
```

`LibraryDefinition` valida o envelope e a portabilidade JSON, clona os dados recebidos e congela profundamente o resultado.

O núcleo não interpreta `payload`. O adapter do domínio proprietário decide como validá-lo e serializá-lo.

## Registro

`LibraryRegistry` persiste somente:

```js
{
  schemaVersion: 1,
  definitions: []
}
```

O registro:

- exige IDs soberanos únicos;
- trata registro equivalente como idempotente;
- bloqueia definição divergente com o mesmo ID;
- bloqueia colisão de identidade externa no mesmo domínio;
- oferece consultas exatas por ID, domínio e tag;
- deriva projeções sem persistir índices paralelos;
- não interpreta payloads nem dependências.

## Pacote portátil

LIB-CORE-1.9 introduz o envelope mínimo de transporte modular:

```js
{
  kind: "singular-library-package",
  schemaVersion: 1,
  metadata: {},
  registry: {
    schemaVersion: 1,
    definitions: []
  }
}
```

O pacote:

- transporta um `LibraryRegistry` serializado;
- valida e congela profundamente o conteúdo importado;
- aceita somente metadados JSON portáveis;
- reaproveita as regras soberanas de conflito e identidade externa do registro;
- não interpreta payloads proprietários;
- não executa parser externo, persistência ou UI.

`exportLibraryPackage(registry, options)` cria o envelope portátil a partir de um registro validado. `importLibraryPackage(package)` devolve um novo `LibraryRegistry` validado a partir do envelope recebido.

## Merge incremental de pacote

LIB-CORE-1.10 adiciona `mergeLibraryPackageIntoRegistry(registry, package)` como composição estrita e aditiva.

O merge:

- valida o registro alvo e o pacote antes de compor;
- canonicaliza o alvo em uma cópia destacada;
- adiciona somente definições ausentes;
- trata definições integralmente equivalentes como `no-op` idempotente;
- bloqueia definição divergente com o mesmo ID soberano;
- bloqueia identidade externa conflitante no mesmo domínio;
- nunca sobrescreve, renomeia ou resolve conflitos automaticamente;
- não interpreta payloads;
- preserva integralmente o objeto recebido pelo chamador, inclusive em `no-op` e falha.

O recibo é imutável e contém:

```js
{
  schemaVersion: 1,
  status: "merged" | "no-op",
  registry,
  addedDefinitionIds: [],
  unchangedDefinitionIds: []
}
```

Conflitos abortam a operação inteira. Nenhum estado intermediário é exposto.

## Domínios iniciais

O registro aceitará adapters para:

```text
trait
skill
technique
spell
equipment
template
power
```

Novos domínios exigem adapter próprio; o núcleo não interpreta seus payloads.

## Identidade

`LibraryDefinition.id` identifica a definição no catálogo.

O ID de uma entidade criada no `Character` é independente e pode ser remapeado pela aplicação.

Nomes são editoriais e nunca resolvem identidade.

## Adapters

O contrato atual exige:

```js
{
  domain,
  supportedSchemaVersions,
  validateDefinitionPayload(payload),
  serializeDefinitionPayload(payload),
  analyzeInstantiation,
  planInstantiation,
  executeInstantiationPlan
}
```

Validação e serialização são obrigatórias.

As três capacidades de instanciação são opcionais, mas devem ser fornecidas juntas. O núcleo rejeita adapter parcial e não oferece fallback genérico.

Validar ou serializar uma definição não executa análise, plano ou aplicação.

## Dependências

`LibraryDependencyResolver` analisa referências exatas entre definições e produz:

```js
{
  status: "ready" | "ready-with-warnings" | "blocked",
  resolvable,
  rootDefinitionIds,
  resolvedDefinitionIds,
  missingRequired,
  missingOptional,
  cycles,
  diagnostics
}
```

A ordem resolvida é dependência-primeiro.

Dependência obrigatória ausente e ciclo bloqueiam. Dependência opcional ausente produz aviso.

Intervalos de versão permanecem declarações informativas; LIB-CORE-1.10 não interpreta semver.

## Plano de instanciação

`LibraryInstantiationPlan` é o contrato efêmero e serializável entre planejamento e execução.

```js
{
  schemaVersion: 1,
  id,
  status: "ready" | "ready-with-warnings" | "blocked",
  executable,
  rootDefinitionIds: [],
  resolvedDefinitionIds: [],
  actions: [],
  diagnostics: []
}
```

Cada ação declara identidade própria, definição, domínio, tipo, payload, dependências entre ações e diagnósticos.

O plano:

- exige IDs de ações únicos;
- bloqueia referências de ação ausentes;
- bloqueia ciclos entre ações;
- exige que raízes e ações pertençam às definições resolvidas;
- não permite ações quando o status é `blocked`;
- preserva somente valores JSON portáveis.

## Execução

`LibraryInstantiationRunner` consome exclusivamente o plano validado.

Antes de executar qualquer ação, o runner:

- valida o plano, o registro de adapters e o contexto;
- ordena as ações por dependência;
- faz preflight de todos os domínios exigidos;
- rejeita adapter ausente ou sem capacidade completa de instanciação.

Somente após o preflight o runner despacha as ações aos adapters proprietários e coleta resultados portáveis.

O runner não conhece o schema interno do `Character` e não implementa fallback genérico.

## Orquestração

`LibraryInstantiationOrchestrator` compõe:

```text
Definitions
→ Adapter validation
→ Adapter preflight
→ Analysis
→ Plan
→ Runner
→ Portable execution result
```

A orquestração:

- valida todas as definições com os adapters proprietários;
- interrompe o fluxo quando análise ou planejamento retornam `blocked`;
- produz o plano a partir das raízes solicitadas;
- delega a execução ao runner somente quando o plano é executável;
- agrega diagnósticos de análise, plano e execução;
- não altera o `Character` diretamente.

## Integração com o App Core

LIB-CORE-1.8 define o comando canônico:

```text
library.instantiate
```

O handler `createLibraryInstantiationCommandHandler` recebe:

```js
{
  adapterRegistry,
  applyInstantiation
}
```

Fluxo:

```text
CommandEnvelope
→ LibraryInstantiationOrchestrator
→ portable orchestration result
→ injected application boundary
→ validated candidate Character
→ CommandExecutor
→ revision + history + receipt
```

O comando:

- entrega à análise o ID e a revisão atuais da sessão e um snapshot serializado do `Character`;
- trata bloqueio de análise ou planejamento como `no-op` diagnosticado;
- não chama a fronteira de aplicação quando a orquestração está bloqueada;
- exige que resultado `applied` devolva um `Character` válido;
- delega commit, incremento de revisão, histórico, desfazer/refazer e atomicidade ao `CommandExecutor`;
- preserva a sessão original quando a aplicação lança erro ou devolve resultado inválido;
- emite recibo de domínio com raízes, plano, orquestração e recibo específico da aplicação.

`applyInstantiation` é uma fronteira injetada. Ela deve compor exclusivamente APIs públicas dos domínios proprietários; não pode implementar patch genérico, normalizador paralelo ou regra GURPS na aplicação.

A composição concreta da aplicação deve registrar o handler exportado no `CommandRegistry` usado pelo `CommandExecutor`. LIB-CORE-1.8 não cria um registry global nem assume registro automático fora da composição que monta a aplicação.

## Catálogos especializados

Templates continuam no catálogo soberano de Templates.

Formas conhecidas de Morfose continuam dentro do perfil de Morfose do personagem.

A Library poderá federar consulta por adapters, referências ou projeções, sem persistir uma segunda cópia autoritativa.

## Persistência

A biblioteca persistente é independente de saves do `Character`.

Salvar um personagem não incorpora automaticamente definições da biblioteca. Exportar uma definição não exporta estado transitório do personagem salvo.

Persistência concreta em navegador, arquivo ou nuvem não pertence à fundação LIB-CORE e exige fronteira própria de infraestrutura.

## Importação

Fontes externas passam pelos parsers e importadores existentes. O adapter converte o resultado canônico em definição portátil.

Importar um pacote Singular não aciona parser externo; apenas valida o envelope `singular-library-package` e recria ou compõe um `LibraryRegistry` canônico.

Não haverá normalizador genérico paralelo.

## Inserção no Character

A inserção integrada é explícita e passa pelo comando `library.instantiate`.

```text
Definition
→ Domain Adapter
→ Analysis
→ Plan
→ Portable execution result
→ Application boundary
→ Validated candidate Character
→ CommandExecutor
→ ApplicationSession
→ Receipt
```

A Library não escreve diretamente no `Character`. A fronteira injetada constrói um candidato por APIs soberanas de domínio, e o `CommandExecutor` é a única autoridade que efetiva a transição da sessão.

## Fechamento da fundação

LIB-CORE-1.10 fecha a fundação transversal da Library.

O fechamento certifica contratos comuns de definição, registro, adapters, dependências, planejamento, execução, orquestração, aplicação atômica, pacote portátil e merge incremental estrito.

Não certifica implementação concreta de todos os adapters, persistência de infraestrutura, picker, busca visual ou UI. Essas entregas dependem da composição dos domínios e de frentes posteriores, sem reabrir as invariantes do núcleo.

## Checklist

- [x] Aprovar ADR-0044
- [x] Criar `LibraryDefinition`
- [x] Criar `LibraryRegistry`
- [x] Criar contrato de adapters
- [x] Criar resolver de dependências
- [x] Criar plano de instanciação
- [x] Criar runner de planos
- [x] Criar orquestrador de instanciação
- [x] Registrar gate intermediário de LIB-CORE-1.7
- [x] Integrar com `ApplicationSession`
- [x] Criar recibo de aplicação no `Character`
- [x] Registrar gate intermediário de LIB-CORE-1.8
- [x] Criar importação/exportação modular inicial
- [x] Criar merge incremental estrito de pacote
- [x] Registrar gate de fechamento da fundação LIB-CORE-1.10
