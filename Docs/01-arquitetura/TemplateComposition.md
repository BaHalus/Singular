# Composição declarativa de Templates

**Código:** DOM-TEMPLATE-1.1  
**Status:** Implementado  
**Camada:** Domain  
**Tipo:** Projeção declarativa derivada  
**Decisão:** ADR-0030

## Objetivo

DOM-TEMPLATE-1.1 permite que um Template declare contribuições para outros domínios sem interpretar nem calcular essas contribuições.

```text
Template declara
→ domínio proprietário interpreta
→ motor calcula
→ UI apresenta
```

`Template.entries` continua sendo a única autoridade persistente. A composição é uma projeção derivada e não cria uma segunda representação soberana.

## Domínios declarativos

Domínios padronizados:

```text
attribute
secondaryCharacteristic
trait
skill
magic
language
culture
equipment
template
rule
unknown
```

Domínios adicionais são permitidos. Um módulo futuro pode introduzir um domínio sem alterar a fundação de Templates.

## Contribuição

Toda contribuição é uma `TemplateEntry` canônica:

```js
{
  id,
  domain,
  entryType,
  externalIds,
  referenceId,
  payload,
  notes,
  tags,
  importMeta,
  raw,
}
```

A composição não acrescenta campos persistidos paralelos.

## Tipos de declaração

### Referência

Uma contribuição por referência usa `referenceId` explícito.

```js
{
  id: "entry-st-bonus",
  domain: "attribute",
  entryType: "attributeContribution",
  referenceId: "attribute:ST",
  payload: {
    operation: "modifier",
    amount: 2,
  },
}
```

Tipos de referência reconhecidos:

```text
attributeContribution
secondaryCharacteristicContribution
traitReference
skillReference
techniqueReference
spellReference
languageReference
cultureReference
equipmentReference
templateReference
```

Nenhuma referência é inferida por nome, posição, conteúdo do payload ou ordem da lista.

### Inline

Componentes importados existentes permanecem declarações inline, por exemplo:

```text
advantage
perk
disadvantage
quirk
skill
technique
spell
language
familiarity
equipment
```

Eles continuam preservados como snapshots declarativos. Cada domínio decidirá posteriormente como interpretar seu payload.

### Regra especial

```js
{
  id: "entry-special-rule",
  domain: "rule",
  entryType: "specialRule",
  referenceId: null,
  payload: {
    ruleId: "rule:campaign-specific",
    parameters: {},
  },
}
```

Templates não executa a regra.

### Opaca

Uma entrada desconhecida sem referência explícita permanece opaca e preservada. Não reconhecer não significa invalidar.

## APIs

```js
createTemplateContribution(input, options)
createAttributeContribution(input, options)
createSecondaryCharacteristicContribution(input, options)
createReferenceContribution(input, options)
createTemplateReferenceContribution(input, options)
createSpecialRuleContribution(input, options)

validateTemplateContribution(entry)
createTemplateComposition(template)
validateTemplateComposition(composition)
serializeTemplateComposition(composition)
getTemplateCompositionEntries(template, domain)
getTemplateContributionDomains()
```

## Projeção de composição

```js
{
  templateId,
  entryIds,
  byDomain: {
    attribute: [],
    secondaryCharacteristic: [],
    trait: [],
    skill: [],
    magic: [],
    language: [],
    culture: [],
    equipment: [],
    template: [],
    rule: [],
    unknown: [],
  },
  references: [
    {
      entryId,
      domain,
      entryType,
      referenceId,
      declaration,
    },
  ],
  inlineEntryIds,
  ruleEntryIds,
  opaqueEntryIds,
}
```

A projeção:

- é derivada de `entries`;
- é profundamente imutável;
- preserva a ordem declarada;
- classifica cada entrada exatamente uma vez;
- não resolve dependências;
- não detecta ciclos;
- não verifica existência de alvos;
- não calcula valores.

## Atributos e características secundárias

Templates declara apenas:

```text
alvo explícito
operação declarada
payload preservado
```

DOM-TEMPLATE não conhece a fórmula de ST, DX, IQ, HT, PV, PF, Vontade, Percepção, Velocidade ou Movimento. Os domínios proprietários interpretarão essas declarações futuramente.

## Traits, perícias e técnicas

Uma referência pode apontar para uma identidade soberana futura de DOM-TRAIT ou DOM-SKILL. Entradas inline importadas continuam válidas durante a migração.

Templates não calcula custo, nível, NH, pré-requisito, incompatibilidade ou bônus.

## Idiomas, culturas e equipamentos

Referências explícitas e snapshots inline são ambos preservados. Estados operacionais de equipamento não pertencem ao template.

## Templates dentro de templates

`templateReference` declara a relação sem resolvê-la.

```js
{
  entryType: "templateReference",
  referenceId: "template:fey-ancestry",
  payload: {
    relation: "include",
  },
}
```

Dependências ausentes, ciclos, ordem determinística e conflitos pertencem ao DOM-TEMPLATE-1.2.

## Imutabilidade e save/load

As contribuições criadas pelas APIs são imutáveis. Como continuam sendo `TemplateEntry`, o round trip canônico permanece:

```text
createTemplate
→ serializeTemplates
→ createTemplates
→ createTemplateComposition
```

A projeção de composição não precisa ser persistida; ela é reconstruída deterministicamente.

## Não responsabilidades

DOM-TEMPLATE-1.1 não:

- interpreta payloads de outros domínios;
- soma pontos;
- calcula atributos ou secundárias;
- calcula NH;
- resolve referências;
- detecta ciclos;
- ordena dependências;
- aplica templates ao Character;
- executa regras especiais;
- cria vínculo por nome;
- modifica Forma Alternativa ou Morfose;
- calcula na UI.

## Continuidade

```text
DOM-TEMPLATE-1.2 — Dependências e composição
```

O próximo bloco resolverá referências entre templates, dependências ausentes, ciclos, ordem determinística e diagnósticos de conflito, sem alterar a autoridade de `entries`.
