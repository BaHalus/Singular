# ADR-0005 — Equipment Architecture

**Status:** Aprovado  
**Camada:** Domain  
**Data:** 2026-06-18

---

## Contexto

A SINGULAR precisa representar equipamentos de GURPS 4e sem acoplar inventário, combate, proteção, carga e importação GCS de forma prematura.

A biblioteca GCS mostra que equipamentos podem ser itens simples, recipientes físicos, agrupamentos de navegação, armas, armaduras e itens com modificadores.

O GCS usa `equipment`, `equipment_container`, `weapons`, `features`, `children`, `prereqs`, `calc`, `categories` e arquivos separados de modificadores de equipamento.

A SINGULAR não deve copiar cegamente o GCS, mas deve preservar dados importados o suficiente para auditoria e conversão futura.

---

## Decisão

Equipment será um agregado hierárquico pertencente ao Character.

Cada entrada de equipamento será chamada de Equipment Item, mesmo quando representar um recipiente.

A estrutura inicial deverá suportar:

- item simples;
- recipiente físico;
- agrupamento de navegação;
- filhos aninhados;
- armas embutidas como dados preservados;
- features embutidas como dados preservados;
- modificadores aplicados;
- dados brutos importados.

---

## Tipos de entrada

A SINGULAR distinguirá:

```js
kind: "item" | "container"
```

E, para containers:

```js
containerKind: "physical" | "group" | null
```

### Item simples

Representa objeto físico ou abstrato sem filhos próprios.

Exemplos:

- flecha;
- espada;
- bandagens;
- poção individual;
- armadura individual.

### Container físico

Representa objeto físico que pode conter outros itens.

Exemplos:

- mochila;
- mochila pequena;
- cantil;
- garrafa cerâmica;
- bolsa;
- algibeira;
- alforjes.

Critério de importação inicial:

```text
GCS equipment_container com prereq de contained_weight_prereq
→ containerKind: "physical"
```

### Agrupamento de navegação

Representa organização de biblioteca, não objeto físico carregável.

Exemplos:

- Unguentos;
- Pastilhas;
- Poções;
- categorias editoriais.

Critério de importação inicial:

```text
GCS equipment_container sem capacidade física, com value 0, weight 0 e children
→ containerKind: "group"
```

Um agrupamento não deve ser tratado como recipiente real no inventário do personagem.

---

## Estrutura canônica inicial

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

## Estado de posse/carga

Equipment terá estado transitório próprio:

```js
state: "equipped" | "carried" | "stored" | "dropped" | "ignored"
```

Significado inicial:

- `equipped`: vestido, empunhado ou pronto para uso;
- `carried`: carregado e conta para carga;
- `stored`: possuído, mas não carregado no corpo;
- `dropped`: largado temporariamente;
- `ignored`: presente para biblioteca/importação, mas não conta como posse ativa.

Agrupamentos de navegação importados devem usar preferencialmente:

```js
state: "ignored"
```

---

## Peso e valor

Na primeira versão, peso e valor serão preservados como strings.

Motivo:

- GCS usa valores como `3 lb`, `0 lb`, `0.075 lb`, `x4`, `30+1(3)` em campos relacionados;
- parsing numérico e conversão de unidades pertencem ao motor ou a serviços dedicados;
- o domínio deve preservar informação sem perda.

Campos calculados importados serão preservados em `calc`, mas não tratados como verdade da SINGULAR.

---

## Armas embutidas

Itens podem conter `weapons`.

A SINGULAR preservará `weapons` dentro do equipamento, mas ataques derivados serão modelados depois.

Equipment não calcula NH de ataque.

Equipment não resolve defaults.

Equipment não gera ataques automaticamente nesta etapa.

---

## Armaduras e features

Proteções aparecem no GCS como `features`, especialmente `dr_bonus`.

A SINGULAR preservará `features` dentro do equipamento.

Cálculo de RD por local pertence ao motor ou a um agregado futuro de Protection.

---

## Modificadores de equipamento

Modificadores de equipamento serão preservados em:

```js
modifiers: []
```

Cada modificador aplicado deverá preservar:

- id próprio;
- externalIds;
- name;
- costType;
- cost;
- notes;
- features;
- raw.

A biblioteca de modificadores pode existir separadamente depois.

---

## Relação com Character

Character possuirá:

```js
equipment: createEquipment(input.equipment)
```

Mas Equipment não deve depender de Character.

---

## Fora de escopo inicial

Equipment v1 não fará:

- cálculo de carga;
- cálculo de custo total;
- cálculo de peso total;
- geração de ataques;
- cálculo de RD;
- validação de prereqs;
- parsing de unidade;
- conversão lb/kg;
- empilhamento inteligente de munição;
- regras de contêiner além da preservação estrutural.

---

## Consequências

Esta decisão permite importar bibliotecas GCS com perda mínima, diferenciar recipientes reais de agrupamentos editoriais e manter o domínio preparado para carga, combate e proteção sem acoplamento prematuro.
