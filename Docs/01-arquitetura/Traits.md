# Traits — Domínio soberano

**Código:** DOM-TRAIT-1.0 a 1.4  
**Status:** Implementado mediante CI canônica verde  
**Camada:** Domain  
**Tipo:** Agregado canônico, identidade, papéis, autoridades de valor, custo-base, modificadores, controles e escolhas  
**Decisões:** ADR-0035 a ADR-0039

Traits representa vantagens, qualidades, desvantagens, peculiaridades e futuras categorias compatíveis sem manter quatro autoridades persistentes independentes.

## Regra central

```text
Trait declara identidade, papel, origem, evidências de valor, modificadores, controles e escolhas.
O domínio proprietário calcula quando possuir regra suficiente.
O Point Ledger agrega somente resultados autorizados.
A UI apresenta e despacha intenção.
```

DOM-TRAIT-1.0 a 1.4 calcula o custo individual após custo-base, modificadores, autocontrole e frequência. Grupos alternativos e a promoção da autoridade final persistida permanecem em etapa posterior. Nenhuma etapa escolhe silenciosamente qual autoridade divergente deve vencer.

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
  selfControl,
  frequency,
  roundCostDown,
  choices,
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

`modifiers` é a autoridade declarativa dos modificadores. Projeções normalizadas usadas no cálculo são derivadas e não persistem uma segunda coleção canônica.

`selfControl`, `frequency`, `roundCostDown` e `choices` são declarações canônicas. Os aliases GCS correspondentes são consumidos somente na fronteira.

## Identidade

`id` é soberano em toda a coleção de Traits.

O mesmo ID não pode aparecer em papéis diferentes.

```text
nome ≠ identidade
posição ≠ identidade
papel ≠ identidade
```

`externalIds` preserva identidades externas sem substituir o ID soberano.

Escolhas também possuem identidade explícita por `key`:

```text
chave da escolha ≠ nome
chave da escolha ≠ posição
```

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

Nenhum arredondamento ocorre antes da interpretação dos modificadores.

### Aplicação

`withTraitCalculatedBaseCost`:

1. exige avaliação `ready`;
2. serializa o Trait sem mutar o original;
3. grava o resultado em `pointValue.calculatedPoints`;
4. reconstrói o agregado;
5. refaz a reconciliação.

Avaliações incompletas, conflitantes ou não suportadas não são aplicadas.

Documento decisório: ADR-0037.

## DOM-TRAIT-1.3 — Interpretação soberana de modificadores

`TraitModifierCost` consome o resultado de `TraitBaseCost` e interpreta somente modificadores de custo conhecidos.

A avaliação permanece pura, imutável e explicável. Ela não altera o Trait e não persiste uma projeção normalizada de modificadores.

### Tipos reconhecidos

```text
addition
percentage
percentage-multiplier
multiplier
textual
container
unsupported
```

- `addition`: ajuste plano em pontos;
- `percentage`: enhancement ou limitation;
- `percentage-multiplier`: multiplicador expresso em percentual;
- `multiplier`: multiplicador direto;
- `textual`: informação sem efeito mecânico;
- `container`: agrupamento estrutural;
- `unsupported`: declaração mecânica não compreendida.

Modificadores textuais e desabilitados são preservados e não afetam o custo. Um modificador mecânico desconhecido e habilitado bloqueia a avaliação em vez de receber uma fórmula inventada.

### Escopos

```text
total
base
levels
```

Percentuais `total` atingem as parcelas base e por níveis.

Adições `levels` alteram o custo unitário por nível antes da multiplicação. Adições `base` e `total` alteram a parcela-base.

### Ordem mecânica

```text
1. custo-base estrutural
2. adições planas
3. percentuais
4. multiplicadores
5. arredondamento configurável da avaliação isolada
```

Quando consumido por `TraitFinalCost`, o avaliador usa `rounding: none` e entrega a fração integral à etapa seguinte.

### Percentuais

O padrão é aditivo:

```text
enhancements + limitations
```

O modo multiplicativo é uma política explícita:

```text
(1 + enhancements) × (1 + limitations)
```

A limitation agregada aplicável a cada parcela é limitada a `-80%`.

### Modificadores por nível

O valor de um modificador pode ser escalado por seus próprios `levels` ou pelos níveis do Trait quando `use_level_from_trait` estiver declarado.

### Compatibilidade de formato

A projeção derivada reconhece estruturas atuais do GCS, aliases camelCase necessários e a forma histórica `cost` + `cost_type`.

```text
compatibilidade de leitura ≠ schema canônico paralelo
```

O importador continua preservando dados. O cálculo pertence exclusivamente ao domínio de Traits.

Documento detalhado: `TraitModifierCost.md`.  
Documento decisório: ADR-0038.

## DOM-TRAIT-1.4 — Autocontrole, frequência, escolhas e custo individual

### Controles

`TraitControl` normaliza e valida as tabelas soberanas de autocontrole e frequência.

Testes reconhecidos de autocontrole:

```text
0, 1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
```

Testes reconhecidos de frequência:

```text
0, 6, 9, 12, 15, 18
```

Valores desconhecidos são preservados como `unsupported`; nenhuma aproximação é inventada.

`cr_adj` é uma consequência operacional e não altera o custo em pontos. Ajuste operacional desconhecido não bloqueia o custo quando o multiplicador de autocontrole é conhecido.

### Escolhas

`Trait.choices` mantém declarações explícitas por chave:

```js
{
  key,
  value,
  required,
}
```

`TraitChoices` expõe os estados `ready` e `incomplete`, além das chaves obrigatórias ainda sem valor. O mapa externo `replacements` é convertido na fronteira, sem persistir um schema paralelo.

### Custo individual

`TraitFinalCost` compõe:

```text
1. custo-base
2. modificadores sem arredondamento intermediário
3. multiplicador de autocontrole
4. multiplicador de frequência
5. arredondamento final por roundCostDown
```

Estados incompletos, conflitantes ou não suportados são propagados. O resultado é puro, profundamente imutável e explicável.

DOM-TRAIT-1.4 ainda não grava esse valor em `pointValue.calculatedPoints`, pois grupos alternativos precisam definir a contribuição entre Traits antes da promoção da autoridade final.

```text
custo individual completo ≠ contribuição final do grupo
```

Documento detalhado: `TraitFinalCost.md`.  
Documento decisório: ADR-0039.

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
- `calculatedPoints` permanece intacto até uma aplicação explícita de uma autoridade calculadora.

Aliases GCS de controle e escolha são reconhecidos na fronteira:

```text
cr
cr_adj
frequency
round_down
replacements
```

A serialização canônica usa `selfControl`, `frequency`, `roundCostDown` e `choices`. Quando esses campos estão ausentes ou neutros, as projeções históricas conservam sua forma anterior.

Depois da reconstrução:

```text
traits
→ projeções novamente derivadas
```

Divergência posterior causada por mutação direta é detectada por validação.

## Imutabilidade

Traits canônicos, `pointValue`, controles, escolhas e avaliações de custo são profundamente imutáveis e clonam os dados recebidos.

Objetos pertencentes ao chamador não são congelados.

Operações produzem novo agregado ou nova avaliação, nunca modificam o Trait original.

## Serialização

`serializeCharacter` persiste:

```text
traits                → autoridade canônica
advantages            → projeção de compatibilidade
perks                  → projeção de compatibilidade
disadvantages         → projeção de compatibilidade
quirks                 → projeção de compatibilidade
```

`traits` preserva `pointValue`, autoridades, diferenças, origem, modificadores, controles, escolhas e dados desconhecidos.

As projeções históricas mantêm a forma anterior quando os novos campos têm valores neutros e não expõem `pointValue`.

Resultados aplicados em `pointValue.calculatedPoints` sobrevivem a save/load e são reconciliados novamente na reconstrução.

Avaliações derivadas de `TraitModifierCost` e `TraitFinalCost` não são automaticamente persistidas.

No round trip, representações equivalentes são unificadas.

A remoção das projeções persistidas exige migração explícita e não pertence ao DOM-TRAIT-1.4.

## Relação com Templates

Templates declaram contribuições de domínio `trait`.

Quando um Template é aplicado, componentes projetados nas coleções históricas são absorvidos por `Character.traits` durante a reconstrução do agregado.

DOM-TEMPLATE permanece fechado. A interpretação mecânica do Trait pertence a DOM-TRAIT.

## Relação com Morfose e Forma Alternativa

Resolvers existentes podem continuar lendo `Character.advantages` como projeção estável.

Nenhum vínculo passa a ser realizado por nome além das regras já congeladas nesses domínios.

## Relação com Point Ledger

O Point Ledger ainda não deve calcular diretamente a partir de `points`, reinterpretar `modifiers` nem repetir tabelas de controle.

DOM-TRAIT já estabelece:

- autoridades declarada, importada e calculada separadas;
- custo fixo estrutural;
- cálculo por níveis;
- reconciliação explicável;
- interpretação de adições, percentuais e multiplicadores;
- limitação percentual;
- autocontrole e frequência;
- escolhas explícitas por chave;
- custo individual com arredondamento final único.

Antes da abertura do Point Ledger, Traits ainda precisa estabelecer:

- grupos alternativos;
- autoridade final persistida após todas as regras proprietárias.

## Não responsabilidades

DOM-TRAIT-1.0 a 1.4 não:

- resolve pré-requisitos;
- aplica features a atributos ou perícias;
- cria ataques derivados;
- calcula grupos alternativos;
- escolhe um valor efetivo em caso de divergência;
- promove o custo individual a autoridade final persistente;
- agrega o total de pontos do Character;
- altera DOM-TEMPLATE, Morfose ou Forma Alternativa;
- calcula na UI.

## Critério de conclusão do DOM-TRAIT-1.4

- tabelas de autocontrole e frequência pertencem ao domínio;
- ajustes operacionais permanecem separados do custo;
- escolhas explícitas são identificadas por chave;
- aliases externos são consumidos apenas na fronteira;
- custo individual usa modificadores sem arredondamento intermediário;
- multiplicadores de autocontrole e frequência são aplicados na ordem soberana;
- arredondamento final positivo e negativo respeita `roundCostDown`;
- estados incompleto, conflito e não suportado são propagados;
- nenhuma autoridade persistente prematura ou pipeline paralelo é criado;
- projeções históricas permanecem estáveis quando os campos são neutros;
- suíte integral verde.
