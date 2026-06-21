# TraitModifierCost — Interpretação soberana de modificadores

**Código:** DOM-TRAIT-1.3  
**Status:** Proposto  
**Camada:** Domain  
**Autoridade de entrada:** `Trait.modifiers` e `TraitBaseCost`  
**Resultado:** avaliação derivada, imutável e explicável  
**Decisão:** ADR-0038

## Objetivo

Interpretar os modificadores de custo pertencentes a um Trait depois do cálculo-base e antes de autocontrole, frequência, grupos alternativos e Point Ledger.

```text
Trait declara modificadores.
TraitBaseCost calcula a base.
TraitModifierCost interpreta o impacto mecânico conhecido.
A UI apenas apresenta e despacha intenção.
```

DOM-TRAIT-1.3 não cria uma segunda coleção persistente de modificadores e não grava custo final no Trait. `Trait.modifiers` permanece a autoridade declarativa.

## Contrato

```js
evaluateTraitModifierCost(trait, {
  percentageMode: "additive",
  rounding: "up",
})
```

Retorna uma avaliação profundamente imutável com:

```js
{
  traitId,
  status,
  complete,
  baseCost,
  policy,
  modifiers,
  components: {
    base,
    levels,
  },
  multiplier,
  beforeMultiplier,
  rawPoints,
  calculatedPoints,
  rounding,
  diagnostics,
}
```

A avaliação é derivada. Ela pode ser serializada para inspeção, logs ou recibos, mas não substitui `Trait.modifiers` nem constitui autoridade persistente paralela.

## Estados

```text
ready
incomplete
conflict
unsupported
```

- `ready`: custo-base pronto e todos os modificadores mecânicos ativos reconhecidos;
- `incomplete`: o custo-base não possui entradas suficientes;
- `conflict`: as autoridades do custo-base divergem;
- `unsupported`: existe modo-base ou modificador mecânico ativo cuja semântica não é conhecida.

Somente `ready` expõe `rawPoints` e `calculatedPoints`.

## Projeção de modificadores

`projectTraitCostModifiers` percorre `Trait.modifiers`, inclusive contêineres, e produz uma projeção normalizada para cálculo.

Tipos reconhecidos:

```text
addition                → ajuste plano em pontos
percentage              → enhancement ou limitation percentual
percentage-multiplier   → multiplicador expresso em percentual
multiplier              → multiplicador direto
textual                 → informação preservada sem efeito mecânico
container               → agrupamento estrutural sem efeito próprio
unsupported             → declaração mecânica não reconhecida
```

A projeção preserva:

- identidade ou identidade determinística por caminho;
- nome;
- expressão de custo original;
- escopo de aplicação;
- estado habilitado;
- multiplicador por níveis;
- formato de origem;
- payload bruto clonado.

```text
normalização derivada ≠ nova autoridade persistente
```

## Formatos aceitos

### Estrutura GCS atual

```js
{
  cost_adj: "+20%",
  affects: "total",
  levels: 2,
  use_level_from_trait: false,
  disabled: false,
}
```

Também são aceitos aliases camelCase usados internamente pela SINGULAR.

### Estrutura GCS histórica

```js
{
  cost: 5,
  cost_type: "points",
}
```

Tipos históricos conhecidos são convertidos somente na projeção derivada.

### Estrutura explícita da SINGULAR

```js
{
  kind: "percentage",
  value: -20,
  affects: "levels",
}
```

### Texto

Strings sem sintaxe mecânica reconhecida e objetos sem campos de custo são tratados como informação textual. Expressões declaradas como custo, mas não compreendidas, produzem `unsupported` em vez de serem adivinhadas.

## Sintaxe de custo

```text
+5      → adição de 5 pontos
-2      → subtração de 2 pontos
+20%    → enhancement de 20%
-40%    → limitation de 40%
x2      → multiplicador direto 2
x50%    → multiplicador percentual 0,5
```

Vírgula decimal é aceita na entrada e normalizada para cálculo.

## Escopo

```text
total
base
levels
```

- `total`: percentual afeta as parcelas base e por níveis;
- `base`: afeta somente a parcela-base;
- `levels`: afeta somente a parcela por níveis.

Adições planas seguem a semântica de origem:

- `levels` altera o custo por nível antes da multiplicação pelos níveis;
- `base` e `total` alteram a parcela-base.

A distinção evita aplicar uma adição por nível como soma única ao custo completo.

## Ordem mecânica

A ordem canônica é:

```text
1. custo-base estrutural
2. adições planas
3. percentuais
4. multiplicadores
5. arredondamento final desta etapa
```

A ordem dos itens dentro da mesma categoria não altera o resultado porque os valores são agregados antes de sua aplicação.

## Percentuais

### Modo aditivo

Política padrão:

```text
percentual aplicado = enhancements + limitations
```

O total percentual não pode reduzir a parcela abaixo de `-80%`.

### Modo multiplicativo

Política opcional e explícita:

```text
parcela × (1 + enhancements) × (1 + limitations limitadas)
```

Enhancements e limitations permanecem acumulados separadamente. A limitation agregada continua limitada a `-80%` antes de formar seu fator.

A escolha entre políticas pertence ao contexto de regras da campanha. O avaliador não consulta preferências de UI nem variáveis globais ocultas.

## Modificadores por nível

Quando o modificador declara `levels`, seu valor mecânico é multiplicado por esse nível.

Quando declara `use_level_from_trait`, usa o nível estrutural do Trait.

Valor ausente, zero ou negativo não cria multiplicador inválido; a projeção usa fator 1, compatível com a semântica do formato de origem.

## Arredondamento

Políticas:

```text
up
 down
none
```

`up` é o padrão desta etapa:

- valores positivos fracionários avançam para o inteiro superior;
- valores negativos fracionários avançam em direção a zero.

`down` usa o inteiro inferior:

- valores positivos recuam;
- valores negativos tornam-se mais negativos.

`none` preserva a fração para diagnóstico ou políticas futuras.

O resultado registra entrada, saída, diferença e se houve aplicação efetiva.

## Modificadores desabilitados e textuais

Modificadores desabilitados são preservados na projeção, mas não participam do cálculo.

Modificadores textuais são mecanicamente neutros.

Um modificador mecânico desconhecido somente bloqueia a avaliação quando está habilitado.

```text
preservado ≠ aplicado
não reconhecido ≠ descartado
```

## Imutabilidade

O avaliador:

- não altera o Trait recebido;
- não congela objetos pertencentes ao chamador;
- clona payloads brutos preservados;
- retorna avaliação e projeções profundamente imutáveis.

## Relação com `pointValue.calculatedPoints`

DOM-TRAIT-1.2 já permite registrar explicitamente o custo-base calculado em `pointValue.calculatedPoints`.

DOM-TRAIT-1.3 não sobrescreve esse campo porque ainda faltam regras proprietárias do Trait, especialmente:

- autocontrole;
- frequência;
- grupos alternativos;
- definição formal da autoridade final de custo.

A promoção do resultado modificado a autoridade calculada exige etapa posterior própria. Até lá:

```text
TraitModifierCost.calculatedPoints = resultado derivado desta avaliação
Trait.pointValue.calculatedPoints  = autoridade persistente já existente
```

Esses conceitos não devem ser confundidos.

## Compatibilidade e origem

A compatibilidade com GCS ocorre por projeção interpretativa sobre `Trait.modifiers` já preservado.

Não existe parser paralelo de personagem, não há reescrita do payload importado e não há vinculação por nome.

Aliases aceitos servem para consumir estruturas já existentes, não para criar múltiplos schemas canônicos.

## Não responsabilidades

DOM-TRAIT-1.3 não:

- resolve autocontrole ou frequência;
- calcula grupos alternativos;
- escolhe entre autoridades divergentes;
- grava custo final no Trait;
- agrega pontos do Character;
- altera Templates, Morfose ou Forma Alternativa;
- aplica features ou pré-requisitos;
- executa expressões arbitrárias;
- consulta estado de UI;
- calcula na UI.

## Critério de conclusão

- custo-base consumido como única base mecânica;
- formatos atuais e históricos relevantes projetados sem mutar origem;
- adições, percentuais e multiplicadores explicáveis;
- escopos base, níveis e total distintos;
- modifiers por nível suportados;
- limitation limitada a `-80%`;
- modos percentual aditivo e multiplicativo explícitos;
- arredondamento final auditável;
- textos e itens desabilitados preservados sem efeito;
- desconhecidos ativos bloqueados sem adivinhação;
- nenhuma autoridade persistente paralela;
- suíte integral verde.
