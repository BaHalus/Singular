# Advantages

**Código:** DOM-ADV-1.1  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado

---

# 1. Objetivo

Advantages representa a lista de vantagens do personagem em GURPS 4ª Edição.

Este agregado pertence ao Character e armazena apenas dados estruturais mínimos das vantagens.

Não contém cálculos.

Não contém custos.

Não contém regras de GURPS.

---

# 2. Escopo Inicial

A implementação inicial considera cada vantagem como um objeto simples contendo:

- id
- externalIds
- name
- notes
- tags

---

# 3. Estrutura

```js
{
  id: "adv-id",

  externalIds: {
    gcs: "gcs-id"
  },

  name: "Combat Reflexes",
  notes: "",
  tags: []
}
