# GCS — Weapons

Escopo desta passagem: estrutura, identidade, criação, clonagem, persistência, ownership e resolução de nível observadas diretamente em `model/gurps/weapon.go` do repositório público `richardwilkes/gcs`, commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

## Estrutura persistida

**Confirmada.** `WeaponData` contém os dados escritos em disco: `TID`, `SubVersion`, `Damage`, `Strength`, `Usage`, `UsageNotes`, `Reach`, `Parry`, `Block`, `Accuracy`, `Range`, `RateOfFire`, `Shots`, `Bulk`, `Recoil`, `Defaults` e `Hide`.

Rastreabilidade: `model/gurps/weapon.go` — tipo `WeaponData`.

**Confirmada.** `Weapon` incorpora `WeaponData` e acrescenta `Owner`, `ClonedFromTID`, `NotEquipped` e `NotCarried`. Esses quatro campos não pertencem a `WeaponData`.

Rastreabilidade: `model/gurps/weapon.go` — tipo `Weapon`.

**Confirmada.** O proprietário de uma Weapon deve satisfazer `WeaponOwner`, que exige `fmt.Stringer`, `nameable.Accesser` e os métodos `DataOwner()`, `ResolveLocalNotes()`, `FeatureList()`, `TagList()` e `RatedStrength()`.

Rastreabilidade: `model/gurps/weapon.go` — interface `WeaponOwner`.

## Identidade e tipos

**Confirmada.** A distinção melee/ranged é codificada no kind do `TID`. `weaponKind(true)` retorna `kinds.WeaponMelee`; `weaponKind(false)` retorna `kinds.WeaponRanged`. `IsMelee()` e `IsRanged()` testam o `TID` por esses kinds.

Rastreabilidade: `model/gurps/weapon.go` — `weaponKind`, `(*Weapon).IsMelee`, `(*Weapon).IsRanged`.

## Construção

**Confirmada.** `NewWeapon(owner, melee)` cria um novo TID do kind correspondente, define `Damage.Type` como `"cr"`, `Damage.StrengthMultiplier` como `fxp.One`, `Damage.ArmorDivisor` como `fxp.One`, `Damage.FragmentationArmorDivisor` como `fxp.One` e associa `Owner`.

**Confirmada.** Para melee, `NewWeapon()` define `Reach.Min = 1`, `Reach.Max = 1` e `Damage.StrengthType = stdmg.Thrust`. Para ranged, define `RateOfFire.Mode1.ShotsPerAttack = 1` e `Damage.Base = "1d"`.

Rastreabilidade: `model/gurps/weapon.go` — `NewWeapon`.

## Clonagem

**Confirmada.** `CloneWeapons()` clona cada Weapon chamando `Weapon.Clone()`.

**Confirmada.** `Weapon.Clone()` copia a estrutura por valor. Quando `preserveID` é falso, cria novo TID mantendo o mesmo kind e registra o TID original em `ClonedFromTID`.

**Confirmada.** A clonagem substitui `Damage` por um clone associado à nova Weapon e realiza cópia independente de cada `SkillDefault` em `Defaults`.

Rastreabilidade: `model/gurps/weapon.go` — `CloneWeapons`, `(*Weapon).Clone`.

## Filtragem observada

**Confirmada.** `ExtractWeaponsOfType()` filtra uma lista por `IsMelee()` e, quando `excludeHidden` é verdadeiro, exclui Weapons com `Hide=true`.

**Confirmada.** `SeparateWeapons()` divide a entrada em listas melee e ranged, aplicando a mesma exclusão opcional por `Hide`.

Rastreabilidade: `model/gurps/weapon.go` — `ExtractWeaponsOfType`, `SeparateWeapons`.

## Serialização

**Confirmada.** `MarshalJSONTo()` força `SubVersion` para `currentWeaponSubVersion`, atualmente `1`, e serializa `WeaponData` acompanhado de um objeto calculado opcional `calc`.

**Confirmada.** `calc` pode conter `level`, `damage`, `parry`, `block`, `accuracy`, `reach`, `range`, `rate_of_fire`, `shots`, `bulk`, `recoil` e `strength`. `level` é produzido por `SkillLevel(nil).Max(0)` e `damage` por `Damage.ResolvedDamage(nil)`.

**Confirmada.** Para melee, a serialização zera no `WeaponData` serializado os campos `Accuracy`, `Range`, `RateOfFire`, `Shots`, `Bulk` e `Recoil`. Para ranged, zera `Parry`, `Block` e `Reach`.

**Confirmada.** Para os valores resolvidos de `Strength` e dos campos específicos de melee/ranged, `calc` conserva a string apenas quando ela difere da representação não resolvida correspondente. Se todo o `calc` resultar vazio, `Calc` é definido como `nil` antes da serialização.

Rastreabilidade: `model/gurps/weapon.go` — `currentWeaponSubVersion`, `(*Weapon).MarshalJSONTo`.

## Desserialização e migração observada

**Confirmada.** `UnmarshalJSONFrom()` lê `WeaponData` e também aceita o campo legado `type`. Se o `TID` lido não for válido, cria novo TID; `type == "melee_weapon"` seleciona o kind melee e qualquer outro valor segue o ramo ranged. Em seguida atribui `WeaponData` e chama `Validate()`.

Rastreabilidade: `model/gurps/weapon.go` — `(*Weapon).UnmarshalJSONFrom`.

## Ownership e ciclo de vida observado

**Confirmada.** `SetOwner()` substitui `Weapon.Owner`, associa `Damage.Owner` à própria Weapon e executa `performDataSubVersionFixups()`.

**Confirmada.** No fixup de subversão `0`, quando o owner implementa `IsLeveled() bool` e retorna verdadeiro, o conteúdo de `Damage.Base` é movido para `Damage.BaseLeveled` e `Damage.Base` é esvaziado. Ao final, `SubVersion` é definido como `currentWeaponSubVersion`.

**Confirmada.** `DataOwner()` delega ao `DataOwner()` do owner e retorna `nil` quando não há owner. `Entity()` obtém esse `DataOwner` e retorna `OwningEntity()`, ou `nil` quando não existe `DataOwner`. `Weapon.SetDataOwner()` não executa operação.

Rastreabilidade: `model/gurps/weapon.go` — `(*Weapon).SetOwner`, `(*Weapon).performDataSubVersionFixups`, `(*Weapon).DataOwner`, `(*Weapon).SetDataOwner`, `(*Weapon).Entity`.

## Resolução do nível da Weapon

**Confirmada.** `SkillLevel()` retorna `0` quando `Entity()` é `nil`. Havendo Entity, calcula um ajuste comum como a soma de `skillLevelBaseAdjustment()` e `skillLevelPostAdjustment()`, percorre todos os `Defaults` e chama `SkillDefault.SkillLevelFast(entity, replacements, false, nil, true)`. Defaults que retornam `fxp.Min` são ignorados; para os demais, o ajuste comum é somado e o maior nível resultante é conservado. Se nenhum default produzir nível, retorna `0`; o resultado final também é limitado inferiormente a `0`.

**Confirmada.** `skillLevelBaseAdjustment()` resolve a ST mínima da Weapon e subtrai dela uma capacidade da Entity conforme `Damage.StrengthType` e o tipo de Weapon: `TelekineticStrength()` para `TelekineticThrust`/`TelekineticSwing`; atributo corrente `IntelligenceID`, limitado inferiormente a zero e truncado por `Floor()`, para `IQThrust`/`IQSwing`; `StrikingStrength()` para Weapon não-ranged ou ranged muscle-powered que não usa o default nominal `Crossbow`; `LiftingStrength()` no ramo restante. Se a diferença resultante for positiva, ela é aplicada negativamente ao ajuste de nível.

**Confirmada.** O mesmo ajuste-base soma `AdjustedAmount()` dos resultados de `Entity.NamedWeaponSkillBonusesFor()` e também bônus `SkillBonus` de seleção `skillsel.ThisWeapon` encontrados nas Features do owner e, quando o owner é `Trait` ou `Equipment`, nas Features de seus modificadores percorridos por `Traverse()`. Nesses bônus locais, `SpecializationCriteria` deve corresponder ao `UsageWithReplacements()` da Weapon.

**Confirmada.** `skillLevelPostAdjustment()` acrescenta `EncumbrancePenalty()` somente quando a Weapon é melee e os valores resolvidos de `CanParry` e `Fencing` são ambos verdadeiros. `EncumbrancePenalty()` usa `Entity.EncumbranceLevel(true).Penalty()`.

Rastreabilidade: `model/gurps/weapon.go` — `(*Weapon).SkillLevel`, `(*Weapon).usesCrossbowSkill`, `(*Weapon).skillLevelBaseAdjustment`, `(*Weapon).skillLevelPostAdjustment`, `(*Weapon).EncumbrancePenalty`, `(*Weapon).extractSkillBonusForThisWeapon`.

## Resolução de flags observada

**Confirmada.** `ResolveBoolFlag()` devolve o valor inicial quando não há Entity. Havendo Entity, coleta `WeaponBonus` de tipo `feature.WeaponSwitch` e conta, para o `SwitchType` solicitado, quantos têm `SwitchTypeValue=true` e quantos têm `false`. Maioria verdadeira resolve para `true`, maioria falsa para `false`; empate conserva o valor inicial.

Rastreabilidade: `model/gurps/weapon.go` — `(*Weapon).ResolveBoolFlag`.

## Questões mantidas em aberto

**Não confirmada nesta passagem.** Implementação completa de `Validate()` e suas normalizações.

**Não confirmada nesta passagem.** Implementação interna de `SkillDefault.SkillLevelFast()` usada por `Weapon.SkillLevel()`.

**Não confirmada nesta passagem.** Implementação interna de `WeaponDamage.ResolvedDamage()` e dos métodos `Resolve()` das estruturas de combate.

**Não confirmada nesta passagem.** Implementação integral de `collectWeaponBonuses()` e dos caminhos de resolução de cada tipo concreto de `WeaponBonus`, além dos consumidores diretamente observados nesta passagem.
