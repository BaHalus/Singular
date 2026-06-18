# ADR-0007 — Protection Architecture

**Status:** Aprovado  
**Camada:** Domain / Engine  
**Data:** 2026-06-18

---

## Contexto

A SINGULAR precisa calcular RD de equipamentos defensivos em GURPS 4e sem misturar RD com defesas ativas.

No GCS, armaduras aparecem frequentemente como equipamentos com `features`, especialmente `dr_bonus`.

Escudos não devem ser tratados como RD. Escudos concedem DB e afetam defesas ativas, especialmente Bloqueio, e serão tratados em um serviço posterior de defesas.

---

## Decisão

A SINGULAR terá um serviço de domínio separado para proteção:

```text
ProtectionCalculator
```

Esse serviço consumirá equipamentos e produzirá RD por localização.

A primeira versão considera apenas equipamentos com estado:

```text
equipped
```

Equipamentos carregados, guardados, largados ou ignorados não concedem RD.

---

## Localizações canônicas iniciais

A SINGULAR usará as seguintes localizações canônicas iniciais:

```js
[
  "torso",
  "skull",
  "face",
  "eyes",
  "neck",
  "rightArm",
  "leftArm",
  "rightHand",
  "leftHand",
  "rightLeg",
  "leftLeg",
  "rightFoot",
  "leftFoot",
  "groin"
]
```

---

## Features de RD

Uma feature de RD pode ser interpretada quando tiver:

```js
type: "dr_bonus"
```

O valor de RD será obtido de um destes campos, nesta ordem:

```js
amount
bonus
value
```

Localizações serão lidas de:

```js
locations
location
```

Se a feature não declarar localização, será aplicada a `torso` por padrão.

---

## Agregação

A primeira versão soma RD por localização.

Exemplo:

```text
Gambeson RD 1 torso
Cota de Malha RD 4 torso
Resultado: torso RD 5
```

Regras mais avançadas de camadas, flexível/rígida, gaps e edge cases ficam fora de escopo inicial.

---

## Fora de escopo

Protection v1 não calcula:

- DB de escudo;
- Bloqueio;
- Esquiva;
- Aparar;
- penalidade de armadura;
- layering avançado;
- armadura flexível;
- dano penetrante;
- efeitos de qualidade de armadura;
- proteção de vantagens, poderes ou magias.

---

## Consequências

RD e defesas ativas permanecem desacopladas.

Equipment preserva a armadura.
Protection calcula a RD.
Defense calculará Dodge, Parry, Block e DB futuramente.
