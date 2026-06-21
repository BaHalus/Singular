# ADR-0037 — Cálculo soberano do custo-base de Traits

**Status:** Aprovado  
**Data:** 2026-06-21  
**Bloco:** DOM-TRAIT-1.2

## Contexto

DOM-TRAIT-1.1 separou valores declarados, importados e calculados, mas ainda não havia uma autoridade para produzir `calculatedPoints` a partir de custos fixos ou por nível.

Calcular modificadores no mesmo passo misturaria duas mecânicas distintas e tornaria impossível explicar qual parte do resultado veio da fórmula-base.

## Decisão

### Escopo

DOM-TRAIT-1.2 calcula somente:

```text
total
per-level
base-plus-levels
```

O resultado é anterior a modificadores, grupos alternativos e autocontrole.

### Autoridade das entradas

O cálculo usa declarações estruturais:

```text
declaredPoints
basePoints
pointsPerLevel
levels
```

`importedPoints` não é usado como fórmula. Ele permanece uma autoridade externa a ser reconciliada com o resultado.

### Arredondamento explícito

O padrão do cálculo-base é `none`. Assim, frações não são descartadas antes do bloco de modificadores.

Qualquer arredondamento deve declarar política e incremento. A escolha é persistida no snapshot.

### Snapshot

O cálculo bem-sucedido pode ser persistido em `pointValue.baseCostCalculation`. O snapshot contém entradas, fingerprint, valor bruto, valor resultante, arredondamento e diagnósticos.

A validação recomputa o resultado. Snapshot alterado ou incompatível com as entradas atuais é rejeitado.

### Aplicação

A operação de Character é síncrona e atômica. Não será criado planner, porque não há decisão assíncrona nem dependência externa entre análise e execução.

### Valores

Custos negativos e fracionários permanecem válidos. O domínio não presume papel positivo nem níveis exclusivamente inteiros.

## Consequências

- `calculatedPoints` passa a ter origem mecânica explicável;
- importação não é confundida com cálculo;
- arredondamento deixa de ser implícito;
- modificadores poderão consumir `rawPoints` ou o custo-base registrado;
- snapshots obsoletos são detectados;
- o Point Ledger continua fechado.

## Alternativas rejeitadas

### Usar `importedPoints` quando faltar declaração

Rejeitado porque transformaria evidência externa em regra sem autorização.

### Arredondar sempre para inteiro

Rejeitado porque o arredondamento final pode depender de modificadores ou regras de campanha.

### Calcular modificadores no mesmo módulo

Rejeitado porque criaria uma autoridade composta difícil de auditar.

### Criar planner para cada recálculo

Rejeitado porque o cálculo é puro, local e síncrono.

## Invariantes

1. O cálculo-base não interpreta modificadores.
2. Valor importado nunca vira fórmula automaticamente.
3. Toda política de arredondamento é explícita.
4. O padrão preserva frações.
5. O snapshot contém fingerprint das entradas.
6. Snapshot persistido deve estar calculado e atual.
7. A operação no Character é atômica.
8. Não existe `effectivePoints` neste bloco.
9. O Point Ledger não é aberto.
10. A UI não calcula.
