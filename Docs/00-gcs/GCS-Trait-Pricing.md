# GCS — pricing de Traits

> Escopo: comportamento diretamente observado no código-fonte público de `richardwilkes/gcs`. Não contém decisões da SINGULAR.

## Evidência observada

**Confirmada.** `(*Trait).AdjustedPoints()` retorna zero quando `EffectivelyDisabled()` é verdadeiro. Para Trait não-container, delega o cálculo à função `AdjustedPoints(...)`, passando `CanLevel`, `BasePoints`, `Levels`, `PointsPerLevel`, `SelfControl`, `Frequency`, `AllModifiers()` e `RoundCostDown`.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).AdjustedPoints`, `AdjustedPoints`.

**Confirmada.** `AllModifiers()` começa com os modificadores do próprio Trait e acrescenta os modificadores de cada ancestral, subindo pela cadeia privada `parent`. Portanto, o pricing do Trait não-container recebe também modificadores herdados dos containers ancestrais.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).AllModifiers`.

## Preparação de base, níveis e multiplicador

**Confirmada.** Na função global `AdjustedPoints`, quando `canLevel` é falso, `levels` e `pointsPerLevel` são zerados antes do processamento dos modificadores.

**Confirmada.** O cálculo mantém acumuladores distintos de limitações e ampliações percentuais para a parcela base (`baseLim`, `baseEnh`) e para a parcela por níveis (`levelLim`, `levelEnh`). Todos começam como frações com denominador 1 e numerador zero.

**Confirmada.** O multiplicador global começa como o produto de `cr.Multiplier()` e `fr.Multiplier()`, isto é, dos multiplicadores fornecidos pelos valores de autocontrole e frequência recebidos pela função.

Rastreabilidade: `model/gurps/trait.go` — função `AdjustedPoints`; tipos/valores `selfctrl.Roll`, `frequency.Roll`, `fxp.Fraction`.

## TraitModifier no cálculo

**Confirmada.** Os modificadores são percorridos por `Traverse(..., true, true, modifiers...)`. Para cada `TraitModifier`, o código chama `mod.setTrait(trait)`, obtém `mod.CostModifier()` e despacha pelo resultado de `mod.CostModifierType()`.

**Confirmada.** Para `emweight.Addition`, se `Affects == affects.LevelsOnly`, o valor é somado a `pointsPerLevel` somente quando o Trait aceita níveis. Nos demais casos desse ramo, o valor é somado a `basePoints`.

**Confirmada.** Para `emweight.PercentageAdder`, o modificador é separado pelo campo `Affects`: `Total` alimenta tanto base quanto níveis; `BaseOnly` somente a base; `LevelsOnly` somente níveis. Em cada parcela, numerador negativo entra no acumulador de limitações e não-negativo no acumulador de ampliações.

**Confirmada.** Para `emweight.PercentageMultiplier`, o multiplicador global é multiplicado pelo modificador e dividido por 100. Para `emweight.Multiplier`, o multiplicador global é multiplicado diretamente pelo modificador.

Rastreabilidade: `model/gurps/trait.go` — `AdjustedPoints`; `TraitModifier.CostModifier`, `TraitModifier.CostModifierType`; enums `emweight.Addition`, `emweight.PercentageAdder`, `emweight.PercentageMultiplier`, `emweight.Multiplier`; `affects.Total`, `affects.BaseOnly`, `affects.LevelsOnly`.

## Aplicação dos percentuais

**Confirmada.** Antes dos percentuais, a parcela base é `basePoints` e a parcela de níveis é `pointsPerLevel * levels`, ambas convertidas para `fxp.Fraction`.

**Confirmada.** Quando `SheetSettingsFor(entity).UseMultiplicativeModifiers` é verdadeiro, ampliações e limitações percentuais são aplicadas em etapas separadas por chamadas sucessivas a `modifyPoints`: primeiro a ampliação e depois a limitação. Se os acumuladores de base e níveis forem iguais, as duas parcelas são somadas antes dessa aplicação; caso contrário, base e níveis são processados separadamente e depois somados.

**Confirmada.** Nesse modo multiplicativo, cada acumulador de limitações efetivamente utilizado (`baseLim` e, quando separado, `levelLim`) é limitado inferiormente a -80 antes da aplicação.

**Confirmada.** Quando `UseMultiplicativeModifiers` é falso, ampliação e limitação de cada parcela são somadas (`baseEnh + baseLim`, `levelEnh + levelLim`) antes de `modifyPoints`. Cada resultado percentual é limitado inferiormente a -80. Se base e níveis têm o mesmo modificador resultante, as parcelas são somadas antes de aplicá-lo; caso contrário são modificadas separadamente e depois somadas.

**Confirmada.** `modifyPoints(points, modifier)` devolve `points + points * modifier / 100` usando `fxp.Fraction`.

Rastreabilidade: `model/gurps/trait.go` — `AdjustedPoints`, `modifyPoints`; `SheetSettings.UseMultiplicativeModifiers`.

## Multiplicadores e arredondamento final

**Confirmada.** Depois de adições e percentuais, o total é multiplicado pelo multiplicador global. O retorno passa por `fxp.ApplyRounding(..., roundCostDown)`. Assim, o parâmetro `RoundCostDown` recebido do Trait controla a direção usada nessa operação final de arredondamento.

Rastreabilidade: `model/gurps/trait.go` — `AdjustedPoints`; `fxp.ApplyRounding` como função chamada.

## Containers

**Confirmada.** Para containers que não sejam `container.AlternativeAbilities`, `(*Trait).AdjustedPoints()` soma `AdjustedPoints()` de todos os filhos.

**Confirmada.** Para `container.AlternativeAbilities`, o método calcula primeiro o custo ajustado de cada filho e identifica o maior valor. O maior é incluído integralmente uma vez; cada outro valor é multiplicado por 20/100 e arredondado individualmente por `fxp.ApplyRounding(..., t.RoundCostDown)` antes de ser somado. Se mais de um filho empatar no maior valor, apenas a primeira ocorrência encontrada é tratada como a parcela integral; as demais entram no ramo de 20%.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).AdjustedPoints`; `container.AlternativeAbilities`.

## Limite de níveis observado

**Confirmada.** `ResolvedMaxLevels()` só opera para Trait nivelável. O valor-base vem de `MaxLevels`, quando não vazio, resolvido por `ResolveToNumber(...)`. Bônus `TraitMaxLevelBonus` de seleção `traitsel.ThisTrait` são coletados das features do próprio Trait e de seus modificadores; bônus correspondentes da Entity também são consultados por `TraitMaxLevelBonusesFor(...)`.

**Confirmada.** Os bônus de nível máximo são separados por operação em adição, percentual e multiplicador. O resultado observado é: base mais adições; depois soma do percentual calculado sobre esse resultado; depois multiplicação pelo produto dos multiplicadores; por fim `Max(0)`. Multiplicador de valor menor ou igual a zero é substituído por 1 durante a acumulação.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).ResolvedMaxLevels`; `TraitMaxLevelBonus`; `maxusesmod.Percentage`, `maxusesmod.Multiplier`.

## Questões não promovidas a fato

- **Não confirmada:** semântica interna de `TraitModifier.CostModifier()` e de como seus campos persistidos são convertidos em `fxp.Fraction`; requer inspeção direta da implementação desse método.
- **Não confirmada:** implementação interna dos multiplicadores retornados por `selfctrl.Roll.Multiplier()` e `frequency.Roll.Multiplier()`; nesta passagem está confirmado apenas onde e como esses resultados entram no pricing.
- **Não confirmada:** semântica interna de `fxp.ApplyRounding`; está confirmado somente que ela recebe o total final e `roundCostDown`, e que também é usada individualmente nos custos reduzidos de Alternative Abilities.
