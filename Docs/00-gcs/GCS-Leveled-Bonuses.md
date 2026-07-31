# GCS — ligação confirmada entre bônus e `LeveledAmount`

## Escopo e evidência

Este documento registra somente comportamento observado diretamente em `richardwilkes/gcs`.

Fontes observadas: `model/gurps/attribute_bonus.go`, `model/gurps/skill_bonus.go`, `model/gurps/spell_bonus.go` e `model/gurps/dr_bonus.go`.

## Estrutura comum

**Confirmada.** `AttributeBonus`, `SkillBonusData`, `SpellBonusData` e `DRBonusData` incorporam (`embed`) `LeveledAmount`. Nos três primeiros casos observados que implementam explicitamente `SetLeveledOwner(owner LeveledOwner)`, o método atribui o owner diretamente ao campo `LeveledOwner` promovido por esse embedding.

**Confirmada.** `AttributeBonus`, `SkillBonus` e `SpellBonus` satisfazem a interface `Bonus` (`var _ Bonus = ...`) e implementam `SetLeveledOwner`. `DRBonus` também declara satisfazer `Bonus` e implementa o mesmo método.

**Confirmada.** Nos quatro tipos observados, o `Hash()` inclui `LeveledAmount.Hash(h)`, de modo que o estado persistente do `LeveledAmount` participa do hash do bônus.

Rastreabilidade: `model/gurps/attribute_bonus.go` — `AttributeBonus`, `SetLeveledOwner`, `Hash`; `model/gurps/skill_bonus.go` — `SkillBonus`, `SkillBonusData`, `SetLeveledOwner`, `Hash`; `model/gurps/spell_bonus.go` — `SpellBonus`, `SpellBonusData`, `SetLeveledOwner`, `Hash`; `model/gurps/dr_bonus.go` — `DRBonus`, `DRBonusData`, `SetLeveledOwner`, `Hash`.

## Valores iniciais observados

**Confirmada.** `NewAttributeBonus()` cria `LeveledAmount{Amount: fxp.One}`.

**Confirmada.** `NewSkillBonus()` atribui `Amount = fxp.One`.

**Confirmada.** `NewSpellBonus()` atribui `Amount = fxp.One`.

**Confirmada.** `NewDRBonus()` cria `LeveledAmount{Amount: fxp.One}`.

Nenhum desses construtores observados ativa `PerLevel` explicitamente.

Rastreabilidade: `model/gurps/attribute_bonus.go` — `NewAttributeBonus`; `model/gurps/skill_bonus.go` — `NewSkillBonus`; `model/gurps/spell_bonus.go` — `NewSpellBonus`; `model/gurps/dr_bonus.go` — `NewDRBonus`.

## Tooltip e serialização observados

**Confirmada.** `AttributeBonus.AddToTooltip()`, `SkillBonus.AddToTooltip()` e `SpellBonus.AddToTooltip()` passam o endereço do `LeveledAmount` incorporado para `basicAddToTooltip()`.

**Confirmada.** `SkillBonusData` e `SpellBonusData` são as estruturas persistidas por seus respectivos `MarshalJSONTo()`; ambas incorporam `LeveledAmount` e `BonusOwner` é excluído do JSON com `json:"-"`.

**Confirmada.** `DRBonusData` incorpora `LeveledAmount`; `DRBonus.MarshalJSONTo()` serializa `DRBonusData`, enquanto `BonusOwner` pertence ao wrapper `DRBonus` e está marcado `json:"-"`.

Rastreabilidade: `model/gurps/attribute_bonus.go` — `AddToTooltip`; `model/gurps/skill_bonus.go` — `SkillBonusData`, `AddToTooltip`, `MarshalJSONTo`; `model/gurps/spell_bonus.go` — `SpellBonusData`, `AddToTooltip`, `MarshalJSONTo`; `model/gurps/dr_bonus.go` — `DRBonusData`, `DRBonus`, `MarshalJSONTo`.

## Limites desta passagem

**Não confirmada.** Esta passagem não verificou todas as classes concretas que implementam `Bonus`; portanto, não generaliza o padrão observado acima para tipos ainda não inspecionados diretamente.
