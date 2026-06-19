# Equipment

**Código:** DOM-EQP-1.2
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Equipment representa os equipamentos do personagem em GURPS 4e.

A arquitetura segue ADR-0005 e ADR-0006.

---

## Objetivo

Equipment armazena inventário e equipamentos importados, preservando estrutura hierárquica e dados relevantes do GCS sem calcular regras.

O formato canônico interno da SINGULAR usa custo numérico e peso numérico em quilogramas.

---

## Estrutura atual

```js
{
  id: "eq-001",
  externalIds: {},

  kind: "item",
  containerKind: null,

  name: "Kit de Campo",
  quantity: 1,

  techLevel: "8",
  legalityClass: null,
  reference: "B288",

  cost: 100,
  weightKg: 2,

  state: "carried",
  uses: null,
  maxUses: null,

  categories: [],
  notes: "",
  tags: [],

  weapons: [],
  features: [],
  modifiers: [],
  prereqs: null,
  calc: null,

  importMeta: null,
  children: [],
  raw: null
}
```

---

## Entrada GCS

Durante criação ou importação, campos GCS como:

```js
value: "500"
weight: "3 lb"
max_uses: 10
```

podem ser aceitos como entrada, mas são normalizados para:

```js
cost: 500
weightKg: 1.5
maxUses: 10
```

A conversão usa a convenção GURPS:

```text
2 lb = 1 kg
```

---

## Kinds

`kind` aceita:

- `item`
- `container`

`containerKind` aceita:

- `physical`
- `group`
- `null`

Recipientes físicos possuem peso próprio e propagam o estado de carga aos seus conteúdos quando carregados ou equipados.

Agrupamentos semânticos organizam itens, não propagam estado e ficam em `ignored` por padrão.

---

## Estados

`state` aceita:

- `equipped`
- `carried`
- `stored`
- `dropped`
- `ignored`

---

## Usos

`uses` e `maxUses` preservam estados consumíveis importados, como cargas, doses ou munição abstrata.

Equipment apenas armazena esses valores. Consumo, recarga e validação operacional pertencem a operações e serviços próprios.

---

## Metadados de importação

`importMeta` pode registrar:

```js
{
  source: "gcs",
  section: "equipment",
  containerIds: [],
  sourceType: "equipment"
}
```

O objeto `raw` preserva integralmente o nó externo original.

---

## Responsabilidades

Equipment é responsável por:

- armazenar equipamentos;
- preservar hierarquia;
- preservar identificadores externos;
- preservar armas embutidas;
- preservar features;
- preservar modificadores;
- preservar pré-requisitos e `calc` importado;
- preservar usos e máximos de uso;
- preservar metadados e dados brutos importados;
- diferenciar recipientes físicos de agrupamentos;
- normalizar custo para número;
- normalizar peso para kg.

---

## Não Responsabilidades

Equipment não calcula:

- carga;
- peso total;
- custo total;
- RD;
- ataques;
- defaults;
- pré-requisitos;
- consumo ou recarga.

---

## Checklist

- [x] Criar ADR-0005
- [x] Criar ADR-0006
- [x] Criar Equipment.md
- [x] Criar Equipment.js
- [x] Criar Equipment.test.js
- [x] Criar EquipmentOperations.js
- [x] Criar EquipmentOperations.test.js
- [x] Integrar com Character
- [x] Preservar usos e metadados de importação
