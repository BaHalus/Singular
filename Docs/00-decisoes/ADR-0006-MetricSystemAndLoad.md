# ADR-0006 — Sistema Métrico e Base de Carga

**Status:** Aprovado  
**Camada:** Domain / Engine  
**Data:** 2026-06-18

---

## Contexto

A SINGULAR é uma ficha de GURPS em português e adotará o sistema métrico como padrão interno.

Bibliotecas GCS frequentemente armazenam peso em libras (`lb`). A SINGULAR deve importar esses valores, mas operar internamente em quilogramas.

Além disso, GURPS possui a vantagem ST de Levantamento, que modifica a ST usada para fins de carga, mas não necessariamente a ST usada para dano.

---

## Decisão

A SINGULAR armazenará e calculará pesos em quilogramas.

A unidade padrão interna de peso será:

```text
kg
```

Pesos vindos de fontes externas em libras serão convertidos durante importação ou normalização.

A conversão adotada será a convenção de GURPS:

```text
2 lb = 1 kg
```

Não será usada a conversão física real.

---

## Base de Carga

A Base de Carga será chamada de `basicLiftKg` no motor.

A fórmula em português/métrico será:

```text
basicLiftKg = effectiveLiftingST² / 10
```

onde:

```text
effectiveLiftingST = ST + liftingSTBonus
```

`liftingSTBonus` representa ST de Levantamento e efeitos equivalentes.

---

## Arredondamento da Base de Carga

A regra original de GURPS arredonda a Base de Carga quando ela é igual ou superior a 10 lb.

Como a SINGULAR usa quilogramas e a conversão GURPS é 2 lb = 1 kg, a regra métrica equivalente é:

```text
Se basicLiftKg >= 5 kg, arredondar para o inteiro mais próximo.
Se basicLiftKg < 5 kg, preservar decimal.
```

Implementação normativa:

```js
function calculateBasicLiftKg(effectiveLiftingST) {
  const raw = effectiveLiftingST ** 2 / 10;

  return raw >= 5
    ? Math.round(raw)
    : raw;
}
```

Exemplos:

```text
ST 7  → 4,9 kg
ST 8  → 6 kg
ST 9  → 8 kg
ST 10 → 10 kg
ST 11 → 12 kg
ST 12 → 14 kg
ST 13 → 17 kg
ST 14 → 20 kg
ST 15 → 23 kg
```

---

## Níveis de Carga

Os níveis de carga usarão a Base de Carga já arredondada.

```text
Nenhuma:      até 1 × basicLiftKg
Leve:         até 2 × basicLiftKg
Média:        até 3 × basicLiftKg
Pesada:       até 6 × basicLiftKg
Muito Pesada: até 10 × basicLiftKg
```

---

## Conversão de peso GCS

Quando um peso GCS vier como string em libras:

```text
"3 lb"
```

será convertido para:

```js
1.5
```

em kg.

Exemplos:

```text
0.1 lb → 0.05 kg
2 lb   → 1 kg
3 lb   → 1.5 kg
10 lb  → 5 kg
```

A string original poderá ser preservada em `raw`, mas o domínio normalizado da SINGULAR deve operar com número em kg.

---

## Consequências

A estrutura de Equipment deverá migrar de:

```js
weight: "3 lb"
```

para:

```js
weightKg: 1.5
```

ou estrutura equivalente, desde que o valor canônico interno seja numérico e em kg.

O futuro `EquipmentLoadCalculator` deverá consumir apenas pesos em kg.

---

## Fora de escopo

Esta ADR não define ainda:

- parsing completo de todos os formatos de peso GCS;
- conversão de custo;
- cálculo de carga final;
- impacto de carga em Deslocamento;
- impacto de carga em Esquiva;
- empilhamento de itens;
- arredondamento visual da UI.
