# CharacterImporter

**Código:** DOM-IMP-1.2
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
  unknownSkillNodes: [],

  languages: [],
  familiarities: [],
  equipment: [],
  raw: {}
}
```

---

## DOM-IMP-1.2

A entrega atual importa:

- identidade;
- ST, DX, IQ, HT;
- secundárias quando presentes;
- vantagens;
- qualidades;
- desvantagens;
- peculiaridades;
- perícias.

Perícias passam por:

```text
GCS skills
  ↓
SkillsImporter
  ↓
Character.skills
```

O importador preserva, sem recalcular:

- atributo-base;
- dificuldade;
- pontos;
- NH informado pelo GCS;
- NH relativo informado pelo GCS;
- especialização;
- nível tecnológico;
- defaults;
- features;
- weapons;
- pré-requisitos;
- notas;
- tags;
- dados brutos.

Containers de perícias, nós de técnicas e nós desconhecidos são preservados no `ImportSnapshot`.

Técnicas ainda não são incorporadas a `Character.techniques`; isso será responsabilidade do próximo importador específico.

---

## Fora de escopo atual

DOM-IMP-1.2 ainda não importa:

- técnicas para o agregado final;
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
