# ADR-0036 — Autoridades de valor em pontos de Traits

**Status:** Aprovado  
**Data:** 2026-06-21  
**Bloco:** DOM-TRAIT-1.1

## Contexto

Traits possuíam os campos históricos `points` e `levels`, mas esses campos não distinguiam:

- valor digitado localmente;
- valor importado do GCS;
- valor calculado pelo motor;
- estrutura de custo por nível;
- divergência entre fontes.

Abrir o Point Ledger sobre esse campo único faria a agregação esconder conflitos e transformaria importação, edição e cálculo em uma autoridade indistinta.

## Decisão

### Estrutura soberana

Cada Trait recebe `pointValue`:

```js
{
  mode,
  basePoints,
  pointsPerLevel,
  levels,
  legacyPoints,
  declaredPoints,
  importedPoints,
  calculatedPoints,
  complete,
  reconciliation,
}
```

### Autoridades independentes

```text
declaredPoints
importedPoints
calculatedPoints
```

permanecem independentes.

Nenhuma autoridade sobrescreve outra e nenhuma precedência é inventada neste bloco.

### Evidência legada

`legacyPoints` preserva o valor exposto pelas coleções históricas.

Ele é classificado como declaração local somente quando a origem é `singular`.

Ele é classificado como valor importado quando a origem é `imported`, `embedded` ou `external`.

Origem desconhecida permanece `legacy-only`.

### Reconciliação

A reconciliação produz:

```text
unknown
legacy-only
declared-only
imported-only
calculated-only
reconciled
divergent
```

Diferenças numéricas são preservadas entre cada par de autoridades.

Não existe seleção de `effectivePoints`.

### Declarações por nível

`basePoints`, `pointsPerLevel` e `levels` podem ser armazenados sem calcular total.

`complete` descreve somente completude estrutural do modo declarado.

A fórmula de custo pertence a um bloco posterior.

### Compatibilidade com edições antigas

As projeções históricas continuam sem `pointValue`.

Quando código legado edita um Trait já existente por ID:

- campos canônicos ausentes na projeção são preservados;
- origem externa não é perdida;
- valor importado original não é sobrescrito;
- uma alteração local de `points` torna-se `declaredPoints`;
- resultados calculados existentes permanecem preservados;
- reconciliação é refeita na reconstrução do Character.

### Valores válidos

Valores negativos e fracionários são aceitos.

O domínio não presume que todo Trait seja uma vantagem positiva, nem que toda campanha use apenas níveis inteiros.

## Consequências

- o Point Ledger poderá agregar resultados sem destruir evidências;
- importação e edição local deixam de competir pelo mesmo campo;
- divergências tornam-se observáveis;
- dados por nível podem amadurecer sem cálculo prematuro;
- a projeção histórica permanece estável;
- save/load preserva as três autoridades;
- DOM-TEMPLATE, Morfose e Forma Alternativa permanecem fechados.

## Alternativas rejeitadas

### Continuar usando apenas `points`

Rejeitado porque mistura origem, declaração e cálculo.

### Fazer `calculatedPoints` sobrescrever `points`

Rejeitado porque apaga o valor importado e impede auditoria.

### Escolher automaticamente o valor mais recente

Rejeitado porque tempo de gravação não define autoridade mecânica.

### Calcular total por nível neste bloco

Rejeitado porque ainda não existem regras soberanas de modificadores, arredondamento e grupos alternativos.

### Tratar o valor importado como sempre correto

Rejeitado porque fontes externas podem estar desatualizadas, incompletas ou usar regras de campanha diferentes.

## Invariantes

1. `declaredPoints`, `importedPoints` e `calculatedPoints` são independentes.
2. Divergência nunca é resolvida por sobrescrita silenciosa.
3. Não existe `effectivePoints` no DOM-TRAIT-1.1.
4. `legacyPoints` é evidência de compatibilidade, não autoridade universal.
5. Declaração por nível não implica total calculado.
6. Valores negativos e fracionários são válidos.
7. Edição legada preserva origem e autoridades canônicas por ID.
8. Reconciliação é derivada e validada contra os valores atuais.
9. A UI não calcula.
10. O Point Ledger ainda não é aberto por esta decisão.
