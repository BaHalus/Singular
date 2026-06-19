# ADR-0009 — Trait Containers no Importador GCS

**Status:** Aprovado  
**Camada:** Domain / Import  
**Data:** 2026-06-18

---

## Contexto

O GCS usa uma estrutura hierárquica para vantagens, desvantagens, qualidades, peculiaridades, poderes, raças, meta-características, templates e agrupamentos visuais.

Essa estrutura pode usar nós semelhantes a containers. Um nó pode representar uma trait jogável, mas também pode representar apenas um agrupamento semântico ou estrutural.

A biblioteca `.adq` de vantagens/desvantagens confirma que traits podem conter dados ricos:

- `features`;
- `modifiers`;
- `weapons`;
- `prereqs`;
- `tags`;
- filhos/estrutura hierárquica.

Portanto, o importador não deve assumir que todo nó da árvore de traits vira diretamente uma vantagem, desvantagem, qualidade ou peculiaridade.

---

## Decisão

A SINGULAR terá uma etapa intermediária de importação:

```text
GcsTraitTreeNormalizer
```

Essa etapa preservará a árvore original do GCS e classificará cada nó como:

```text
trait
container
unknown
```

Somente depois o importador transformará nós em agregados finais do Character.

---

## TraitNode intermediário

A representação intermediária será conceitual e não necessariamente parte do Character final:

```js
{
  id: "node-001",
  externalIds: {},

  nodeKind: "trait",
  containerType: null,

  name: "Combat Reflexes",
  points: 15,
  levels: null,

  role: "advantage",

  modifiers: [],
  features: [],
  weapons: [],
  prereqs: null,
  tags: [],

  children: [],
  raw: {}
}
```

---

## Tipos de container

Containers semânticos podem representar:

```text
group
alternativeAbilities
race
template
metaTrait
power
unknown
```

A classificação deve ser conservadora. Se houver dúvida, usar:

```text
unknown
```

preservando `raw`.

---

## Papéis de trait

Traits jogáveis podem ser classificadas como:

```text
advantage
perk
disadvantage
quirk
unknown
```

O importador deve usar `tags`, custo, tipo original e metadados GCS para classificar, mas não deve inventar regra quando a entrada for ambígua.

---

## Poderes

Conforme ADR-0008, poderes não são agregados paralelos a vantagens.

Um container de poder pode virar metadado estrutural, mas habilidades de poder continuam sendo vantagens.

Exemplo:

```js
{
  id: "adv-001",
  name: "Ataque Inato",
  power: {
    groupId: "power-fire",
    source: "Fogo"
  },
  tags: ["power"]
}
```

---

## Habilidades Alternativas

Habilidades alternativas serão preservadas como relação estrutural, não como nova categoria de trait.

Exemplo conceitual:

```js
{
  alternateGroupId: "aa-fire",
  isPrimaryAlternative: true
}
```

O cálculo de custo de habilidades alternativas fica fora do importador inicial.

---

## Raças, templates e meta-características

Raças, templates e meta-características podem aparecer como containers com filhos.

A primeira versão do importador deve preservar esses containers no TraitTree, mas não precisa ainda incorporá-los ao modelo final de templates.

---

## HM

Habilidades Modulares não serão tratadas de forma especial até observarmos arquivos GCS reais que confirmem a estrutura usada.

Enquanto isso, HM deve ser importada como vantagem normal, com `raw` preservado.

---

## Consequências

O pipeline de traits será:

```text
GCS
  ↓
GcsTraitTreeNormalizer
  ↓
TraitsImporter
  ↓
Advantages / Perks / Disadvantages / Quirks / futuros Templates
```

Isso evita perda de informação e reduz retrabalho ao lidar com poderes, habilidades alternativas, raças, meta-características e agrupamentos visuais.
