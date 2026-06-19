# Spells

**Código:** DOM-SPL-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Spells representa mágicas aprendidas pelo personagem em GURPS 4e.

---

## Regra central

Mágicas padrão continuam sendo tratadas como perícias especializadas pelas regras do sistema, mas possuem um agregado próprio porque carregam metadados operacionais que não pertencem a uma perícia comum.

O agregado armazena dados. Ele não calcula NH, custo reduzido por NH alto, pré-requisitos ou efeitos.

---

## Estrutura canônica

```js
{
  id: "spell-001",
  externalIds: {},

  spellType: "standard",
  name: "Bola de Ácido",
  techLevel: null,

  attribute: "IQ",
  difficulty: "H",
  points: 1,

  importedLevel: 14,
  importedRelativeLevel: null,
  importedRelativeLevelText: "IQ+1",

  colleges: ["Água"],
  powerSource: "Arcana",
  spellClass: "Projétil",
  resistance: "",

  castingCost: "1-Aptidão Mágica",
  maintenanceCost: "-",
  castingTime: "1-3 seg",
  duration: "Instantânea",

  item: "",
  baseSkill: "",
  prereqCount: null,

  reference: "M191",
  notes: "",
  tags: [],
  categories: ["Água"],

  weapons: [],
  features: [],
  modifiers: [],
  prereqs: null,
  study: [],
  thirdParty: null,
  calc: null,

  importMeta: null,
  raw: null
}
```

---

## Tipos

`spellType` aceita:

- `standard`
- `ritualMagic`

Mágicas ritualísticas preservam a perícia-base em `baseSkill`.

---

## Dificuldade e NH importado

A dificuldade é decomposta em:

```js
attribute: "IQ"
difficulty: "H"
```

O NH vindo do GCS é preservado em `importedLevel`.

Quando o GCS fornece o NH relativo como número, ele entra em `importedRelativeLevel`. Quando fornece expressão textual, como `IQ+1`, ela entra em `importedRelativeLevelText`.

A SINGULAR não considera esses valores importados como cálculo soberano. Futuramente eles serão comparados com o resultado do motor.

---

## Campos textuais de operação

Os campos abaixo permanecem textuais:

- `castingCost`
- `maintenanceCost`
- `castingTime`
- `duration`
- `resistance`
- `spellClass`

Isso é necessário porque o GCS e as bibliotecas usam expressões como:

```text
Varia
Metade
1-Aptidão Mágica
1 por 10 CP
min=custo
Instantânea
```

O importador não tenta interpretar ou calcular essas expressões.

---

## Escolas e categorias

`colleges` preserva as escolas declaradas pela mágica.

`categories` preserva a categorização editorial da biblioteca, que pode divergir da descrição textual em `colleges`.

---

## Ataques embutidos

Mágicas podem conter `weapons` com ataques corpo a corpo ou à distância.

O agregado apenas preserva esses dados. A transformação em ataques finais de personagem pertence a um serviço posterior.

---

## Containers

Containers de mágicas não entram diretamente em `Character.spells`.

O `SpellsImporter` os preserva separadamente em `ImportSnapshot.spellContainers` e registra a ancestralidade de cada mágica em:

```js
importMeta.containerIds
```

---

## Dados desconhecidos

Campos externos conhecidos são normalizados.

O nó original completo permanece em `raw`, e nós não reconhecidos ficam em `ImportSnapshot.unknownSpellNodes`.

---

## Não responsabilidades

Spells não calcula:

- NH;
- NH relativo;
- redução de custo por NH alto;
- custo de manutenção efetivo;
- tempo de operação efetivo;
- pré-requisitos satisfeitos;
- dano de ataques;
- custo em pontos total;
- efeitos de Aptidão Mágica ou talentos.
