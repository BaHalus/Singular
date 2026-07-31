# GCS — consumo confirmado de bônus pela `Entity`

## Escopo e evidência

Este documento registra somente comportamento observado diretamente em `richardwilkes/gcs`.

Fontes principais: `model/gurps/entity.go`, tipo `Entity` e seus consumidores de bônus; `model/gurps/bonus_owner.go`, função `bonusReplacements`, tipo `BonusOwner` e interface `LeveledOwner`; `model/gurps/leveled_amount.go`, tipo `LeveledAmount`.

## Coleções internas

**Confirmada.** `Entity` mantém as features já processadas em um campo interno `features`. Entre suas coleções estão `attributeBonuses`, `costReductions`, `drBonuses`, `maxUsesBonuses`, `skillBonuses`, `skillPointBonuses`, `spellBonuses`, `spellPointBonuses`, `traitBonuses`, `traitMaxLevelBonuses` e `weaponBonuses`.

**Confirmada.** `processFeature()` classifica instâncias concretas de Feature e as acrescenta às coleções correspondentes. Antes desse despacho, objetos que implementam `Bonus` recebem owner, sub-owner e leveled owner; objetos que implementam `Override` recebem owner e sub-owner.

Rastreabilidade: `model/gurps/entity.go` — `features`, `(*Entity).processFeature`.

## Ownership e replacements dos bônus

**Confirmada.** `bonusReplacements(b Bonus)` consulta `b.Owner()`. Se o owner implementar `nameable.Accesser`, retorna diretamente `NameableReplacements()` desse owner; caso contrário retorna `nil`. A função não consulta o sub-owner para obter replacements.

**Confirmada.** `BonusOwner` armazena separadamente `owner` e `subOwner`, expostos por `Owner()`/`SetOwner()` e `SubOwner()`/`SetSubOwner()`.

**Confirmada.** `BonusOwner.DerivedLeveledOwner()` tenta primeiro o `subOwner`: se ele implementar `LeveledOwner` e `IsLeveled()` for verdadeiro, ele é retornado. Se isso não ocorrer, aplica o mesmo teste ao `owner`. Se nenhum satisfizer essas condições, retorna `zeroLeveledOwner`, cujo `IsLeveled()` é falso e `CurrentLevel()` retorna zero.

Rastreabilidade: `model/gurps/bonus_owner.go` — `bonusReplacements`, `BonusOwner`, `LeveledOwner`, `(*BonusOwner).DerivedLeveledOwner`, `zeroLeveledOwner`.

## Ajuste de valores por nível

**Confirmada.** `LeveledAmount` persiste `Amount` e `PerLevel`; seu campo `LeveledOwner` não é serializado (`json:"-"`).

**Confirmada.** `(*LeveledAmount).AdjustedAmount()` retorna `Amount` sem alteração quando `PerLevel` é falso. Quando `PerLevel` é verdadeiro, retorna zero se `LeveledOwner` for nil ou se `CurrentLevel()` for menor ou igual a zero; caso contrário retorna `Amount.Mul(CurrentLevel())`.

**Confirmada.** `(*LeveledAmount).Format()` usa `AdjustedAmount()` na representação de valores por nível, mantendo `Amount` como o valor indicado por nível.

Rastreabilidade: `model/gurps/leveled_amount.go` — `LeveledAmount`, `(*LeveledAmount).AdjustedAmount`, `(*LeveledAmount).Format`.

## Bônus de atributo e redução de custo

**Confirmada.** `AttributeBonusFor(attributeID, limitation, tooltip)` soma `AdjustedAmount()` apenas dos `AttributeBonus` cuja `ActualLimitation()` coincide com a limitação solicitada e cujo `Attribute` coincide exatamente com `attributeID`. Cada bônus aceito é acrescentado ao tooltip por `AddToTooltip()`.

**Confirmada.** `CostReductionFor(attributeID)` soma `Percentage` dos `CostReduction` cujo `Attribute` coincide com `attributeID`, limita o total superior a 80 e retorna no mínimo zero.

**Confirmada.** `processFeatures()` usa esses dois consumidores para preencher `Attribute.Bonus` e `Attribute.CostReduction`. Quando a definição do atributo não permite decimal, o bônus é arredondado para baixo por `Floor()`.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).processFeatures`, `(*Entity).AttributeBonusFor`, `(*Entity).CostReductionFor`.

## Bônus de Skill

**Confirmada.** `SkillBonusFor(name, specialization, optionalSpecialization, tags, tooltip)` considera apenas `SkillBonus` com `SelectionType == skillsel.Name`. Para cada candidato, obtém replacements por `bonusReplacements()` e exige correspondência simultânea de `NameCriteria`, `SpecializationCriteria`, `OptionalSpecializationCriteria` e `TagsCriteria`. Os bônus aceitos contribuem com `AdjustedAmount()` e com `AddToTooltip()`.

**Confirmada.** `SkillPointBonusFor(...)` percorre `skillPointBonuses`, aplica replacements e os mesmos quatro grupos de critérios de nome, especialização, especialização opcional e tags; os correspondentes são somados por `AdjustedAmount()`.

**Confirmada.** `NamedWeaponSkillBonusesFor(name, usage, tags, tooltip)` é um consumidor separado de `skillBonuses`: seleciona apenas `SelectionType == skillsel.WeaponsWithName`, testa nome, uso por `SpecializationCriteria` e tags, e retorna os objetos `*SkillBonus` correspondentes em vez de somar seus valores.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).SkillBonusFor`, `(*Entity).SkillPointBonusFor`, `(*Entity).NamedWeaponSkillBonusesFor`; `model/gurps/bonus_owner.go` — `bonusReplacements`.

## Matching de Skills usado por bônus de Weapon

**Confirmada.** `SkillNamed(name, specialization, requirePoints, excludes)` percorre `e.Skills` por `Traverse(..., false, true, e.Skills...)`. Exclui uma Skill quando `excludes[sk.String()]` é verdadeiro. Com `requirePoints == true`, aceita a Skill se ela for Technique ou se `AdjustedPoints(nil) > 0`.

**Confirmada.** O nome em `SkillNamed()` é comparado por `strings.EqualFold()` contra `NameWithReplacements()`. Uma especialização solicitada vazia aceita qualquer especialização; caso contrário, há correspondência quando ela coincide sem distinção de caixa com `SpecializationWithReplacements()` ou `OptionalSpecializationWithReplacements()`.

**Confirmada.** `BestSkillNamed()` chama `SkillNamed()`, recalcula cada candidato por `CalculateLevel(excludes)` e retorna aquele com maior `Level` observado.

**Confirmada.** `SkillMatching()` aplica os mesmos filtros de exclusão e pontos de `SkillNamed()`, mas usa `criteria.Text`: o nome deve satisfazer `nameCriteria.Matches()`, e a especialização é resolvida por `skillSpecializationMatches()`.

**Confirmada.** `skillSpecializationMatches()` permite que uma Skill com especialização requerida seja correspondida pela especialização requerida ou, quando não vazia, pela especialização opcional. Quando não existe especialização requerida, o critério é aplicado somente à especialização opcional.

**Confirmada.** `BestSkillMatching()` chama `SkillMatching()`, recalcula cada candidato por `CalculateLevel(excludes)` e retorna o candidato de maior `Level`.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).SkillNamed`, `(*Entity).BestSkillNamed`, `(*Entity).SkillMatching`, `(*Entity).BestSkillMatching`, `skillSpecializationMatches`.

## Bônus de Spell

**Confirmada.** `SpellBonusFor(name, powerSource, colleges, tags, tooltip)` percorre `spellBonuses`, aplica replacements, exige `TagsCriteria.MatchesList(...)` e `MatchForType(...)`, e soma `AdjustedAmount()` dos bônus aceitos.

**Confirmada.** `SpellPointBonusFor(...)` executa a mesma sequência observada sobre `spellPointBonuses`.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).SpellBonusFor`, `(*Entity).SpellPointBonusFor`; `model/gurps/bonus_owner.go` — `bonusReplacements`.

## Bônus de Trait e máximos

**Confirmada.** `TraitBonusFor(name, tags, tooltip)` aplica replacements, exige correspondência de `NameCriteria` e `TagsCriteria`, soma `AdjustedAmount()` e registra os bônus aceitos no tooltip.

**Confirmada.** `TraitMaxLevelBonusesFor(name, tags, tooltip)` considera apenas `TraitMaxLevelBonus` com `SelectionType == traitsel.TraitWithName`, aplica replacements e exige correspondência de nome e tags. O método retorna a lista dos bônus correspondentes, sem somá-los nesse ponto.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).TraitBonusFor`, `(*Entity).TraitMaxLevelBonusesFor`; `model/gurps/bonus_owner.go` — `bonusReplacements`.

## Equipment e DR

**Confirmada.** `EquipmentMaxUsesBonusesFor(name, tags, tooltip)` considera apenas `EquipmentMaxUsesBonus` com `SelectionType == equipmentsel.EquipmentWithName`, aplica replacements e exige correspondência de nome e tags; retorna os bônus correspondentes.

**Confirmada.** `AddDRBonusesFor(locationID, tooltip, drMap)` percorre `drBonuses`. Um bônus é aceito quando uma de suas locations é `AllID` e a location solicitada é top-level no `BodyType`, ou quando a location coincide com `locationID` sem distinção de maiúsculas/minúsculas. O valor adicionado ao mapa é `AdjustedAmount()` convertido para inteiro, indexado pela especialização em minúsculas.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).EquipmentMaxUsesBonusesFor`, `(*Entity).AddDRBonusesFor`; `model/gurps/bonus_owner.go` — `bonusReplacements`.

## Bônus de Weapon

**Confirmada.** `AddWeaponWithSkillBonusesFor(...)` determina inicialmente o maior `RelativeLevel` entre as Skills retornadas por `SkillNamed(name, specialization, true, nil)`. Depois percorre `weaponBonuses` e exige: tipo permitido pelo mapa `allowedFeatureTypes`; `SelectionType == wsel.WithRequiredSkill`; correspondência de `RelativeLevelCriteria`; e correspondência de nome, especialização, uso e tags após replacements. Bônus aceitos são encaminhados a `addWeaponBonusToMap()`.

**Confirmada.** A chamada a `SkillNamed(..., true, nil)` nesse caminho usa o matching confirmado acima: Techniques são elegíveis independentemente de pontos; demais Skills exigem `AdjustedPoints(nil) > 0`; nome é exato sem distinção de caixa; e a especialização pode coincidir com a requerida ou opcional.

**Confirmada.** `AddNamedWeaponBonusesFor(...)` percorre `weaponBonuses`, exige tipo permitido, `SelectionType == wsel.WithName` e correspondência de nome, uso e tags antes de encaminhar o bônus a `addWeaponBonusToMap()`.

**Confirmada.** `addWeaponBonusToMap()` evita inserir novamente um mesmo ponteiro `*WeaponBonus` já presente no mapa. Para um bônus novo, calcula o valor usado no tooltip por `adjustedAmount()` com o número de dados fornecido e `DerivedLeveledOwner()`, e então marca o bônus no mapa.

**Confirmada.** O `DerivedLeveledOwner()` usado nesse caminho privilegia um sub-owner leveled sobre um owner leveled; na ausência de ambos, fornece um owner sintético com nível zero.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).AddWeaponWithSkillBonusesFor`, `(*Entity).AddNamedWeaponBonusesFor`, `addWeaponBonusToMap`, `(*Entity).SkillNamed`; `model/gurps/bonus_owner.go` — `(*BonusOwner).DerivedLeveledOwner`, `zeroLeveledOwner`.

## Limites desta passagem

- **Não confirmada:** como cada classe concreta de bônus conecta ou especializa `LeveledAmount`, além do comportamento genérico de `LeveledAmount.AdjustedAmount()` confirmado acima.
- **Não confirmada:** implementação interna de `SpellBonus.MatchForType()` e `SpellPointBonus.MatchForType()`.
- **Não confirmada:** implementação interna dos critérios `Matches()`/`MatchesList()` usados pelos consumidores.
