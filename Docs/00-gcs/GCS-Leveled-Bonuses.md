# GCS — ligação confirmada entre bônus e `LeveledAmount`

## Escopo e evidência

Este documento registra somente comportamento observado diretamente em `richardwilkes/gcs`.

Fontes observadas nesta consolidação: `model/gurps/attribute_bonus.go`, `model/gurps/skill_bonus.go`, `model/gurps/spell_bonus.go`, `model/gurps/dr_bonus.go`, `model/gurps/trait_bonus.go`, `model/gurps/spell_point_bonus.go`, `model/gurps/reaction_bonus.go`, `model/gurps/conditional_modifier_bonus.go`, `model/gurps/skill_point_bonus.go`, `model/gurps/trait_max_level_bonus.go` e `model/gurps/equipment_max_uses_bonus.go`.

## Estrutura baseada em `LeveledAmount`

**Confirmada.** `AttributeBonus`, `SkillBonusData`, `SpellBonusData`, `DRBonusData`, `TraitBonusData`, `SpellPointBonusData`, `ReactionBonus`, `ConditionalModifierBonus` e `SkillPointBonusData` incorporam (`embed`) `LeveledAmount`.

**Confirmada.** Esses nove tipos concretos observados declaram satisfazer a interface `Bonus` por seus wrappers correspondentes e implementam `SetLeveledOwner(owner LeveledOwner)` atribuindo o owner ao campo `LeveledOwner` associado ao `LeveledAmount`.

**Confirmada.** Nos nove tipos observados, `Hash()` inclui `LeveledAmount.Hash(h)`.

Rastreabilidade: `model/gurps/attribute_bonus.go` — `AttributeBonus`; `model/gurps/skill_bonus.go` — `SkillBonus`, `SkillBonusData`; `model/gurps/spell_bonus.go` — `SpellBonus`, `SpellBonusData`; `model/gurps/dr_bonus.go` — `DRBonus`, `DRBonusData`; `model/gurps/trait_bonus.go` — `TraitBonus`, `TraitBonusData`; `model/gurps/spell_point_bonus.go` — `SpellPointBonus`, `SpellPointBonusData`; `model/gurps/reaction_bonus.go` — `ReactionBonus`; `model/gurps/conditional_modifier_bonus.go` — `ConditionalModifierBonus`; `model/gurps/skill_point_bonus.go` — `SkillPointBonus`, `SkillPointBonusData`; em todos, `SetLeveledOwner` e `Hash`.

## Valores iniciais observados

**Confirmada.** `NewAttributeBonus()`, `NewSkillBonus()`, `NewSpellBonus()`, `NewDRBonus()`, `NewTraitBonus()`, `NewSpellPointBonus()`, `NewReactionBonus()`, `NewConditionalModifierBonus()` e `NewSkillPointBonus()` inicializam `Amount` com `fxp.One`, diretamente ou por `LeveledAmount{Amount: fxp.One}`.

Nenhum desses nove construtores observados ativa `PerLevel` explicitamente.

Rastreabilidade: os respectivos construtores nos nove arquivos listados acima.

## Tooltip e serialização observados

**Confirmada.** `AttributeBonus.AddToTooltip()`, `SkillBonus.AddToTooltip()`, `SpellBonus.AddToTooltip()`, `TraitBonus.AddToTooltip()`, `SpellPointBonus.AddToTooltip()`, `ReactionBonus.AddToTooltip()` e `ConditionalModifierBonus.AddToTooltip()` passam o endereço do `LeveledAmount` incorporado para `basicAddToTooltip()`. A passagem anterior já havia confirmado separadamente a estrutura persistida de `DRBonus`.

**Confirmada.** `SkillPointBonus.AddToTooltip()` usa `AdjustedAmount()` para escolher entre `pt` e `pts`; `SkillPointBonusData` é serializado por `MarshalJSONTo()`, incorpora `LeveledAmount` e exclui `BonusOwner` do JSON com `json:"-"`.

**Confirmada.** `SkillBonusData`, `SpellBonusData`, `TraitBonusData` e `SpellPointBonusData` são as estruturas persistidas pelos respectivos `MarshalJSONTo()` observados; todas incorporam `LeveledAmount`, e `BonusOwner` é excluído do JSON com `json:"-"`.

**Confirmada.** `DRBonusData` incorpora `LeveledAmount`; `DRBonus.MarshalJSONTo()` serializa `DRBonusData`, enquanto `BonusOwner` pertence ao wrapper `DRBonus` e está marcado `json:"-"`.

**Confirmada.** Em `ReactionBonus` e `ConditionalModifierBonus`, `LeveledAmount` está incorporado diretamente no tipo e `BonusOwner` está marcado `json:"-"`.

Rastreabilidade: `model/gurps/skill_point_bonus.go` — `SkillPointBonusData`, `AddToTooltip`, `MarshalJSONTo`; `model/gurps/trait_bonus.go` — `TraitBonusData`, `AddToTooltip`, `MarshalJSONTo`; `model/gurps/spell_point_bonus.go` — `SpellPointBonusData`, `AddToTooltip`, `MarshalJSONTo`; `model/gurps/reaction_bonus.go` — `ReactionBonus`, `AddToTooltip`; `model/gurps/conditional_modifier_bonus.go` — `ConditionalModifierBonus`, `AddToTooltip`; além das fontes já registradas para `AttributeBonus`, `SkillBonus`, `SpellBonus` e `DRBonus`.

## Implementações `Bonus` com mecanismo próprio de nível

**Confirmada.** `TraitMaxLevelBonus` e `EquipmentMaxUsesBonus` também implementam `Bonus`, mas não incorporam `LeveledAmount`. Cada tipo mantém diretamente `PerLevel bool`, `Amount string` e `LeveledOwner LeveledOwner`.

**Confirmada.** Em ambos, `Operation()` interpreta `Amount` por `maxusesmod.FromString()`. `AdjustedAmount()` extrai o valor numérico por `Operation().ExtractValue(Amount)`; se `PerLevel` for falso, devolve esse valor. Se `PerLevel` for verdadeiro, devolve zero quando `LeveledOwner` é nil, quando `IsLeveled()` é falso ou quando `CurrentLevel() <= 0`; nos demais casos multiplica o valor pelo nível atual.

**Confirmada.** `NewTraitMaxLevelBonus()` e `NewEquipmentMaxUsesBonus()` inicializam `Amount` com `maxusesmod.Normalize("+1")` e não ativam `PerLevel` explicitamente. Seus `Hash()` incluem `Amount` e `PerLevel`, mas não chamam `LeveledAmount.Hash(h)` porque esses tipos não incorporam `LeveledAmount`.

Rastreabilidade: `model/gurps/trait_max_level_bonus.go` — `TraitMaxLevelBonus`, `NewTraitMaxLevelBonus`, `Operation`, `SetLeveledOwner`, `AdjustedAmount`, `Hash`; `model/gurps/equipment_max_uses_bonus.go` — `EquipmentMaxUsesBonus`, `NewEquipmentMaxUsesBonus`, `Operation`, `SetLeveledOwner`, `AdjustedAmount`, `Hash`.

## Limites desta passagem

**Não confirmada.** A inspeção confirma nove implementações baseadas em `LeveledAmount` e duas implementações de `Bonus` com mecanismo próprio de nível. Não foi feita nesta passagem uma enumeração exaustiva de todas as implementações da interface `Bonus`; portanto, nenhum desses padrões é generalizado para tipos ainda não inspecionados diretamente.
