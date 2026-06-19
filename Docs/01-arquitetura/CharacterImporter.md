# CharacterImporter

**Código:** DOM-IMP-1.5
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
    languageNodes: [],
    familiarityNodes: [],
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
  languageNodes: [],
  unknownLanguageNodes: [],

  familiarities: [],
  familiarityNodes: [],
  unknownFamiliarityNodes: [],

  equipment: [],
  unknownEquipmentNodes: [],

  raw: {}
}
```

---

## DOM-IMP-1.5

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
- idiomas;
- familiaridades culturais;
- equipamentos.

### Perícias

```text
GCS skills
  ↓
SkillsImporter
  ↓
Character.skills
```

### Técnicas

```text
GCS technique nodes
  ↓
TechniquesImporter
  ↓
resolução da perícia-mãe
  ↓
Character.techniques
```

### Idiomas e familiaridades culturais

No GCS, idiomas e familiaridades culturais podem chegar como traits especiais. O `TraitsImporter` os separa antes de preencher as vantagens comuns:

```text
GCS traits
  ↓
TraitsImporter
  ├─ languageNodes
  └─ familiarityNodes
       ↓
LanguagesImporter / FamiliaritiesImporter
       ↓
Character.languages / Character.familiarities
```

Também são aceitas coleções diretas em `languages`, `familiarities` e `cultural_familiarities`.

O `LanguagesImporter` preserva, sem recalcular:

- nome do idioma;
- nível falado;
- nível escrito;
- marcador de idioma nativo;
- custo informado;
- referência;
- modificadores;
- pré-requisitos;
- notas, tags, metadados e dados brutos.

Os níveis canônicos internos são:

```text
none
broken
accented
native
```

Os rótulos portugueses `Nenhum`, `Rudimentar`, `Com Sotaque` e `Materna`/`Nativo` são normalizados para esses valores.

Linguagens de sinais são preservadas com `mode:signed`; o nível de sinais ocupa provisoriamente `spokenLevel`, enquanto `writtenLevel` permanece `none`. O nó bruto continua disponível para evolução futura do schema.

O `FamiliaritiesImporter` preserva:

- nome da cultura;
- marcador de cultura nativa;
- custo informado;
- referência;
- modificadores;
- pré-requisitos;
- notas, tags, metadados e dados brutos.

Idiomas e familiaridades culturais retirados da árvore de traits não são duplicados em `Character.advantages`.

### Equipamentos

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

O importador não calcula carga, custo total, RD, ataques, NH ou custos de idiomas e familiaridades.

---

## Fora de escopo atual

DOM-IMP-1.5 ainda não importa:

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
- [x] Refatorar Languages e Familiarities para preservar campos ricos
- [x] Criar LanguagesImporter.js
- [x] Criar FamiliaritiesImporter.js
- [x] Separar idiomas e familiaridades da lista comum de vantagens
- [x] Integrar idiomas e familiaridades ao CharacterImporter
- [x] Refatorar Equipment para preservar usos e metadados
- [x] Criar EquipmentImporter.js
- [x] Integrar EquipmentImporter ao CharacterImporter
