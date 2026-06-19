# CharacterImporter

**Código:** DOM-IMP-1.8
**Status:** Aprovado
**Camada:** Domain / Import
**Tipo:** Import Pipeline

CharacterImporter importa dados externos para um Character válido da SINGULAR.

A arquitetura segue ADR-0008, ADR-0009 e ADR-0012.

---

## Regra central

O importador não calcula regras.

Ele apenas:

- lê a entrada;
- normaliza campos conhecidos;
- preserva dados desconhecidos;
- cria agregados válidos;
- evita aplicar pacotes quando a fonte representa apenas um template;
- vincula Forma Alternativa a templates somente quando a relação é determinística.

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
AlternateFormsLinker
  ↓
Character importado + diagnóstico de vínculos
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

## DOM-IMP-1.8

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
- templates `.gct`;
- vínculos seguros de Forma Alternativa.

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

O custo do pacote não é recalculado. O valor fornecido pelo GCS entra em `importedPoints`.

### Isolamento de um GCT standalone

Quando a fonte inteira tem:

```js
type: "template"
```

ela é importada como um pacote em `Character.templates`.

Seus componentes não são duplicados nas listas principais do personagem.

---

## Vinculação de Forma Alternativa

Depois da criação do Character, `AlternateFormsLinker` analisa vantagens como:

```text
Forma Alternativa
Forma Alternativa: Lobo
Forma Alternativa (Morcego)
Alternate Form
```

A vinculação usa:

1. ID explícito do template;
2. nome explícito do template;
3. nome declarado na vantagem;
4. notas;
5. equivalência canônica exata.

Exemplo:

```text
Notas: Morcego
Template: Forma de Morcego
```

produz um vínculo seguro quando houver apenas um template correspondente.

Nenhum vínculo é criado quando:

- o alvo não foi informado;
- o ID explícito não existe;
- nenhum nome corresponde;
- mais de um template corresponde;
- existe conflito com vínculo manual.

### Grupo corporal padrão

Sem grupo explícito, vantagens reconhecidas como Forma Alternativa entram no conjunto:

```text
body
```

Grupos explícitos como `body` e `armor` permanecem independentes.

### Diagnósticos

`importCharacterWithDiagnostics(source)` retorna:

```js
{
  character,
  snapshot,
  alternateFormLinkReport
}
```

O relatório separa:

- candidatos;
- resolvidos;
- já vinculados;
- ambíguos;
- não resolvidos;
- conjuntos criados;
- conjuntos atualizados.

`importCharacter(source)` retorna apenas o Character já submetido à vinculação segura.

---

## Fora de escopo atual

DOM-IMP-1.8 ainda não executa:

- aplicação automática de templates permanentes;
- ativação automática de uma forma vinculada;
- cálculo do custo do pacote;
- cálculo de atributos resultantes;
- escolha aproximada entre nomes semelhantes;
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
- [x] Criar TemplatesImporter.js
- [x] Integrar Templates ao Character
- [x] Preservar extensão original `.gct`
- [x] Evitar aplicação automática de template standalone
- [x] Criar AlternateFormsLinker.js
- [x] Vincular Forma Alternativa por ID explícito
- [x] Vincular Forma Alternativa por nome canônico único
- [x] Preservar ambiguidades e casos não resolvidos
- [x] Integrar linker ao CharacterImporter
- [x] Expor importação com diagnósticos
