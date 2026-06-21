# ADR-0037 — Cálculo soberano do custo-base de Traits

**Status:** Aprovado  
**Data:** 2026-06-21  
**Bloco:** DOM-TRAIT-1.2

## Contexto

DOM-TRAIT-1.1 separou declaração local, valor importado e resultado calculado, mas ainda não existia uma autoridade mecânica para produzir o custo-base de um Trait.

Sem essa autoridade, multiplicação por níveis, tratamento de custo fixo e arredondamento poderiam reaparecer na UI, no importador ou no Point Ledger.

## Decisão

### Avaliador proprietário

`TraitBaseCost` é a única autoridade deste bloco para avaliar o custo-base.

A avaliação é pura, imutável e explicável. Ela não altera o Trait recebido.

### Fórmulas reconhecidas

```text
total             → custo fixo
per-level         → pointsPerLevel × levels
base-plus-levels  → basePoints + pointsPerLevel × levels
```

No modo `total`, `basePoints` é a declaração estrutural preferencial do custo fixo.

Na ausência de `basePoints`, a avaliação pode usar `declaredPoints` ou `importedPoints` quando existe apenas uma dessas autoridades ou quando ambas concordam.

`legacyPoints` isolado permanece apenas evidência de compatibilidade e não é promovido a autoridade calculável.

Quando `declaredPoints` e `importedPoints` divergem sem `basePoints`, a avaliação não escolhe vencedora.

### Estados

```text
ready
incomplete
conflict
unsupported
```

- `ready`: fórmula conhecida e entradas suficientes;
- `incomplete`: faltam entradas soberanas;
- `conflict`: autoridades fixas divergem e não há estrutura independente;
- `unsupported`: modo desconhecido ou futuro.

Somente `ready` expõe `rawPoints` e `calculatedPoints`.

### Arredondamento

O custo-base usa política explícita:

```text
rounding.policy = none
```

Nenhum arredondamento ocorre antes da interpretação de modificadores.

Valores negativos e fracionários são preservados. A regra de arredondamento do custo final pertence ao bloco que aplicar enhancements, limitations e demais modificadores.

### Aplicação ao Trait

`withTraitCalculatedBaseCost` aplica somente uma avaliação `ready`.

A operação:

1. serializa o Trait sem mutá-lo;
2. grava o resultado em `pointValue.calculatedPoints`;
3. reconstrói o agregado;
4. recalcula a reconciliação entre autoridades.

Avaliações `incomplete`, `conflict` ou `unsupported` não podem ser aplicadas.

### Custo fixo estrutural

`basePoints` isolado passa a inferir `mode: total` e satisfaz a completude estrutural desse modo.

Isso permite representar custo fixo sem copiar previamente o valor para uma autoridade reconciliável.

## Consequências

- multiplicação por níveis deixa de pertencer a consumidores;
- conflitos entre custo declarado e importado não são escondidos;
- evidência legada não ganha autoridade por acidente;
- `calculatedPoints` pode ser produzido e reconciliado sem criar `effectivePoints`;
- modos futuros continuam preservados sem cálculo inventado;
- o próximo bloco pode interpretar modificadores sobre uma base explicável.

## Não responsabilidades

DOM-TRAIT-1.2 não:

- interpreta enhancements ou limitations;
- resolve autocontrole;
- calcula grupos alternativos;
- escolhe precedência em divergências;
- arredonda custo final;
- agrega pontos do Character;
- altera DOM-TEMPLATE, Morfose ou Forma Alternativa;
- calcula na UI.

## Critérios de aceitação

- custo fixo, por nível e base mais níveis avaliados;
- estados incompleto, conflito e não suportado explícitos;
- ausência de arredondamento registrada no resultado;
- aplicação imutável somente para avaliações prontas;
- reconciliação refeita após aplicação;
- save/load preservando resultado calculado;
- suíte integral verde.
