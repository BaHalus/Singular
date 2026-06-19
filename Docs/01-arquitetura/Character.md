# Character

**Código:** DOM-CHAR-1.3  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Aggregate Root

Character é o Aggregate Root da SINGULAR.

Ele representa a unidade fundamental de persistência, serialização e manipulação de um personagem.

---

## Responsabilidades

Character mantém:

- identidade;
- atributos;
- secundárias;
- pools;
- traits;
- perícias e técnicas;
- mágicas e poderes;
- equipamentos e ataques;
- idiomas e familiaridades;
- templates importados;
- histórico de incorporação;
- conjuntos de formas;
- estado transitório atual;
- snapshots de estado das formas inativas;
- metadados.

Character garante apenas invariantes estruturais.

---

## Não responsabilidades

Character não calcula:

- regras de GURPS;
- custos;
- dano ou cura;
- carga;
- movimento;
- NH;
- pré-requisitos;
- efeitos de features;
- máximos de pools;
- proporção de dano entre formas;
- tempo ou custo de transformação;
- limites de Morfo.

Essas responsabilidades pertencem a Rules e aos serviços de domínio apropriados.

---

## Composição

```text
Character
├── Identity
├── Attributes
├── SecondaryCharacteristics
├── Pools
├── Advantages
├── Perks
├── Disadvantages
├── Quirks
├── Skills
├── Techniques
├── Spells
├── Powers
├── Equipment
├── Attacks
├── Languages
├── Familiarities
├── Templates
├── TemplateApplications
├── AlternateFormSets
├── State
└── Metadata
```

---

## Estrutura canônica

```js
{
  identity,
  attributes,
  secondaryCharacteristics,
  pools,

  advantages,
  perks,
  disadvantages,
  quirks,

  skills,
  techniques,
  spells,
  powers,

  equipment,
  attacks,
  languages,
  familiarities,

  templates,
  templateApplications,
  alternateFormSets,

  state,
  metadata
}
```

---

## Templates

`templates` contém pacotes importados e independentes.

`templateApplications` registra incorporações permanentes.

Importar e incorporar são operações distintas.

Uma aplicação removida permanece no histórico com status `removed`.

---

## Formas Alternativas

`alternateFormSets` contém conjuntos de formas mutuamente exclusivas.

Cada conjunto possui:

- forma-base;
- forma ativa;
- formas disponíveis;
- mecanismo;
- política de continuidade de estado;
- proveniência da ativação atual.

Somente uma forma fica ativa dentro de cada conjunto.

Conjuntos independentes podem coexistir.

Templates permanentes como Elfo, Vampiro, Orc, Lich, Anão ou Licantropo não são removidos quando uma forma temporária muda.

---

## Estado atual e estado das formas

O estado atualmente ativo permanece nos agregados normais:

```text
Pools
State
Equipment
```

Formas inativas preservam snapshots em:

```text
AlternateForm.runtimeState
```

`AlternateFormSet.statePolicy` define se cada categoria é:

```text
shared
perForm
```

A política pode controlar:

- PV atuais;
- PF atuais;
- Reserva de Energia atual;
- ferimentos;
- condições;
- efeitos;
- estado, usos e quantidade de equipamentos.

O Character armazena esses dados, mas não decide a regra mecânica correta para uma campanha.

---

## Dados permanentes

São permanentes estruturalmente:

- identidade;
- atributos e secundárias;
- traits;
- perícias, técnicas e mágicas;
- equipamentos cadastrados;
- idiomas e familiaridades;
- templates;
- histórico de aplicações;
- definição dos conjuntos de formas;
- metadados.

Componentes temporários da forma ativa permanecem serializados enquanto estiverem ativos, com proveniência explícita.

---

## Dados transitórios

Incluem:

- valores atuais de pools;
- ferimentos;
- condições;
- efeitos;
- estado de combate;
- estado e usos de equipamentos;
- forma ativa;
- snapshots das formas inativas.

---

## Invariantes

Um Character válido deve possuir:

- Identity com `id` e `name`;
- Attributes com ST, DX, IQ e HT;
- Pools válidos;
- State válido;
- coleções estruturais válidas;
- templates válidos;
- histórico de aplicações válido;
- conjuntos de formas válidos.

Cada conjunto de formas deve possuir:

- pelo menos uma forma;
- forma-base existente;
- forma ativa existente;
- IDs únicos;
- política de estado válida.

Cada forma deve possuir `runtimeState` válido.

Essas invariantes não executam regras de GURPS.

---

## Serialização

Character deve ser serializável para JSON sem perda estrutural.

A serialização inclui:

- templates;
- aplicações;
- conjuntos de formas;
- forma ativa;
- política de continuidade;
- snapshots de estado.

Ela não inclui:

- métodos;
- referências circulares;
- estado de interface;
- dependências externas.

---

## Direção de implementação

A implementação privilegia:

- composição;
- objetos simples;
- funções puras;
- imutabilidade quando viável;
- operações reversíveis;
- proveniência explícita;
- separação entre dados, regras e apresentação.

---

## Checklist

- [x] Criar Character.js
- [x] Validar invariantes
- [x] Validar serialização
- [x] Integrar templates
- [x] Integrar histórico de aplicações
- [x] Integrar conjuntos de formas
- [x] Integrar linker seguro
- [x] Integrar política de continuidade
- [x] Integrar snapshots por forma
- [x] Aprovar Character v1.3
