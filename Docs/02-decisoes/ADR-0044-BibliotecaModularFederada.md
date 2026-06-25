# ADR-0044 — Biblioteca modular federada

**Status:** Aprovado  
**Data:** 2026-06-24  
**Bloco:** LIB-CORE-1.0

## Contexto

O roadmap da SINGULAR prevê uma biblioteca modular capaz de armazenar, pesquisar, importar, exportar e inserir definições como Traits, perícias, técnicas, mágicas, equipamentos, Templates e Powers.

O repositório já possui autoridades especializadas:

- agregados canônicos do `Character`;
- catálogo soberano de Templates;
- catálogo de formas conhecidas de Morfose;
- importadores e operações próprios de cada domínio;
- `ApplicationSession` como autoridade da sessão ativa.

Criar uma biblioteca que replique essas autoridades produziria catálogos paralelos, divergência de IDs, dupla contagem e caminhos alternativos de importação ou aplicação.

## Decisão

A biblioteca será uma federação de definições versionadas e adaptadores de domínio.

Ela não será um novo agregado do `Character` e não substituirá catálogos proprietários já existentes.

```text
Library Registry
├── índices e metadados comuns
├── definições portáveis
└── adapters por domínio
    ├── Trait
    ├── Skill
    ├── Technique
    ├── Spell
    ├── Equipment
    ├── Template
    └── Power
```

Cada adapter será responsável por validar, serializar, importar, exportar e instanciar definições usando exclusivamente a autoridade do domínio proprietário.

## Library Definition

A unidade persistente comum será uma definição de biblioteca:

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

`payload` contém uma definição portátil aceita pelo adapter do domínio. Ele não é automaticamente uma entidade viva do `Character`.

## Identidades distintas

As seguintes identidades não são intercambiáveis:

```text
LibraryDefinition.id
DomainDefinition.id dentro do payload
Character entity id após inserção
External IDs da fonte
```

Inserir uma definição no `Character` pode exigir gerar ou remapear IDs. A biblioteca nunca presume que o ID da definição seja o ID final da entidade instanciada.

Associação por nome é proibida.

## Autoridades

### Biblioteca

A biblioteca é autoridade apenas para:

- identidade e versão da definição portátil;
- domínio proprietário;
- metadados editoriais e de proveniência;
- tags e índices de busca;
- dependências declaradas entre definições;
- preservação do payload e dados brutos;
- composição de catálogos federados para consulta.

### Domínios proprietários

Cada domínio continua autoridade para:

- estrutura canônica do payload;
- validação semântica;
- criação e serialização;
- operações e invariantes;
- regras de IDs internos;
- cálculo mecânico quando pertencente ao motor.

### Aplicação

A camada de aplicação coordena:

- seleção de definição;
- resolução explícita de dependências;
- planejamento e revalidação;
- remapeamento de IDs;
- inserção atômica no `Character`;
- histórico, recibos e desfazer/refazer.

### UI

A UI:

- pesquisa e filtra;
- apresenta definições e diagnósticos;
- coleta escolhas;
- despacha intenções;
- não valida regras mecânicas nem calcula resultados.

## Relação com catálogos existentes

O catálogo de Templates permanece soberano para Templates importados e incorporáveis.

O catálogo de formas conhecidas de Morfose permanece estado específico do personagem e não é convertido em biblioteca global.

A biblioteca pode expor Templates por adapter ou referência, mas não mantém uma cópia concorrente do catálogo soberano.

## Inserção

Nenhuma definição é aplicada ao `Character` por simples leitura ou importação.

O fluxo futuro será:

```text
seleção
→ análise pelo adapter
→ resolução de dependências
→ plano efêmero
→ revalidação
→ comando atômico da aplicação
→ Character canônico
→ recibo
```

A inserção deve passar pelos factories, validadores e operações do domínio proprietário.

## Importação e exportação

A biblioteca poderá receber fontes externas e exportar definições portáveis, mas:

- parsers existentes permanecem únicos;
- dados desconhecidos são preservados;
- conflitos de identidade são explícitos;
- versões não suportadas não são reinterpretadas silenciosamente;
- nenhuma fonte externa é aplicada automaticamente ao `Character`;
- importação não calcula regras GURPS.

## Dependências

Dependências usam identidade explícita e versionada:

```js
{
  libraryItemId: "library-item-magery",
  versionRange: ">=1.0.0 <2.0.0",
  required: true
}
```

A fundação não resolverá intervalos de versão mecanicamente. Ela apenas preservará declarações até etapa própria do resolver.

## Compatibilidade

Não será criado um normalizador genérico que replique normalizadores de Traits, Spells, Equipment, Templates ou outros domínios.

Compatibilidade será mantida somente nos adapters quando exigida pelo contrato do domínio proprietário.

## Alternativas rejeitadas

### Biblioteca como cópia do Character

Rejeitada porque transformaria estado vivo do personagem em catálogo reutilizável e duplicaria autoridades.

### Biblioteca genérica interpretando todos os payloads

Rejeitada porque criaria um segundo schema, um segundo validador e um segundo pipeline para cada domínio.

### Catálogo único substituindo catálogos especializados

Rejeitada porque Templates e Morfose possuem invariantes, proveniência e operações próprias que não pertencem a um registro genérico.

### Inserção direta pela UI

Rejeitada porque moveria validação, remapeamento e regras para a apresentação.

## Invariantes

1. Uma definição pertence a exatamente um domínio proprietário.
2. A biblioteca não calcula regras GURPS.
3. A biblioteca não altera o `Character` diretamente.
4. A UI não instancia entidades nem remapeia IDs.
5. Toda inserção passa pela aplicação e pelo domínio proprietário.
6. Identidades externas, de biblioteca e de personagem permanecem separadas.
7. Associação por nome é proibida.
8. Catálogos especializados permanecem soberanos.
9. Parsers e normalizadores existentes não são duplicados.
10. Definição importada não é aplicada automaticamente.
