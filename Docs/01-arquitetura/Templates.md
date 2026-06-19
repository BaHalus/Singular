# Templates

**Código:** DOM-TPL-1.1
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado e operações

Templates representa pacotes GURPS importados de arquivos GCS com extensão original `.gct`.

A arquitetura de aplicação segue ADR-0010.

---

## Escopo

O agregado cobre:

- modelos genéricos;
- raças;
- metacaracterísticas;
- formas explicitamente declaradas;
- componentes adicionais do pacote.

Os arquivos podem ter sido renomeados para `.txt` durante análise, mas o formato original suportado é `.gct`.

---

## Regra central

Um template é um pacote preservado, não uma alteração já aplicada ao personagem.

A importação:

- não soma custos;
- não altera atributos;
- não injeta vantagens no personagem;
- não cria ataques derivados;
- não resolve pré-requisitos;
- não ativa formas alternativas.

O custo fornecido pelo GCS é armazenado em `importedPoints`.

---

## Estrutura canônica do pacote

```js
{
  id: "template-001",
  externalIds: {},

  sourceVersion: 2,
  templateType: "race",
  name: "Anão",
  ancestry: "Human",
  reference: "B261",
  importedPoints: 35,

  notes: "",
  tags: ["import:gcs", "format:gct", "template-type:race"],

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

  importMeta: {},
  raw: {}
}
```

---

## Tipos

`templateType` aceita:

- `template`
- `race`
- `metaTrait`
- `form`
- `unknown`

O tipo é obtido primeiro de uma declaração explícita e depois do container estrutural principal do GCS.

Os containers observados em `.gct` usam principalmente:

```text
container_type: race
container_type: meta_trait
```

---

## Estrutura GCT observada

```text
template
├─ advantages
│  └─ advantage_container
│     ├─ container_type
│     ├─ ancestry
│     ├─ calc.points
│     └─ children
└─ skills
```

Outras seções compatíveis podem incluir mágicas, técnicas, idiomas, familiaridades e equipamento.

---

## Traits do pacote

Os componentes passam pelo mesmo pipeline de traits da SINGULAR.

São preservados:

- vantagens;
- qualidades;
- desvantagens;
- peculiaridades;
- níveis;
- modificadores ativos e inativos;
- features;
- armas naturais;
- pré-requisitos;
- notas;
- containers;
- dados desconhecidos;
- `calc`, referências e dados brutos no contexto de importação.

As categorias GCS `Vantagem`, `Qualidade`, `Desvantagem`, `Peculiaridade`, `Advantage`, `Perk`, `Disadvantage` e `Quirk` participam da classificação.

Traits de custo zero continuam classificáveis quando a categoria informa sua função.

---

## Atributos e efeitos estruturais

Bônus como:

```js
{
  type: "attribute_bonus",
  amount: 6,
  attribute: "st"
}
```

são preservados dentro das features originais.

A incorporação não aplica esses bônus diretamente. O motor soberano deverá consumi-los posteriormente.

---

## Ataques naturais

Armas em traits, como mordidas, garras, caudas, sopros e pisoteios, permanecem em `weapons`.

A incorporação preserva esses dados, mas não cria imediatamente `Character.attacks`.

---

## Formas alternativas

Traits como `Forma Alternativa` são preservados como componentes do pacote, incluindo notas que identificam formas como morcego ou lobo.

A ligação entre uma vantagem Forma Alternativa e outro template externo não é inventada quando o `.gct` não fornece um identificador explícito.

---

## Ciclo de vida

O ciclo de vida é explícito:

```text
importar
  ↓
Character.templates
  ↓
incorporar
  ↓
componentes clonados + TemplateApplication ativa
  ↓
remover incorporação
  ↓
componentes removidos + histórico preservado
```

### Importar

Um `.gct` importado isoladamente entra em:

```text
Character.templates
```

Seus componentes não são duplicados nas listas principais do personagem.

### Incorporar

`incorporateTemplate(character, templateId)`:

- preserva o pacote original;
- copia componentes conhecidos para o personagem;
- gera novos IDs;
- grava proveniência em cada cópia;
- remapeia técnicas para as perícias clonadas;
- clona IDs de equipamento recursivamente;
- cria uma entrada ativa em `Character.templateApplications`.

A proveniência inclui:

```js
{
  templateApplicationId,
  templateId,
  templateName,
  templateComponentType,
  templateSourceComponentId
}
```

### Remover incorporação

`removeTemplateApplication(character, applicationId)`:

- remove componentes associados à aplicação;
- não remove componentes anteriores do personagem;
- mantém o pacote em `Character.templates`;
- mantém o registro histórico;
- altera a aplicação para `status: "removed"`.

### Remover pacote

`removeTemplatePackage(character, templateId)` remove o pacote importado somente quando ele não possui aplicação ativa.

Uma aplicação removida não impede a remoção do pacote e permanece como histórico.

---

## TemplateApplication

```js
{
  id: "application-001",
  templateId: "template-001",
  templateName: "Anão",
  templateType: "race",
  importedPoints: 35,

  status: "active",
  appliedAt: "2026-06-19T12:00:00.000Z",
  removedAt: null,

  componentIds: {
    advantages: [],
    perks: [],
    disadvantages: [],
    quirks: [],
    skills: [],
    techniques: [],
    spells: [],
    languages: [],
    familiarities: [],
    equipment: []
  },

  notes: ""
}
```

O registro permite auditoria e remoção previsível.

---

## Duplicidade

Um template não pode ter duas aplicações ativas simultaneamente no mesmo personagem.

Depois da remoção, o pacote pode ser incorporado novamente. A nova incorporação recebe outro ID e novos IDs de componentes.

---

## Metadados de importação

`importMeta` do pacote registra:

```js
{
  source: "gcs",
  format: "gct",
  originalExtension: ".gct",
  sourceType: "template",
  rootContainerIds: [],
  primaryContainerId: null
}
```

O documento original completo permanece em `raw`.

---

## Não responsabilidades

Templates e suas operações não calculam:

- custo total;
- custo alternativo;
- atributos finais;
- secundárias finais;
- NH;
- RD;
- carga;
- ataques finais;
- satisfação de pré-requisitos;
- ativação de Forma Alternativa;
- efeitos de Morfo;
- aplicação mecânica de features.
