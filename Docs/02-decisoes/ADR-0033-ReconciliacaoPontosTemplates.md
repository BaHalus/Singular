# ADR-0033 — Reconciliação de pontos de Templates

**Status:** Aprovado  
**Data:** 2026-06-21  
**Bloco:** DOM-TEMPLATE-1.4

## Contexto

Templates já preserva `importedPoints` e `calculatedPoints`, mas faltava uma autoridade para explicar a relação entre eles sem substituir silenciosamente um valor divergente.

O domínio também precisa reconciliar composições com dependências, inclusive quando parte dos valores ainda é desconhecida.

## Decisão

### Autoridades separadas

```text
importedPoints
→ valor declarado pela fonte externa ou manual

calculatedPoints
→ valor declarado por uma autoridade calculadora
```

Nenhum campo prevalece ou sobrescreve o outro dentro de Templates.

### Diferença

```text
difference = calculatedPoints - importedPoints
```

A diferença só existe quando ambos são conhecidos. O valor absoluto também é exposto.

### Estados

```text
unknown
imported-only
calculated-only
partial
reconciled
divergent
```

`reconciled` exige igualdade exata. `divergent` preserva os dois valores e produz aviso.

### Composição

A reconciliação de pacote usa a ordem resolvida pelo DOM-TEMPLATE-1.2.

- total importado só existe quando todos os valores importados existem;
- total calculado só existe quando todos os valores calculados existem;
- subtotais conhecidos permanecem visíveis em composições parciais;
- divergências individuais permanecem visíveis mesmo quando os totais coincidem.

### Registro imutável

`withTemplateCalculatedPoints` cria novo Template com o valor calculado recebido. O valor importado é preservado.

O módulo não executa cálculo. Ele registra e compara o resultado produzido por outra autoridade.

### Relação com Point Ledger

DOM-TEMPLATE-1.4 não é o ledger global. O futuro DOM-POINTS agregará o personagem e decidirá como os valores reconciliados participam do orçamento.

## Consequências

- importação divergente nunca é ocultada;
- a UI pode apresentar valor importado, calculado e diferença sem somar localmente;
- composições incompletas continuam explicáveis;
- custos negativos são preservados;
- save/load continua usando os campos canônicos de Template;
- DOM-TEMPLATE-1.5 pode fechar importação sem misturar reconciliação com parsing.

## Invariantes

1. Valor importado e calculado permanecem separados.
2. Divergência não altera nenhum deles.
3. Diferença só existe com ambos conhecidos.
4. Valores negativos são válidos.
5. Totais incompletos permanecem `null`.
6. Subtotais conhecidos não são descartados.
7. A composição não recalcula componentes.
8. O resultado é imutável.
9. A UI não calcula.
10. O ledger global permanece responsabilidade futura de DOM-POINTS.

## Alternativas rejeitadas

### Preferir automaticamente o calculado

Rejeitada porque apagaria evidência da importação.

### Preferir automaticamente o importado

Rejeitada porque ocultaria o resultado do motor.

### Usar zero para valor ausente

Rejeitada porque ausência não equivale a custo zero.

### Somar apenas valores conhecidos como total final

Rejeitada porque apresentaria subtotal parcial como total completo.

## Continuidade

```text
DOM-TEMPLATE-1.5 — Importação e fechamento
```
