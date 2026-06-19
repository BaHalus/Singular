# CharacterImporter

**Código:** DOM-IMP-1.7
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
- cria agregados válidos;
- evita aplicar pacotes quando a fonte representa apenas um template.

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

  spells: [],
  spellContainers: [],
  unknownSpellNodes: [],

  languages: [],
  languageNodes: [],
  unknownLanguageNodes: [],

  familiarities: [],
  familiarityNodes: [],
  unknownFamiliarityNodes: [],

  equipment: [],
  unknownEquipmentNodes: [],

  templates: [],
  unknownTemplateNodes: [],

  raw: {}
}
```

---

## DOM-IMP-1.7

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
- mágicas;
- idiomas;
- familiaridades culturais;
- equipamentos;
- templates `.gct`.

---

## Perícias

```text
GCS skills
  ↓
SkillsImporter
  ↓
Character.skills
```

---

## Técnicas

```text
GCS technique nodes
  ↓
TechniquesImporter
  ↓
resolução da perícia-mãe
  ↓
Character.techniques
```

---

## Mágicas

```text
GCS spells / spell_list.rows
  ↓
SpellsImporter
  ↓
normalização estrutural sem cálculo
  ↓
Character.spells
```

O `SpellsImporter` preserva:

- mágica padrão ou ritualística;
- atributo-base e dificuldade;
- pontos;
- NH e NH relativo importados;
- escolas;
- fonte de poder;
- classe e resistência;
- custos, tempos e duração como texto;
- ataques embutidos;
- features, modificadores e pré-requisitos;
- dados de estudo;
- `calc`, `importMeta` e `raw`.

---

## Idiomas e familiaridades culturais

Idiomas e familiaridades culturais que chegam como traits especiais são separados antes de preencher as vantagens comuns:

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

---

## Equipamentos

```text
GCS equipment / other_equipment / equipment_list.rows
  ↓
EquipmentImporter
  ↓
normalização métrica e estrutural
  ↓
Character.equipment
```

O `EquipmentImporter` preserva hierarquia, estados, usos, armas, features, modificadores, pré-requisitos, `calc`, metadados e dados brutos.

---

## Templates GCT

A extensão original dos templates GCS suportados é:

```text
.gct
```

Arquivos renomeados temporariamente para `.txt` durante análise continuam sendo tratados como documentos GCT.

```text
GCT template
  ↓
TemplatesImporter
  ├─ traits
  ├─ skills e techniques
  ├─ spells
  ├─ languages e familiarities
  ├─ equipment
  └─ diagnósticos desconhecidos
       ↓
Character.templates
```

O importador reconhece:

- `race`;
- `meta_trait`;
- template genérico;
- forma explicitamente declarada;
- tipo desconhecido preservado.

São preservados:

- versão GCS;
- ID do documento e IDs externos;
- nome;
- ancestralidade;
- referência;
- custo informado em `calc.points`;
- containers estruturais;
- vantagens, qualidades, desvantagens e peculiaridades;
- níveis, modificadores, features e pré-requisitos;
- bônus de atributos;
- ataques naturais em `weapons`;
- perícias do pacote;
- Forma Alternativa como trait do pacote;
- dados desconhecidos;
- documento integral em `raw`.

As categorias portuguesas e inglesas do GCS são aceitas na classificação de traits.

O custo do pacote não é recalculado. O valor fornecido pelo GCS entra em `importedPoints`.

### Isolamento de um GCT standalone

Quando a fonte inteira tem:

```js
type: "template"
```

ela é importada como um pacote em `Character.templates`.

Seus componentes não são duplicados em:

- `Character.advantages`;
- `Character.disadvantages`;
- `Character.skills`;
- `Character.spells`;
- `Character.equipment`.

A aplicação futura do pacote deverá ser uma operação explícita de domínio.

---

## Fora de escopo atual

DOM-IMP-1.7 ainda não executa:

- aplicação ou remoção de templates;
- incorporação destrutiva de componentes;
- cálculo do custo do pacote;
- cálculo de atributos resultantes;
- ligação automática de Forma Alternativa a outro template sem ID explícito;
- cálculo de Morfo;
- ataques derivados finais;
- cálculo de NH;
- cálculo de carga durante a importação;
- cálculo de poderes;
- cálculo de habilidades alternativas;
- interpretação mecânica de custos, tempos e durações de mágicas.

---

## Checklist

- [x] Criar ImportSnapshot.js
- [x] Criar IdentityImporter.js
- [x] Criar AttributesImporter.js
- [x] Criar TraitsImporter.js
- [x] Criar SkillsImporter.js
- [x] Criar TechniquesImporter.js
- [x] Criar SpellsImporter.js
- [x] Criar LanguagesImporter.js
- [x] Criar FamiliaritiesImporter.js
- [x] Criar EquipmentImporter.js
- [x] Criar Templates.js
- [x] Criar TemplatesImporter.js
- [x] Integrar Templates ao Character
- [x] Integrar TemplatesImporter ao CharacterImporter
- [x] Preservar extensão original `.gct`
- [x] Preservar raças e metacaracterísticas
- [x] Preservar skills incluídas no template
- [x] Preservar ataques naturais e bônus de atributos
- [x] Evitar aplicação automática de template standalone
- [x] Preservar containers e nós desconhecidos
