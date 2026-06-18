# Equipment

**Código:** DOM-EQP-1.1
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

## Estrutura inicial

```js
{
  id: "eq-001",
  externalIds: {},

  kind: "item",
  containerKind: null,

  name: "Espada Larga",
  quantity: 1,

  techLevel: "2",
  legalityClass: null,
  reference: "B271",

  cost: 500,
  weightKg: 1.5,

  state: "carried",

  categories: [],
  notes: "",
  tags: [],

  weapons: [],
  features: [],
  modifiers: [],
  prereqs: null,
  calc: null,

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
```

podem ser aceitos como entrada, mas são normalizados para:

```js
cost: 500
weightKg: 1.5
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

---

## Estados

`state` aceita:

- `equipped`
- `carried`
- `stored`
- `dropped`
- `ignored`

---

## Responsabilidades

Equipment é responsável por:

- armazenar equipamentos;
- preservar hierarquia;
- preservar identificadores externos;
- preservar armas embutidas;
- preservar features;
- preservar modificadores;
- preservar dados brutos importados;
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
- pré-requisitos.

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
