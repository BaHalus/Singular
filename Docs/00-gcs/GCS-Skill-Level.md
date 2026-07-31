# GCS — Skill level update pipeline

## Escopo e evidência

**Status: Confirmada.** Evidência observada em `richardwilkes/gcs`, commit `49cb0baddb44d15421e13138a7b1b104d4a12163`, arquivo `model/gurps/skill.go`, tipos `Skill` e `Level`, métodos `Skill.SetRawPoints()`, `Skill.AdjustedPoints()`, `Skill.CalculateLevel()`, `Skill.UpdateLevel()` e funções `AdjustedPointsForNonContainerSkillOrTechnique()` e `CalculateSkillLevel()`.

## Fluxo de atualização

**Confirmada.** `Skill.SetRawPoints()` grava `Points` e chama imediatamente `UpdateLevel()`.

**Confirmada.** `Skill.UpdateLevel()` salva o `LevelData` anterior, recalcula `DefaultedFrom` por `bestDefaultWithPoints(nil)`, substitui `LevelData` pelo resultado de `CalculateLevel(nil)` e retorna se o `LevelData` mudou.

**Confirmada.** `Skill.CalculateLevel()` obtém primeiro `AdjustedPoints(nil)`. Técnicas são encaminhadas a `CalculateTechniqueLevel(...)`; demais skills são encaminhadas a `CalculateSkillLevel(...)`.

## Pontos ajustados

**Confirmada.** Em skill não-container, `AdjustedPoints()` chama `AdjustedPointsForNonContainerSkillOrTechnique()`. Havendo `Entity`, essa função soma `Entity.SkillPointBonusFor(...)` aos pontos brutos e aplica piso zero. Containers retornam a soma recursiva dos pontos ajustados dos filhos.

## CalculateSkillLevel

**Confirmada.** `CalculateSkillLevel()` inicia o nível relativo em `attrDiff.Difficulty.BaseRelativeLevel()` e obtém o nível-base por `Entity.ResolveAttributeCurrent(attrDiff.Attribute)`.

**Confirmada.** Quando `SheetSettings.UseHalfStatDefaults` está ativo, o valor-base usado passa a `floor(attribute / 2) + 5`.

**Confirmada.** Para dificuldade `Wildcard`, os pontos são divididos por três. Para outra dificuldade, quando `def != nil` e `def.Points > 0`, `def.Points` é somado aos pontos. Depois os pontos são truncados por `Floor()`.

**Confirmada.** A progressão implementada é: 1 ponto mantém o `BaseRelativeLevel`; mais de 1 e menos de 4 acrescenta 1; 4 ou mais acrescenta `1 + floor(points / 4)`. Sem pontos utilizáveis, um default não-Wildcard com `def.Points < 0` define o relativo como `def.AdjLevel - level`; nos demais casos o nível passa a `fxp.Min` e o relativo a zero.

**Confirmada.** Para nível válido, o relativo é somado ao valor-base. Havendo default não-Wildcard, se o resultado ficar abaixo de `def.AdjLevel`, o nível é elevado a `def.AdjLevel`.

**Confirmada.** Havendo `Entity`, `Entity.SkillBonusFor(...)` é somado ao nível absoluto e ao relativo. Separadamente, `Entity.EncumbranceLevel(true).Penalty().Mul(encumbrancePenaltyMultiplier)` é somado apenas ao nível absoluto; quando não zero, essa parcela é registrada no tooltip.

## Limites desta passagem

- **Não confirmada nesta passagem:** implementação completa de `bestDefaultWithPoints()` e `bestDefault()`.
- **Não confirmada nesta passagem:** algoritmo completo de `CalculateTechniqueLevel()`.
- **Não confirmada nesta passagem:** implementação interna de `Entity.SkillPointBonusFor()` e `Entity.SkillBonusFor()`.
