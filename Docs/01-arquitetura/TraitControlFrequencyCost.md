# TraitControlFrequencyCost — Autocontrole e frequência de Traits

**Código:** DOM-TRAIT-1.4  
**Status:** Proposto  
**Camada:** Domain  
**Autoridade de entrada:** `Trait.selfControl`, `Trait.frequency`, `Trait.roundCostDown` e `TraitModifierCost.rawPoints`  
**Resultado:** avaliação derivada, imutável e explicável  
**Decisão:** ADR-0039

## Objetivo

Modelar os testes de autocontrole, a frequência de aparecimento e o arredondamento final desta etapa sem transformar dados importados, a UI ou valores já calculados em autoridades paralelas.

```text
Trait declara autocontrole, frequência e direção de arredondamento.
TraitModifierCost entrega o custo modificado ainda não arredondado.
TraitControlFrequencyCost aplica os multiplicadores condicionais e arredonda uma única vez.
A UI apenas apresenta e despacha intenção.
```

DOM-TRAIT-1.4 ainda não promove o resultado a custo final persistente do Trait. Grupos alternativos e a autoridade final de custo permanecem em etapas posteriores.

## Campos canônicos

Cada Trait possui:

```js
{
  selfControl: {
    roll,
    status,
    multiplier,
    penalty,
    adjustment: {
      type,
      status,
      value,
    },
    raw,
  },
  frequency: {
    roll,
    status,
    multiplier,
    raw,
  },
  roundCostDown,
}
```

`roll` e o tipo de ajuste são as declarações mecânicas. `status`, `multiplier`, `penalty` e `value` são projeções normalizadas e validadas pelo domínio.

Ausência de declaração produz roll `0`, status `none` e multiplicador `1`. O payload original continua preservado em `raw` quando existe.

## Testes de autocontrole

Multiplicadores reconhecidos:

| Roll | Multiplicador |
|---:|---:|
| 0 | 1 |
| 1 | 2,5 |
| 6 | 2 |
| 7 | 1,83 |
| 8 | 1,67 |
| 9 | 1,5 |
| 10 | 1,33 |
| 11 | 1,17 |
| 12 | 1 |
| 13 | 0,83 |
| 14 | 0,67 |
| 15 | 0,5 |

O roll `1` representa a condição histórica de nunca resistir. Rolls inteiros não reconhecidos são preservados como `unsupported`; nenhuma interpolação é inventada.

## Ajustes associados ao autocontrole

Tipos reconhecidos:

```text
none
action-penalty
reaction-penalty
fright-check-penalty
fright-check-bonus
minor-cost-of-living-increase
major-cost-of-living-increase
```

Esses ajustes são projeções operacionais do autocontrole. Eles não alteram o custo em pontos nesta etapa.

Um tipo de ajuste desconhecido é preservado como `unknown` e gera diagnóstico de aviso. Ele não bloqueia o cálculo do custo quando o roll de autocontrole é reconhecido, pois não participa do multiplicador de pontos.

## Frequência de aparecimento

Multiplicadores reconhecidos:

| Roll | Multiplicador |
|---:|---:|
| 0 | 1 |
| 6 | 0,5 |
| 9 | 1 |
| 12 | 2 |
| 15 | 3 |
| 18 | 4 |

Rolls inteiros não reconhecidos produzem `unsupported` e não recebem aproximação.

## Ordem mecânica

A composição canônica é:

```text
1. custo-base estrutural
2. adições planas
3. percentuais
4. multiplicadores de modifiers
5. multiplicador de autocontrole
6. multiplicador de frequência
7. arredondamento único
```

`TraitControlFrequencyCost` chama `TraitModifierCost` com arredondamento `none` e consome `rawPoints`. Isso impede arredondamento intermediário antes dos multiplicadores condicionais.

A multiplicação é registrada por:

```text
conditionalMultiplier = selfControl.multiplier × frequency.multiplier
rawPoints = TraitModifierCost.rawPoints × conditionalMultiplier
```

## Arredondamento

Por padrão:

- `roundCostDown = false` usa `up`;
- `roundCostDown = true` usa `down`.

`up` arredonda na direção positiva: positivos para cima e negativos em direção a zero.

`down` arredonda na direção negativa: positivos para baixo e negativos para o inteiro mais negativo.

Uma opção explícita do avaliador pode selecionar `up`, `down` ou `none`. O resultado registra a política, sua origem, entrada, saída e diferença.

## Estados

```text
ready
incomplete
conflict
unsupported
```

- `ready`: custo de modificadores pronto e rolls mecânicos reconhecidos;
- `incomplete`: entradas anteriores ainda incompletas;
- `conflict`: autoridades anteriores divergentes;
- `unsupported`: roll ativo de autocontrole ou frequência não reconhecido, ou etapa anterior não suportada.

Somente `ready` expõe `rawPoints`, `calculatedPoints`, multiplicador condicional e recibo de arredondamento.

## Compatibilidade GCS

A importação GCS projeta:

```text
cr         → Trait.selfControl.roll
cr_adj     → Trait.selfControl.adjustment.type
frequency  → Trait.frequency.roll
round_down → Trait.roundCostDown
```

A projeção ocorre na fronteira de importação. O payload GCS permanece em `raw`; ele não substitui os campos canônicos nem cria um segundo cálculo.

As tabelas e a ordem mecânica acompanham as estruturas atuais do GCS em `model/gurps/trait.go`, `model/gurps/enums/selfctrl` e `model/gurps/enums/frequency`.

## Imutabilidade

Os construtores e avaliadores:

- não alteram o Trait recebido;
- clonam evidências preservadas;
- rejeitam estruturas derivadas inconsistentes;
- retornam objetos profundamente imutáveis;
- normalizam artefatos binários antes de expor valores públicos.

## Relação com `pointValue.calculatedPoints`

DOM-TRAIT-1.4 não sobrescreve `Trait.pointValue.calculatedPoints`.

```text
TraitControlFrequencyCost.calculatedPoints = resultado derivado desta etapa
Trait.pointValue.calculatedPoints           = autoridade persistente já existente
```

A promoção exige fechamento posterior de grupos alternativos e da autoridade final do custo do Trait.

## Não responsabilidades

DOM-TRAIT-1.4 não:

- resolve grupos alternativos;
- agrega pontos do Character;
- grava custo final no Trait;
- aplica penalidades operacionais durante o jogo;
- interpreta pré-requisitos ou features;
- calcula na UI;
- reabre o cálculo-base ou a interpretação de modifiers.

## Critério de conclusão

- campos canônicos declarativos presentes no Trait;
- rolls oficiais de autocontrole e frequência reconhecidos;
- valores não reconhecidos preservados e bloqueados sem adivinhação;
- ajustes operacionais projetados sem alterar custo;
- importação GCS explícita e sem pipeline paralelo;
- composição sobre `TraitModifierCost.rawPoints`;
- somente um arredondamento após todos os multiplicadores;
- arredondamento positivo e negativo auditável;
- resultados e evidências imutáveis;
- nenhuma autoridade persistente paralela;
- suíte integral verde.
