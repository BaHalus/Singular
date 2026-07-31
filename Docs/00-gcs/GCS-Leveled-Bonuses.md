# GCS — ligação confirmada entre bônus e `LeveledAmount`

## Escopo e evidência

Este documento registra somente comportamento observado diretamente em `richardwilkes/gcs`.

Fontes observadas nesta consolidação: `model/gurps/attribute_bonus.go`, `model/gurps/skill_bonus.go`, `model/gurps/spell_bonus.go`, `model/gurps/dr_bonus.go`, `model/gurps/trait_bonus.go`, `model/gurps/spell_point_bonus.go`, `model/gurps/reaction_bonus.go` e `model/gurps/conditional_modifier_bonus.go`.

## Estrutura comum

**Confirmada.** `AttributeBonus`, `SkillBonusData`, `SpellBonusData`, `DRBonusData`, `TraitBonusData`, `SpellPointBonusData`, `ReactionBonus` e `ConditionalModifierBonus` incorporam (`embed`) `LeveledAmount`.

**Confirmada.** Os oito tipos concretos observados declaram satisfazer a interface `Bonus` (`var _ Bonus = ...`) e implementam `SetLeveledOwner(owner LeveledOwner)` atribuindo o owner ao campo `LeveledOwner` associado ao `LeveledAmount`.

**Confirmada.** Nos oito tipos observados, `Hash()` inclui `LeveledAmount.Hash(h)`.

Rastreabilidade: `model/gurps/attribute_bonus.go` — `AttributeBonus`; `model/gurps/skill_bonus.go` — `SkillBonus`, `SkillBonusData`; `model/gurps/spell_bonus.go` — `SpellBonus`, `SpellBonusData`; `model/gurps/dr_bonus.go` — `DRBonus`, `DRBonusData`; `model/gurps/trait_bonus.go` — `TraitBonus`, `TraitBonusData`; `model/gurps/spell_point_bonus.go` — `SpellPointBonus`, `SpellPointBonusData`; `model/gurps/reaction_bonus.go` — `ReactionBonus`; `model/gurps/conditional_modifier_bonus.go` — `ConditionalModifierBonus`; em todos, `SetLeveledOwner` e `Hash`.

## Valores iniciais observados

**Confirmada.** `NewAttributeBonus()`, `NewSkillBonus()`, `NewSpellBonus()`, `NewDRBonus()`, `NewTraitBonus()`, `NewSpellPointBonus()`, `NewReactionBonus()` e `NewConditionalModifierBonus()` inicializam `Amount` com `fxp.One`, diretamente ou por `LeveledAmount{Amount: fxp.One}`.

Nenhum desses oito construtores observados ativa `PerLevel` explicitamente.

Rastreabilidade: os respectivos construtores nos oito arquivos listados acima.

## Tooltip e serialização observados

**Confirmada.** `AttributeBonus.AddToTooltip()`, `SkillBonus.AddToTooltip()`, `SpellBonus.AddToTooltip()`, `TraitBonus.AddToTooltip()`, `SpellPointBonus.AddToTooltip()`, `ReactionBonus.AddToTooltip()` e `ConditionalModifierBonus.AddToTooltip()` passam o endereço do `LeveledAmount` incorporado para `basicAddToTooltip()`. A passagem anterior já havia confirmado separadamente a estrutura persistida de `DRBonus`.

**Confirmada.** `SkillBonusData`, `SpellBonusData`, `TraitBonusData` e `SpellPointBonusData` são as estruturas persistidas pelos respectivos `MarshalJSONTo()` observados; todas incorporam `LeveledAmount`, e `BonusOwner` é excluído do JSON com `json:"-"`.

**Confirmada.** `DRBonusData` incorpora `LeveledAmount`; `DRBonus.MarshalJSONTo()` serializa `DRBonusData`, enquanto `BonusOwner` pertence ao wrapper `DRBonus` e está marcado `json:"-"`.

**Confirmada.** Em `ReactionBonus` e `ConditionalModifierBonus`, `LeveledAmount` está incorporado diretamente no tipo e `BonusOwner` está marcado `json:"-"`.

Rastreabilidade: `model/gurps/trait_bonus.go` — `TraitBonusData`, `AddToTooltip`, `MarshalJSONTo`; `model/gurps/spell_point_bonus.go` — `SpellPointBonusData`, `AddToTooltip`, `MarshalJSONTo`; `model/gurps/reaction_bonus.go` — `ReactionBonus`, `AddToTooltip`; `model/gurps/conditional_modifier_bonus.go` — `ConditionalModifierBonus`, `AddToTooltip`; além das fontes já registradas para `AttributeBonus`, `SkillBonus`, `SpellBonus` e `DRBonus`.

## Limites desta passagem

**Não confirmada.** Esta passagem ampliou a inspeção para oito classes concretas que implementam `Bonus`, mas não verificou exaustivamente todas as implementações da interface; portanto, não generaliza o padrão para tipos ainda não inspecionados diretamente.
