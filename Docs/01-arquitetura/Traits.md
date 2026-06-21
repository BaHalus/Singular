# Traits — Domínio soberano

**Código:** DOM-TRAIT-1.0 a 1.2  
**Status:** Implementado mediante CI canônica verde  
**Camada:** Domain  
**Tipo:** Agregado canônico, identidade, papéis, autoridades de valor e cálculo-base  
**Decisões:** ADR-0035 a ADR-0037

Traits representa vantagens, qualidades, desvantagens, peculiaridades e futuras categorias compatíveis sem manter quatro autoridades persistentes independentes.

## Regra central

```text
Trait declara identidade, papel, origem e evidências de valor.
O domínio proprietário calcula quando possuir regra suficiente.
O Point Ledger agrega somente resultados autorizados.
A UI apresenta e despacha intenção.
```

DOM-TRAIT-1.0 a 1.2 calculam somente o custo-base autorizado. Não aplicam modificadores, não calculam custo final e não escolhem silenciosamente qual valor é efetivo.

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
  baseCostCalculation,
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

O vocabulário de modo é preservável, mas apenas os modos conhecidos recebem avaliação de completude e cálculo-base soberano.

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

Não existe `effectivePoints` neste bloco.

### Declarações por nível

`basePoints`, `pointsPerLevel` e `levels` podem ser preservados mesmo sem total calculado.

```text
estrutura completa ≠ total calculado
```

DOM-TRAIT-1.1 marca a completude estrutural. DOM-TRAIT-1.2 executa a fórmula de custo-base quando houver entradas suficientes.

Valores negativos e fracionários são permitidos porque o domínio não deve invalidar desvantagens, peculiaridades especiais ou regras de campanha apenas pelo sinal.

## DOM-TRAIT-1.2 — Cálculo soberano do custo-base

O custo-base é calculado por uma autoridade pura e explicável nos modos:

```text
total
per-level
base-plus-levels
```

Fórmulas:

```text
total            = custo fixo declarado
per-level        = pointsPerLevel × levels
base-plus-levels = basePoints + pointsPerLevel × levels
```

`importedPoints` nunca é promovido automaticamente a fórmula.

O resultado aplicado ao Trait é persistido em `pointValue.baseCostCalculation` com:

- versão do schema;
- modo e entradas consumidas;
- fingerprint das entradas;
- valor bruto;
- valor após arredondamento;
- política e incremento de arredondamento;
- diagnósticos.

O padrão de arredondamento é `none`, preservando frações até que uma regra posterior determine outra política.

Um snapshot persistido deve estar calculado e continuar compatível com as entradas atuais. Snapshot adulterado ou obsoleto é rejeitado durante a validação canônica.

Operações autorizadas:

```js
withTraitBaseCostCalculation(trait, options)
recalculateTraitBaseCost(character, traitId, options)
```

A operação de Character é atômica, localiza o Trait pelo ID soberano, reconstrói o agregado uma única vez e retorna recibo auditável.

Documento: `TraitBaseCost.md`.  
Documento decisório: ADR-0037.

## Compatibilidade

Entradas antigas que fornecem somente as quatro coleções são convertidas para `traits`.

Quando uma representação canônica e suas projeções equivalentes aparecem juntas, a representação canônica permanece autoridade.

Durante a migração, uma coleção histórica explicitamente alterada substitui apenas o papel correspondente ao reconstruir o Character.

Dados exclusivamente canônicos, como `source` e `pointValue`, são preservados por identidade.

Quando código legado altera `points`:

- em Trait singular, a declaração local é atualizada;
- em Trait importado, o valor importado original permanece e a edição vira declaração local;
- a divergência é registrada, não apagada;
- se uma entrada do cálculo-base mudar, `baseCostCalculation` é invalidado;
- `calculatedPoints` é limpo somente quando era o resultado daquele snapshot derivado;
- autoridades independentes, especialmente `importedPoints`, permanecem intactas.

A mesma invalidação ocorre quando uma edição legada altera `levels` usado pelo cálculo-base.

Edições que não alteram entradas do cálculo, como mudança de nome ou notas, preservam o snapshot atual.

Depois da reconstrução:

```text
traits
→ projeções novamente derivadas
```

Divergência posterior causada por mutação direta é detectada por validação.

## Imutabilidade

Traits canônicos e `pointValue` são profundamente imutáveis e clonam os dados recebidos.

Objetos pertencentes ao chamador não são congelados.

Operações futuras deverão produzir novo agregado ou novo Character, nunca modificar o Trait original.

## Serialização

`serializeCharacter` persiste:

```text
traits                → autoridade canônica
advantages            → projeção de compatibilidade
perks                  → projeção de compatibilidade
disadvantages         → projeção de compatibilidade
quirks                 → projeção de compatibilidade
```

`traits` preserva `pointValue`, autoridades, reconciliação, cálculo-base, origem e dados desconhecidos.

As projeções históricas mantêm a forma anterior e não expõem `pointValue`.

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

Antes de sua abertura, Traits ainda precisa estabelecer:

- interpretação de modificadores;
- grupos alternativos;
- autocontrole quando aplicável;
- autoridade final de custo calculado.

DOM-TRAIT-1.2 fornece um custo-base calculado e auditável. Modificadores e demais regras continuam em blocos posteriores.

## Não responsabilidades

DOM-TRAIT-1.0 a 1.2 não:

- calculam custo final após modificadores;
- interpretam enhancements ou limitations;
- resolvem autocontrole;
- resolvem pré-requisitos;
- aplicam features a atributos ou perícias;
- criam ataques derivados;
- calculam grupos alternativos;
- escolhem um valor efetivo em caso de divergência;
- agregam o total de pontos do Character;
- alteram DOM-TEMPLATE, Morfose ou Forma Alternativa;
- calculam na UI.

## Critério de conclusão do DOM-TRAIT-1.2

- autoridades declarada, importada e calculada separadas;
- evidência legada preservada;
- reconciliação explicável e diferenças explícitas;
- modos `total`, `per-level` e `base-plus-levels` calculados soberanamente;
- arredondamento explícito e padrão sem truncamento;
- snapshot auditável e validado contra suas entradas;
- edição estrutural legada invalida somente o resultado derivado;
- edições não estruturais preservam o cálculo atual;
- projeções históricas estáveis;
- save/load sem perda;
- suíte integral verde.
