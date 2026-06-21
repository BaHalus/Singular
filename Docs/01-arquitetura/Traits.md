# Traits — Domínio soberano

**Código:** DOM-TRAIT-1.0 a 1.2  
**Status:** Implementado mediante CI canônica verde  
**Camada:** Domain  
**Tipo:** Agregado canônico, identidade, papéis, autoridades de valor e custo-base  
**Decisões:** ADR-0035, ADR-0036 e ADR-0037

Traits representa vantagens, qualidades, desvantagens, peculiaridades e futuras categorias compatíveis sem manter quatro autoridades persistentes independentes.

## Regra central

```text
Trait declara identidade, papel, origem e evidências de valor.
O domínio proprietário calcula quando possuir regra suficiente.
O Point Ledger agrega somente resultados autorizados.
A UI apresenta e despacha intenção.
```

DOM-TRAIT-1.0 a 1.2 não calcula custo final modificado, não interpreta modificadores e não escolhe silenciosamente qual valor é efetivo.

## Autoridade canônica

```text
Character.traits
```

é a autoridade persistente.

As coleções históricas:

```text
Character.advantages
Character.perks
Character.disadvantages
Character.quirks
```

permanecem temporariamente como projeções derivadas por `role`. Elas não constituem quatro agregados independentes.

## Estrutura

```js
{
  id,
  externalIds,
  role,
  source,
  name,
  notes,
  tags,
  points,
  levels,
  pointValue,
  modifiers,
  features,
  weapons,
  prereqs,
  importMeta,
  power,
  alternateGroupId,
  isPrimaryAlternative,
  raw,
}
```

`points` e `levels` continuam como campos de compatibilidade. A estrutura soberana de autoridades é `pointValue`.

## Identidade

`id` é soberano em toda a coleção de Traits.

O mesmo ID não pode aparecer em papéis diferentes.

```text
nome ≠ identidade
posição ≠ identidade
papel ≠ identidade
```

`externalIds` preserva identidades externas sem substituir o ID soberano.

## Papéis

Papéis conhecidos:

```text
advantage
perk
disadvantage
quirk
```

O vocabulário permanece aberto. Papel desconhecido é preservado no agregado canônico e não é forçado para uma das quatro projeções históricas.

```text
não reconhecido ≠ inválido
```

## Origem

Cada Trait possui:

```js
source: {
  kind,
  provider,
  format,
  reference,
  version,
}
```

Traits criados na SINGULAR usam `kind: "singular"`.

Dados importados preservam provedor e referência quando disponíveis. `importMeta` e `raw` continuam intactos para evidência e retrocompatibilidade.

## DOM-TRAIT-1.0 — Fundação

Estabelece:

- `Character.traits` como autoridade única;
- papéis conhecidos e papéis futuros preservados;
- identidade global entre papéis;
- origem estruturada;
- imutabilidade profunda;
- quatro projeções históricas derivadas;
- conversão de entradas legadas;
- save/load canônico.

Documento decisório: ADR-0035.

## DOM-TRAIT-1.1 — Autoridades de valor em pontos

Cada Trait possui:

```js
pointValue: {
  mode,
  basePoints,
  pointsPerLevel,
  levels,
  legacyPoints,
  declaredPoints,
  importedPoints,
  calculatedPoints,
  complete,
  reconciliation: {
    status,
    differences: {
      importedMinusDeclared,
      calculatedMinusDeclared,
      calculatedMinusImported,
    },
  },
}
```

### Modos conhecidos

```text
unknown
total
per-level
base-plus-levels
```

O vocabulário de modo é preservável, mas apenas os modos conhecidos recebem avaliação de completude.

### Autoridades separadas

```text
legacyPoints      → evidência da projeção histórica

declaredPoints    → declaração local ou explícita
importedPoints    → valor preservado da fonte externa
calculatedPoints  → resultado fornecido por uma autoridade calculadora
```

Nenhum desses valores sobrescreve outro.

`legacyPoints` não é promovido automaticamente quando a origem é desconhecida.

Quando a origem é `singular`, o valor legado inicial é reconhecido como declaração local.

Quando a origem é `imported`, `embedded` ou `external`, o valor legado inicial é reconhecido como evidência importada.

### Reconciliação

Estados:

```text
unknown
legacy-only
declared-only
imported-only
calculated-only
reconciled
divergent
```

`reconciled` exige igualdade entre todas as autoridades presentes.

`divergent` preserva as diferenças sem escolher vencedor.

```text
reconciliação ≠ precedência
reconciliação ≠ cálculo
```

Não existe `effectivePoints`.

### Declarações por nível

`basePoints`, `pointsPerLevel` e `levels` podem ser preservados mesmo sem total calculado.

```text
estrutura completa ≠ total calculado
```

Valores negativos e fracionários são permitidos porque o domínio não deve invalidar desvantagens, peculiaridades especiais ou regras de campanha apenas pelo sinal.

Documento decisório: ADR-0036.

## DOM-TRAIT-1.2 — Cálculo soberano do custo-base

`TraitBaseCost` avalia a estrutura de pontos sem alterar o Trait recebido.

### Fórmulas

```text
total             → custo fixo
per-level         → pointsPerLevel × levels
base-plus-levels  → basePoints + pointsPerLevel × levels
```

No modo `total`, `basePoints` é a declaração estrutural preferencial do custo fixo.

Na ausência de `basePoints`, uma autoridade declarada ou importada pode fornecer o custo fixo. Quando ambas existem, precisam concordar.

`legacyPoints` isolado continua apenas como evidência e não é promovido a cálculo.

`basePoints` isolado infere `mode: total` e satisfaz a completude estrutural do modo fixo.

### Estados da avaliação

```text
ready
incomplete
conflict
unsupported
```

- `ready`: fórmula conhecida e entradas suficientes;
- `incomplete`: entradas obrigatórias ausentes;
- `conflict`: autoridades fixas declarada e importada divergem sem estrutura independente;
- `unsupported`: modo desconhecido ou futuro preservado sem cálculo inventado.

Somente `ready` expõe `rawPoints` e `calculatedPoints`.

### Arredondamento

```text
rounding.policy = none
```

O custo-base preserva integralmente resultados negativos e fracionários.

Nenhum arredondamento ocorre antes da interpretação dos modificadores. A regra de arredondamento do custo final pertence ao bloco proprietário de enhancements, limitations e demais modificadores.

### Aplicação

`withTraitCalculatedBaseCost`:

1. exige avaliação `ready`;
2. serializa o Trait sem mutar o original;
3. grava o resultado em `pointValue.calculatedPoints`;
4. reconstrói o agregado;
5. refaz a reconciliação.

Avaliações incompletas, conflitantes ou não suportadas não são aplicadas.

Documento decisório: ADR-0037.

## Compatibilidade

Entradas antigas que fornecem somente as quatro coleções são convertidas para `traits`.

Quando uma representação canônica e suas projeções equivalentes aparecem juntas, a representação canônica permanece autoridade.

Durante a migração, uma coleção histórica explicitamente alterada substitui apenas o papel correspondente ao reconstruir o Character.

Dados exclusivamente canônicos, como `source` e `pointValue`, são preservados por identidade.

Quando código legado altera `points`:

- em Trait singular, a declaração local é atualizada;
- em Trait importado, o valor importado original permanece e a edição vira declaração local;
- o sentinela `mode: unknown` é reinferido quando a edição passa a fornecer pontos;
- a divergência é registrada, não apagada;
- `calculatedPoints` permanece intacto até uma aplicação explícita do calculador.

Depois da reconstrução:

```text
traits
→ projeções novamente derivadas
```

Divergência posterior causada por mutação direta é detectada por validação.

## Imutabilidade

Traits canônicos, `pointValue` e avaliações de custo-base são profundamente imutáveis e clonam os dados recebidos.

Objetos pertencentes ao chamador não são congelados.

Operações produzem novo agregado ou novo Character, nunca modificam o Trait original.

## Serialização

`serializeCharacter` persiste:

```text
traits                → autoridade canônica
advantages            → projeção de compatibilidade
perks                  → projeção de compatibilidade
disadvantages         → projeção de compatibilidade
quirks                 → projeção de compatibilidade
```

`traits` preserva `pointValue`, autoridades, diferenças, origem e dados desconhecidos.

As projeções históricas mantêm a forma anterior e não expõem `pointValue`.

Resultados aplicados em `calculatedPoints` sobrevivem a save/load e são reconciliados novamente na reconstrução.

No round trip, representações equivalentes são unificadas.

A remoção das projeções persistidas exige migração explícita e não pertence ao DOM-TRAIT-1.2.

## Relação com Templates

Templates declaram contribuições de domínio `trait`.

Quando um Template é aplicado, componentes projetados nas coleções históricas são absorvidos por `Character.traits` durante a reconstrução do agregado.

DOM-TEMPLATE permanece fechado. A interpretação mecânica do Trait pertence a DOM-TRAIT.

## Relação com Morfose e Forma Alternativa

Resolvers existentes podem continuar lendo `Character.advantages` como projeção estável.

Nenhum vínculo passa a ser realizado por nome além das regras já congeladas nesses domínios.

## Relação com Point Ledger

O Point Ledger ainda não deve calcular diretamente a partir de `points`.

DOM-TRAIT já estabelece:

- autoridades declarada, importada e calculada separadas;
- custo fixo estrutural;
- cálculo por níveis;
- reconciliação explicável.

Antes da abertura do Point Ledger, Traits ainda precisa estabelecer:

- interpretação de modificadores;
- grupos alternativos;
- autocontrole quando aplicável;
- autoridade final de custo após todas as regras proprietárias.

## Não responsabilidades

DOM-TRAIT-1.0 a 1.2 não:

- interpretam enhancements ou limitations;
- resolvem autocontrole;
- resolvem pré-requisitos;
- aplicam features a atributos ou perícias;
- criam ataques derivados;
- calculam grupos alternativos;
- escolhem um valor efetivo em caso de divergência;
- arredondam custo final modificado;
- agregam o total de pontos do Character;
- alteram DOM-TEMPLATE, Morfose ou Forma Alternativa;
- calculam na UI.

## Critério de conclusão do DOM-TRAIT-1.2

- custo fixo, por nível e base mais níveis avaliados pelo domínio;
- entradas ausentes e conflitos explícitos;
- modos futuros preservados como não suportados;
- política de ausência de arredondamento registrada;
- aplicação imutável somente para avaliação pronta;
- reconciliação refeita após aplicação;
- projeções históricas estáveis;
- save/load sem perda;
- suíte integral verde.
