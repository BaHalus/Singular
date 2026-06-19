# CharacterImporter

**Código:** DOM-IMP-1.3
**Status:** Aprovado
**Camada:** Domain / Import
**Tipo:** Import Pipeline

CharacterImporter importa dados externos para um Character válido da SINGULAR.

A arquitetura segue ADR-0008 e ADR-0009.

---

## Regra central

O importador não calcula regras.

Ele apenas:

- lê a entrada;
- normaliza campos conhecidos;
- preserva dados desconhecidos;
- cria um Character válido.

Cálculos continuam nos serviços de domínio.

---

## Pipeline

```text
GCS JSON
  ↓
ImportSnapshot
  ↓
Character Aggregate
  ↓
Domain Services
```

---

## ImportSnapshot

ImportSnapshot é a fronteira anti-acoplamento entre formato externo e domínio.

Estrutura atual:

```js
{
  identity: {},
  attributes: {},
  secondaryCharacteristics: {},

  traits: {
    advantages: [],
    perks: [],
    disadvantages: [],
    quirks: [],
    containers: [],
    unknownNodes: []
  },

  skills: [],
  techniques: [],
  skillContainers: [],
  techniqueNodes: [],
  unresolvedTechniqueLinks: [],
  unknownSkillNodes: [],

  languages: [],
  familiarities: [],
  equipment: [],
  raw: {}
}
```

---

## DOM-IMP-1.3

A entrega atual importa:

- identidade;
- ST, DX, IQ, HT;
- secundárias quando presentes;
- vantagens;
- qualidades;
- desvantagens;
- peculiaridades;
- perícias;
- técnicas.

Perícias passam por:

```text
GCS skills
  ↓
SkillsImporter
  ↓
Character.skills
```

Técnicas passam por:

```text
GCS technique nodes
  ↓
TechniquesImporter
  ↓
resolução da perícia-mãe
  ↓
Character.techniques
```

O `TechniquesImporter` tenta vincular a técnica à perícia-mãe nesta ordem:

1. ID interno ou ID externo do GCS;
2. nome e especialização;
3. preservação como vínculo não resolvido.

Quando houver mais de uma perícia compatível, o vínculo fica ambíguo e não é escolhido automaticamente.

O importador preserva, sem recalcular:

- dificuldade;
- pontos;
- NH informado pelo GCS;
- NH relativo informado pelo GCS;
- penalidade do default;
- limite relativo máximo;
- especialização;
- defaults;
- features;
- pré-requisitos;
- notas;
- tags;
- dados brutos;
- diagnóstico do vínculo com a perícia-mãe.

Containers de perícias, nós intermediários, nós desconhecidos e vínculos de técnica não resolvidos permanecem no `ImportSnapshot`.

---

## Fora de escopo atual

DOM-IMP-1.3 ainda não importa:

- equipamentos;
- magias;
- templates como agregados finais;
- ataques derivados;
- cálculo de NH;
- cálculo de custo de traits;
- cálculo de poderes;
- cálculo de habilidades alternativas.

---

## Checklist

- [x] Criar CharacterImporter.md
- [x] Criar ImportSnapshot.js
- [x] Criar IdentityImporter.js
- [x] Criar AttributesImporter.js
- [x] Criar CharacterImporter.js
- [x] Criar CharacterImporter.test.js
- [x] Criar GcsTraitTreeNormalizer.js
- [x] Criar TraitsImporter.js
- [x] Integrar TraitsImporter ao CharacterImporter
- [x] Refatorar Skills para preservar campos ricos
- [x] Criar SkillsImporter.js
- [x] Integrar SkillsImporter ao CharacterImporter
- [x] Refatorar Techniques para preservar campos ricos
- [x] Criar TechniquesImporter.js
- [x] Integrar TechniquesImporter ao CharacterImporter
