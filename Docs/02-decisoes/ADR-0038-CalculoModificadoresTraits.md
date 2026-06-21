# ADR-0038 — Interpretação soberana dos modificadores de Traits

**Status:** Proposto  
**Data:** 2026-06-21  
**Bloco:** DOM-TRAIT-1.3

## Contexto

DOM-TRAIT-1.2 tornou o custo-base de Traits calculável e explicável, mas `Trait.modifiers` continuava apenas como payload preservado.

Sem um avaliador proprietário, enhancements, limitations, adições e multiplicadores poderiam ser interpretados de formas divergentes pelo importador, pela UI ou pelo Point Ledger.

Também era necessário manter compatibilidade com estruturas atuais e históricas do GCS sem transformar esse formato externo em uma segunda autoridade canônica.

## Decisão

### Avaliador proprietário

`TraitModifierCost` é a única autoridade deste bloco para interpretar o impacto mecânico conhecido de `Trait.modifiers` sobre `TraitBaseCost`.

O avaliador é puro, imutável e explicável. Ele não altera o Trait recebido e não persiste uma coleção paralela de modificadores.

### Autoridade declarativa

```text
Trait.modifiers = autoridade declarativa
projeção normalizada = derivação para cálculo
```

A projeção aceita aliases necessários para consumir estruturas existentes, preserva o payload bruto e não reescreve a origem.

### Tipos mecânicos

São reconhecidos:

```text
addition
percentage
percentage-multiplier
multiplier
```

Itens textuais e contêineres são preservados sem efeito mecânico próprio.

Expressões declaradas como mecânicas, mas não compreendidas, produzem estado `unsupported`. O domínio não inventa fórmulas.

### Escopos

```text
total
base
levels
```

Percentuais `total` afetam as parcelas base e por níveis. Adições `levels` alteram o custo unitário por nível antes da multiplicação; adições `base` ou `total` alteram a parcela-base.

### Ordem

```text
1. custo-base
2. adições planas
3. percentuais
4. multiplicadores
5. arredondamento
```

Essa ordem é explícita e auditável.

### Percentuais

A política padrão é aditiva:

```text
enhancements + limitations
```

A política multiplicativa pode ser solicitada explicitamente:

```text
(1 + enhancements) × (1 + limitations)
```

A soma de limitations aplicável a cada parcela é limitada a `-80%`.

### Níveis do modificador

O valor do modificador pode ser escalado pelos próprios `levels` ou pelos níveis do Trait quando `use_level_from_trait` estiver declarado.

### Arredondamento

O padrão é `up`, compatível com a semântica de custo ajustado usada pelo formato de origem:

- positivos fracionários avançam para o inteiro superior;
- negativos fracionários avançam em direção a zero.

Também são suportados `down` e `none` como políticas explícitas e registradas na avaliação.

### Compatibilidade GCS

O avaliador reconhece:

- `cost_adj`, `affects`, `levels`, `use_level_from_trait`, `disabled` e `children`;
- aliases camelCase usados internamente;
- a forma histórica `cost` + `cost_type`.

A compatibilidade ocorre no projetor derivado. O importador continua responsável apenas por preservar dados; ele não calcula custo.

### Estado e persistência

A avaliação usa os estados:

```text
ready
incomplete
conflict
unsupported
```

DOM-TRAIT-1.3 não promove o resultado modificado a `pointValue.calculatedPoints`, porque autocontrole, frequência, grupos alternativos e a autoridade final de custo ainda pertencem a blocos posteriores.

## Consequências

- modificadores deixam de ser interpretados por consumidores;
- a UI continua sem matemática;
- formatos externos permanecem evidência, não autoridade paralela;
- base e níveis podem receber efeitos distintos;
- limitações excessivas não reduzem uma parcela além de `-80%`;
- desconhecidos ativos bloqueiam o cálculo sem perda de dados;
- a etapa seguinte pode compor regras posteriores sobre um resultado já explicável.

## Não responsabilidades

DOM-TRAIT-1.3 não:

- resolve autocontrole ou frequência;
- calcula grupos alternativos;
- grava custo final no Trait;
- escolhe entre autoridades divergentes;
- agrega pontos do Character;
- altera DOM-TEMPLATE, Morfose ou Forma Alternativa;
- calcula na UI.

## Critérios de aceitação

- adições, percentuais e multiplicadores calculados pelo domínio;
- escopos base, níveis e total separados;
- modo percentual aditivo padrão e multiplicativo explícito;
- limitation limitada a `-80%`;
- níveis de modificador interpretados;
- arredondamento explícito e auditável;
- formas GCS atuais e históricas consumidas por projeção;
- textuais e desabilitados preservados sem efeito;
- desconhecidos ativos retornando `unsupported`;
- nenhuma autoridade persistente paralela;
- suíte integral verde.
