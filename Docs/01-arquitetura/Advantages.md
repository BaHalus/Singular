# Advantages

**Código:** DOM-ADV-1.0  
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
- name
- notes
- tags

---

# 3. Responsabilidades

Advantages é responsável por:

- armazenar vantagens do personagem;
- preservar identidade individual de cada vantagem;
- preservar notas;
- preservar tags;
- fornecer serialização consistente;
- garantir integridade estrutural mínima.

---

# 4. Não Responsabilidades

Advantages não é responsável por:

- calcular custo em pontos;
- validar pré-requisitos;
- aplicar modificadores;
- interpretar níveis;
- interpretar frequência de aparição;
- interpretar habilidades alternativas;
- calcular efeitos mecânicos;
- renderizar interface.

Essas responsabilidades pertencem a Rules, Schema ou Presentation.

---

# 5. Estrutura

A estrutura canônica de uma vantagem é:

```js
{
  id: "adv-id",
  name: "Combat Reflexes",
  notes: "",
  tags: []
}
