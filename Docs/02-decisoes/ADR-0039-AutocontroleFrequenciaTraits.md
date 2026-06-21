# ADR-0039 — Autocontrole, frequência e arredondamento de Traits

**Status:** Aceito mediante CI canônica verde  
**Data:** 2026-06-21  
**Código:** DOM-TRAIT-1.4

## Contexto

DOM-TRAIT-1.2 estabeleceu o custo-base soberano e DOM-TRAIT-1.3 interpretou modifiers de custo. O domínio ainda precisava representar dois multiplicadores proprietários de Traits usados pelo GURPS e pelo GCS:

- teste de autocontrole (`cr`);
- frequência de aparecimento (`frequency`).

Também era necessário definir onde ocorre o arredondamento. Arredondar em DOM-TRAIT-1.3 e depois aplicar autocontrole ou frequência produziria dupla aproximação e resultados diferentes da composição mecânica adotada pelo GCS.

Os payloads GCS ainda declaram `cr_adj` e `round_down`. `cr_adj` produz efeitos operacionais relacionados ao roll, mas não altera diretamente o custo em pontos. `round_down` muda a direção do arredondamento final.

## Decisão

### 1. O Trait declara estruturas canônicas próprias

O agregado passa a declarar:

```text
Trait.selfControl
Trait.frequency
Trait.roundCostDown
```

`selfControl` e `frequency` contêm o roll original, seu estado de reconhecimento, o multiplicador derivado e a evidência bruta preservada.

Não serão mantidos, em paralelo, campos canônicos independentes para `cr`, `cr_adj`, `frequency` e `round_down`. Esses nomes permanecem aliases de origem na fronteira GCS.

### 2. A importação projeta, não calcula

`TraitsImporter` converte os campos GCS para as estruturas canônicas. Ele não calcula custo, não arredonda e não promove `calc.points` a resultado desta etapa.

```text
cr         → selfControl.roll
cr_adj     → selfControl.adjustment
frequency  → frequency.roll
round_down → roundCostDown
```

O payload original continua preservado em `raw`.

### 3. O domínio reconhece somente rolls explícitos

Autocontrole reconhece `0`, `1` e `6` a `15`, com os multiplicadores usados pelo GCS atual.

Frequência reconhece `0`, `6`, `9`, `12`, `15` e `18`.

Valores inteiros não reconhecidos recebem estado `unsupported`. O motor não interpola nem escolhe o valor mais próximo.

### 4. Ajustes de autocontrole são modelados, mas não alteram pontos

Os tipos atuais de `cr_adj` são normalizados e seus valores operacionais são derivados para explicação futura.

Ajuste desconhecido gera aviso e permanece sem efeito sobre o custo. Ele não bloqueia um cálculo de pontos cujo roll seja reconhecido, pois não participa do multiplicador de custo.

### 5. A composição usa o valor não arredondado de modifiers

`TraitControlFrequencyCost` consome `TraitModifierCost.rawPoints` e força a etapa anterior a usar arredondamento `none`.

A ordem é:

```text
custo-base
→ adições
→ percentuais
→ multiplicadores de modifiers
→ autocontrole
→ frequência
→ arredondamento único
```

O multiplicador condicional é:

```text
selfControl.multiplier × frequency.multiplier
```

### 6. A direção do arredondamento pertence ao Trait

Sem opção explícita do avaliador:

```text
roundCostDown = false → up
roundCostDown = true  → down
```

Uma opção explícita pode sobrescrever a direção para inspeção, testes ou políticas posteriores. O recibo registra a origem da escolha.

### 7. O resultado permanece derivado

DOM-TRAIT-1.4 não grava o resultado em `pointValue.calculatedPoints`.

Ainda faltam:

- grupos alternativos;
- fechamento da autoridade final do custo de Traits;
- integração posterior com Point Ledger.

## Alternativas rejeitadas

### Calcular autocontrole e frequência na UI

Rejeitada porque viola a autoridade do motor e criaria divergência entre apresentação, importação e persistência.

### Aplicar os multiplicadores sobre `TraitModifierCost.calculatedPoints`

Rejeitada porque o valor pode já estar arredondado. Isso introduziria arredondamento intermediário e resultados incorretos.

### Persistir somente o custo importado do GCS

Rejeitada porque `calc.points` é evidência externa, não uma explicação soberana das regras nem uma base segura para edição local.

### Aceitar qualquer roll por aproximação

Rejeitada porque inventaria regra de GURPS e ocultaria incompatibilidades futuras.

### Tratar `cr_adj` como modifier percentual

Rejeitada porque o ajuste descreve consequências operacionais do autocontrole, não uma alteração percentual do custo.

## Consequências

### Positivas

- ordem mecânica única e auditável;
- compatibilidade explícita com GCS atual;
- ausência de dupla aproximação;
- rolls customizados oficiais preservados;
- ajustes operacionais disponíveis para etapas futuras;
- desconhecidos permanecem visíveis sem fórmula inventada;
- UI continua sem cálculo.

### Custos

- o Trait passa a carregar projeções normalizadas de autocontrole e frequência;
- consumidores que precisam do total desta etapa devem usar o novo avaliador;
- a autoridade final de pontos continua deliberadamente pendente.

## Gate

A decisão é considerada implementada quando:

- schema, importador e serialização preservarem as declarações;
- todos os multiplicadores reconhecidos tiverem testes;
- modifiers, autocontrole e frequência forem compostos antes de um único arredondamento;
- valores negativos seguirem corretamente `up` e `down`;
- desconhecidos não forem adivinhados;
- avaliações forem imutáveis e serializáveis;
- CI canônica estiver verde e não houver revisão bloqueante.
