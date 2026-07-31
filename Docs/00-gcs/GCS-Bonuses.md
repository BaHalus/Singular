# GCS — consumo confirmado de bônus pela `Entity`

## Escopo e evidência

Este documento registra somente comportamento observado diretamente em `richardwilkes/gcs`.

Fonte principal: `model/gurps/entity.go`, tipo `Entity` e métodos `AttributeBonusFor`, `CostReductionFor`, `SkillBonusFor`, `SkillPointBonusFor`, `SpellBonusFor`, `SpellPointBonusFor`, `TraitBonusFor`, `TraitMaxLevelBonusesFor`, `EquipmentMaxUsesBonusesFor`, `AddDRBonusesFor`, `AddWeaponWithSkillBonusesFor`, `AddNamedWeaponBonusesFor` e `NamedWeaponSkillBonusesFor`.

## Coleções internas

**Confirmada.** `Entity` mantém as features já processadas em um campo interno `features`. Entre suas coleções estão `attributeBonuses`, `costReductions`, `drBonuses`, `maxUsesBonuses`, `skillBonuses`, `skillPointBonuses`, `spellBonuses`, `spellPointBonuses`, `traitBonuses`, `traitMaxLevelBonuses` e `weaponBonuses`.

**Confirmada.** `processFeature()` classifica instâncias concretas de Feature e as acrescenta às coleções correspondentes. Antes desse despacho, objetos que implementam `Bonus` recebem owner, sub-owner e leveled owner; objetos que implementam `Override` recebem owner e sub-owner.

Rastreabilidade: `model/gurps/entity.go` — `features`, `(*Entity).processFeature`.

## Bônus de atributo e redução de custo

**Confirmada.** `AttributeBonusFor(attributeID, limitation, tooltip)` soma `AdjustedAmount()` apenas dos `AttributeBonus` cuja `ActualLimitation()` coincide com a limitação solicitada e cujo `Attribute` coincide exatamente com `attributeID`. Cada bônus aceito é acrescentado ao tooltip por `AddToTooltip()`.

**Confirmada.** `CostReductionFor(attributeID)` soma `Percentage` dos `CostReduction` cujo `Attribute` coincide com `attributeID`, limita o total superior a 80 e retorna no mínimo zero.

**Confirmada.** `processFeatures()` usa esses dois consumidores para preencher `Attribute.Bonus` e `Attribute.CostReduction`. Quando a definição do atributo não permite decimal, o bônus é arredondado para baixo por `Floor()`.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).processFeatures`, `(*Entity).AttributeBonusFor`, `(*Entity).CostReductionFor`.

## Bônus de Skill

**Confirmada.** `SkillBonusFor(name, specialization, optionalSpecialization, tags, tooltip)` considera apenas `SkillBonus` com `SelectionType == skillsel.Name`. Para cada candidato, obtém replacements por `bonusReplacements()` e exige correspondência simultânea de `NameCriteria`, `SpecializationCriteria`, `OptionalSpecializationCriteria` e `TagsCriteria`. Os bônus aceitos contribuem com `AdjustedAmount()` e com `AddToTooltip()`.

**Confirmada.** `SkillPointBonusFor(...)` percorre `skillPointBonuses`, aplica replacements e os mesmos quatro grupos de critérios de nome, especialização, especialização opcional e tags; os correspondentes são somados por `AdjustedAmount()`.

**Confirmada.** `NamedWeaponSkillBonusesFor(name, usage, tags, tooltip)` é um consumidor separado de `skillBonuses`: seleciona apenas `SelectionType == skillsel.WeaponsWithName`, testa nome, uso por `SpecializationCriteria` e tags, e retorna os objetos `*SkillBonus` correspondentes em vez de somar seus valores.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).SkillBonusFor`, `(*Entity).SkillPointBonusFor`, `(*Entity).NamedWeaponSkillBonusesFor`.

## Bônus de Spell

**Confirmada.** `SpellBonusFor(name, powerSource, colleges, tags, tooltip)` percorre `spellBonuses`, aplica replacements, exige `TagsCriteria.MatchesList(...)` e `MatchForType(...)`, e soma `AdjustedAmount()` dos bônus aceitos.

**Confirmada.** `SpellPointBonusFor(...)` executa a mesma sequência observada sobre `spellPointBonuses`.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).SpellBonusFor`, `(*Entity).SpellPointBonusFor`.

## Bônus de Trait e máximos

**Confirmada.** `TraitBonusFor(name, tags, tooltip)` aplica replacements, exige correspondência de `NameCriteria` e `TagsCriteria`, soma `AdjustedAmount()` e registra os bônus aceitos no tooltip.

**Confirmada.** `TraitMaxLevelBonusesFor(name, tags, tooltip)` considera apenas `TraitMaxLevelBonus` com `SelectionType == traitsel.TraitWithName`, aplica replacements e exige correspondência de nome e tags. O método retorna a lista dos bônus correspondentes, sem somá-los nesse ponto.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).TraitBonusFor`, `(*Entity).TraitMaxLevelBonusesFor`.

## Equipment e DR

**Confirmada.** `EquipmentMaxUsesBonusesFor(name, tags, tooltip)` considera apenas `EquipmentMaxUsesBonus` com `SelectionType == equipmentsel.EquipmentWithName`, aplica replacements e exige correspondência de nome e tags; retorna os bônus correspondentes.

**Confirmada.** `AddDRBonusesFor(locationID, tooltip, drMap)` percorre `drBonuses`. Um bônus é aceito quando uma de suas locations é `AllID` e a location solicitada é top-level no `BodyType`, ou quando a location coincide com `locationID` sem distinção de maiúsculas/minúsculas. O valor adicionado ao mapa é `AdjustedAmount()` convertido para inteiro, indexado pela especialização em minúsculas.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).EquipmentMaxUsesBonusesFor`, `(*Entity).AddDRBonusesFor`.

## Bônus de Weapon

**Confirmada.** `AddWeaponWithSkillBonusesFor(...)` determina inicialmente o maior `RelativeLevel` entre as Skills retornadas por `SkillNamed(name, specialization, true, nil)`. Depois percorre `weaponBonuses` e exige: tipo permitido pelo mapa `allowedFeatureTypes`; `SelectionType == wsel.WithRequiredSkill`; correspondência de `RelativeLevelCriteria`; e correspondência de nome, especialização, uso e tags após replacements. Bônus aceitos são encaminhados a `addWeaponBonusToMap()`.

**Confirmada.** `AddNamedWeaponBonusesFor(...)` percorre `weaponBonuses`, exige tipo permitido, `SelectionType == wsel.WithName` e correspondência de nome, uso e tags antes de encaminhar o bônus a `addWeaponBonusToMap()`.

**Confirmada.** `addWeaponBonusToMap()` evita inserir novamente um mesmo ponteiro `*WeaponBonus` já presente no mapa. Para um bônus novo, calcula o valor usado no tooltip por `adjustedAmount()` com o número de dados fornecido e `DerivedLeveledOwner()`, e então marca o bônus no mapa.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).AddWeaponWithSkillBonusesFor`, `(*Entity).AddNamedWeaponBonusesFor`, `addWeaponBonusToMap`.

## Limites desta passagem

- **Não confirmada:** implementação interna de `bonusReplacements()`.
- **Não confirmada:** implementação interna de `AdjustedAmount()` de cada classe concreta de bônus.
- **Não confirmada:** implementação interna de `SpellBonus.MatchForType()` e `SpellPointBonus.MatchForType()`.
- **Não confirmada:** implementação interna dos critérios `Matches()`/`MatchesList()` usados pelos consumidores.
- **Não confirmada:** implementação interna de `SkillNamed()` usada na seleção de WeaponBonus por required skill.
