# Equipment

**Código:** DOM-EQP-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Equipment representa os equipamentos do personagem em GURPS 4e.

A arquitetura segue ADR-0005.

---

## Objetivo

Equipment armazena inventário e equipamentos importados, preservando estrutura hierárquica e dados relevantes do GCS sem calcular regras.

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

  value: "500",
  weight: "3 lb",

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
- diferenciar recipientes físicos de agrupamentos.

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
- conversão de unidades.

---

## Checklist

- [x] Criar ADR-0005
- [x] Criar Equipment.md
- [ ] Criar Equipment.js
- [ ] Criar Equipment.test.js
- [ ] Criar EquipmentOperations.js
- [ ] Criar EquipmentOperations.test.js
- [ ] Integrar com Character
