# ADR-0008 — Character Import e Poderes

**Status:** Aprovado  
**Camada:** Domain / Import  
**Data:** 2026-06-18

---

## Contexto

A SINGULAR precisa importar personagens do GCS sem transformar o importador em motor de regras.

Também é necessário decidir como representar poderes. Em GURPS 4e, poderes são essencialmente vantagens, modificadores, fonte de poder, talento e agrupamento temático. Portanto, não devem duplicar vantagens em uma lista paralela.

---

## Decisão sobre importação

O `CharacterImporter` não calcula regras.

Ele apenas:

```text
lê entrada GCS
normaliza campos conhecidos
preserva dados desconhecidos
cria Character válido
```

A pipeline será:

```text
GCS JSON
  ↓
Raw Import
  ↓
Normalizers
  ↓
Character Aggregate
  ↓
Services
```

Serviços como carga, RD, defesa e ataques continuam separados do importador.

---

## Escopo inicial do importador

A primeira versão do importador pode mapear:

- identidade;
- atributos;
- secundárias;
- vantagens;
- desvantagens;
- qualidades;
- peculiaridades;
- perícias;
- técnicas;
- idiomas;
- familiaridades culturais;
- equipamentos.

Ficam fora do escopo inicial:

- magias;
- modelos;
- formas alternativas;
- ataques derivados;
- cálculos de NH;
- cálculos de custo total;
- efeitos de modificadores;
- validação de pré-requisitos.

---

## Dados desconhecidos

Dados que o importador não entender não devem ser descartados.

Eles devem ser preservados em:

```js
raw
```

quando pertencerem a um item específico, ou em estrutura equivalente de metadados de importação quando pertencerem ao arquivo inteiro.

---

## Decisão sobre poderes

Poder não será um agregado paralelo a vantagens.

Regra arquitetural:

```text
Poder não duplica vantagem.
Poder agrupa e qualifica vantagens.
Custo continua nas vantagens.
```

Portanto, habilidades de poder serão importadas como vantagens com metadados adicionais.

Exemplo:

```js
{
  id: "adv-001",
  name: "Ataque Inato",
  points: 20,
  modifiers: [],
  power: {
    groupId: "power-fire",
    source: "Fogo",
    talentAdvantageId: "adv-fire-talent"
  },
  tags: ["power"]
}
```

---

## Agrupadores de poder

No futuro, o Character poderá ter uma estrutura auxiliar:

```js
powerGroups: []
```

Essa estrutura será índice/agrupador visual e sem custo próprio, exceto se uma vantagem específica representar o custo.

---

## Consequências

A lista `advantages` pode conter vantagens comuns e habilidades de poder.

A lista `powers` do Character não deve ser usada como fonte paralela de habilidades enquanto essa ADR estiver vigente.

Isso evita dupla contagem de pontos e mantém aderência ao modelo GURPS.
