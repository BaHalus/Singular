# Library

**Código:** LIB-CORE-1.0 a 1.7  
**Status:** Instanciação planejada e orquestrada; integração com `ApplicationSession` pendente  
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

Intervalos de versão permanecem declarações informativas; LIB-CORE-1.7 não interpreta semver.

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
- interrompe o fluxo quando qualquer análise retorna `blocked`;
- produz o plano a partir das raízes solicitadas;
- delega a execução ao runner;
- agrega diagnósticos de análise, plano e execução;
- não altera o `Character` diretamente.

## Catálogos especializados

Templates continuam no catálogo soberano de Templates.

Formas conhecidas de Morfose continuam dentro do perfil de Morfose do personagem.

A Library poderá federar consulta por adapters, referências ou projeções, sem persistir uma segunda cópia autoritativa.

## Persistência

A biblioteca persistente é independente de saves do `Character`.

Salvar um personagem não incorpora automaticamente definições da biblioteca. Exportar uma definição não exporta estado transitório do personagem salvo.

## Importação

Fontes externas passam pelos parsers e importadores existentes. O adapter converte o resultado canônico em definição portátil.

Não haverá normalizador genérico paralelo.

## Inserção no Character

Até LIB-CORE-1.7, o fluxo termina em resultado portátil do adapter. Nenhuma API integrada altera o `Character`.

A integração futura deve acrescentar uma fronteira explícita de aplicação:

```text
Portable execution result
→ ApplicationSession command
→ Revalidation against current Character
→ Atomic Character mutation
→ Receipt
```

A aplicação deve impedir mutação parcial, preservar IDs soberanos e emitir recibo suficiente para histórico, desfazer/refazer e diagnóstico.

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
- [ ] Integrar com `ApplicationSession`
- [ ] Criar recibo de aplicação no `Character`
- [ ] Criar importação/exportação modular
- [ ] Registrar gate de fechamento da Library
