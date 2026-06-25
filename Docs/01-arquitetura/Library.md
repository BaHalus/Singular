# Library

**Código:** LIB-CORE-1.0  
**Status:** Em implementação  
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

A definição preserva dados portáveis. O adapter do domínio decide como validar ou instanciar o `payload`.

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

Cada adapter deverá expor contratos equivalentes a:

```js
{
  domain,
  validateDefinitionPayload(payload),
  serializeDefinitionPayload(payload),
  analyzeInstantiation(definition, character, options),
  planInstantiation(definition, character, options),
  executeInstantiationPlan(definition, character, plan, options)
}
```

A fundação inicial implementará somente o registro e a forma comum da definição. Planejamento e execução serão blocos posteriores.

## Catálogos especializados

Templates continuam no catálogo soberano de Templates.

Formas conhecidas de Morfose continuam dentro do perfil de Morfose do personagem.

A Library poderá federar consulta por adapters, referências ou projeções, sem persistir uma segunda cópia autoritativa.

## Persistência

A biblioteca persistente será independente de saves do `Character`.

Salvar um personagem não incorpora automaticamente definições da biblioteca. Exportar uma definição não exporta estado transitório do personagem salvo.

## Importação

Fontes externas passam pelos parsers e importadores existentes. O adapter converte o resultado canônico em definição portátil.

Não haverá normalizador genérico paralelo.

## Inserção

A inserção futura será explícita, planejada, revalidada e atômica.

```text
Definition
→ Domain Adapter
→ Analysis
→ Plan
→ Revalidation
→ Application Command
→ Character
→ Receipt
```

## Checklist

- [x] Aprovar ADR-0044
- [ ] Criar LibraryDefinition.js
- [ ] Criar LibraryDefinition.test.js
- [ ] Criar LibraryRegistry.js
- [ ] Criar LibraryRegistry.test.js
- [ ] Criar contrato de adapters
- [ ] Criar resolver de dependências
- [ ] Criar plano de instanciação
- [ ] Integrar com ApplicationSession
- [ ] Criar importação/exportação modular
- [ ] Registrar gate de fechamento
