# GCS — Weapons

Escopo desta passagem: estrutura, identidade, criação, clonagem e persistência observadas diretamente em `model/gurps/weapon.go` do repositório público `richardwilkes/gcs`, commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

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

## Questões mantidas em aberto

**Não confirmada nesta passagem.** Implementação completa de `Validate()` e suas normalizações.

**Não confirmada nesta passagem.** Algoritmo de `SkillLevel()` e resolução dos elementos de `Defaults`.

**Não confirmada nesta passagem.** Implementação interna de `WeaponDamage.ResolvedDamage()` e dos métodos `Resolve()` das estruturas de combate.

**Não confirmada nesta passagem.** Relação concreta de ciclo de vida entre `Weapon.Owner` e cada tipo que implementa `WeaponOwner`, além do contrato da interface observado neste arquivo.
