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

# 3. Responsabilidades

Advantages é responsável por:

- armazenar vantagens do personagem;
- preservar identidade interna de cada vantagem;
- preservar identificadores externos;
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

  externalIds: {
    gcs: "gcs-id"
  },

  name: "Combat Reflexes",
  notes: "",
  tags: []
}
```

A estrutura do agregado é:

```js
[
  {
    id: "adv-001",

    externalIds: {
      gcs: "gcs-adv-001"
    },

    name: "Combat Reflexes",
    notes: "",
    tags: ["combat"]
  }
]
```

---

# 6. ID

Toda vantagem deve possuir `id` permanente próprio da SINGULAR.

O id não deve depender de:

- posição na lista;
- nome;
- ordem;
- texto exibido;
- identificador externo.

---

# 7. External IDs

Toda vantagem deve possuir `externalIds`.

`externalIds` deve ser um objeto.

Pode estar vazio.

Identificadores externos devem seguir ADR-0004.

Exemplo:

```js
{
  externalIds: {
    gcs: "gcs-advantage-id"
  }
}
```

---

# 8. Name

Name armazena o nome técnico da vantagem.

A tradução ou forma de exibição pertence à camada Presentation.

---

# 9. Notes

Notes armazena observações livres do usuário ou dados textuais preservados.

Não deve ser usado para cálculos.

---

# 10. Tags

Tags são marcadores livres usados para organização, busca e filtros.

Tags não executam regras.

Tags não substituem Schema.

Tags não substituem Rules.

---

# 11. Campos deliberadamente excluídos

Advantages v1 não possui:

- levels;
- cost;
- points;
- modifiers;
- children;
- parent;
- enabled;
- active.

Esses conceitos serão modelados apenas quando sua semântica estiver claramente definida.

---

# 12. Relação com Perks

Perks não pertencem a Advantages.

Perks serão modeladas em agregado próprio.

Na UI em português, Perks serão exibidas como Qualidades.

---

# 13. Relação com Disadvantages e Quirks

Disadvantages e Quirks não pertencem a Advantages.

Eles serão modelados em agregados próprios.

---

# 14. Compatibilidade GCS

Arquivos GCS podem conter vantagens com estruturas mais complexas.

Dados adicionais importados do GCS devem ser preservados conforme ADR-0003.

Identificadores externos devem seguir ADR-0004.

A implementação inicial da SINGULAR não precisa compreender todos os formatos internos de vantagens do GCS.

---

# 15. Serialização

Advantages deve ser serializável para JSON sem perda estrutural.

A serialização não deve conter:

- métodos;
- referências circulares;
- dependências externas.

---

# 16. Relação com Character

Advantages pertence ao Character.

Exemplo:

```text
Character
 └── Advantages
      ├── Combat Reflexes
      └── Magery
```

Character continua sendo o Aggregate Root.

---

# 17. Direção de Implementação

A implementação deverá utilizar:

- objetos simples;
- arrays;
- composição;
- funções puras;
- serialização direta.

A implementação não deverá utilizar classes.

---

# 18. Checklist de Implementação

- [x] Criar Advantages.md
- [x] Criar Advantages.js
- [x] Criar Advantages.test.js
- [x] Criar AdvantagesOperations.js
- [x] Criar AdvantagesOperations.test.js
- [ ] Atualizar Advantages.js para externalIds
- [ ] Atualizar Advantages.test.js para externalIds
- [ ] Integrar com Character junto com Perks, Disadvantages e Quirks
- [ ] Aprovar Advantages v1.1
