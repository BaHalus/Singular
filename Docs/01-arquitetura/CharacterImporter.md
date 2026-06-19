# CharacterImporter

**Código:** DOM-IMP-1.4
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
  unknownEquipmentNodes: [],

  raw: {}
}
```

---

## DOM-IMP-1.4

A entrega atual importa:

- identidade;
- ST, DX, IQ, HT;
- secundárias quando presentes;
- vantagens;
- qualidades;
- desvantagens;
- peculiaridades;
- perícias;
- técnicas;
- equipamentos.

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

Equipamentos passam por:

```text
GCS equipment / other_equipment / equipment_list.rows
  ↓
EquipmentImporter
  ↓
normalização métrica e estrutural
  ↓
Character.equipment
```

O `EquipmentImporter`:

- converte peso de libras para quilogramas usando `2 lb = 1 kg`;
- converte custo e quantidade para números;
- preserva hierarquia de recipientes;
- distingue recipientes físicos de agrupamentos semânticos;
- mapeia itens equipados, carregados e armazenados;
- preserva usos, máximo de usos, categorias, armas embutidas, features, modificadores, pré-requisitos e `calc`;
- mantém nós desconhecidos em `unknownEquipmentNodes`.

Itens de `other_equipment` entram como `stored` por padrão.

Recipientes físicos com capacidade, peso ou custo próprio entram como `physical`. Agrupamentos sem peso e custo próprios entram como `group` e ficam em `ignored`, sem apagar o estado dos itens internos.

O importador não calcula carga, custo total, RD ou ataques. Esses cálculos continuam em serviços de domínio.

---

## Fora de escopo atual

DOM-IMP-1.4 ainda não importa:

- idiomas;
- familiaridades culturais;
- magias;
- templates como agregados finais;
- ataques derivados;
- cálculo de NH;
- cálculo de carga durante a importação;
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
- [x] Refatorar Equipment para preservar usos e metadados
- [x] Criar EquipmentImporter.js
- [x] Integrar EquipmentImporter ao CharacterImporter
