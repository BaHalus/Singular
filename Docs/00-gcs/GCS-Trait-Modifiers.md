# GCS — TraitModifier: custo, níveis e persistência

> Escopo: comportamento diretamente observado no código-fonte público de `richardwilkes/gcs`, commit `49cb0baddb44d15421e13138a7b1b104d4a12163`. Não contém decisões da SINGULAR.

## Estrutura persistida

**Confirmada.** `TraitModifier` incorpora `TraitModifierData` e mantém, fora da estrutura serializada, `owner DataOwner` e `trait *Trait`. `TraitModifierData` contém `SourcedID`, os dados editáveis, `ThirdParty`, `Children` e o ponteiro privado `parent`.

**Confirmada.** Para modificadores não-container, `TraitModifierNonContainerSyncData` persiste `CostAdj`, `UseLevelFromTrait`, `ShowNotesOnWeapon`, `Affects` e `Features`. `TraitModifierEditDataNonContainerOnly` acrescenta `Levels` e `Disabled`.

Rastreabilidade: `model/gurps/trait_modifier.go` — tipos `TraitModifier`, `TraitModifierData`, `TraitModifierEditDataNonContainerOnly`, `TraitModifierNonContainerSyncData`.

## Migração e restauração da árvore

**Confirmada.** `UnmarshalJSONFrom()` migra dados antigos que ainda usam `cost` e `cost_type` quando `CostAdj` está vazio e `cost` é diferente de zero: `points` é convertido para o número sem sufixo; `multiplier` recebe prefixo `x`; os demais casos recebem sufixo `%`.

**Confirmada.** Depois da desserialização, quando o modificador é container, `UnmarshalJSONFrom()` percorre `Children` e restaura diretamente `one.parent = t`.

Rastreabilidade: `model/gurps/trait_modifier.go` — `(*TraitModifier).UnmarshalJSONFrom`.

## Tipo e valor do ajuste de custo

**Confirmada.** `CostModifierType()` não interpreta diretamente o ajuste: delega a classificação de `CostAdj` para `emweight.ValueFromString(t.CostAdj)`.

**Confirmada.** `CostModifier()` obtém primeiro uma fração por `t.CostModifierType().ExtractFraction(t.CostAdj)`. Em seguida multiplica apenas o numerador dessa fração por `t.CostMultiplier()`, chama `Normalize()` e devolve a fração resultante.

Rastreabilidade: `model/gurps/trait_modifier.go` — `(*TraitModifier).CostModifierType`, `(*TraitModifier).CostModifier`; tipo `emweight.Value`; tipo `fxp.Fraction`.

## Nivelamento e multiplicador

**Confirmada.** `IsLeveled()` retorna falso para containers. Em modificadores não-container com `UseLevelFromTrait`, exige que `trait` esteja associado e que `trait.IsLeveled()` seja verdadeiro. Sem `UseLevelFromTrait`, considera o modificador nivelado quando `Levels > 0`.

**Confirmada.** `RawCurrentLevel()` usa `trait.CurrentLevel()` quando `UseLevelFromTrait` está ativo e o Trait associado é nivelado; caso contrário usa `Levels`.

**Confirmada.** `CostMultiplier()` retorna `fxp.One` quando o modificador não é nivelado. Quando é nivelado, delega a `CostMultiplierForTraitModifier()`.

**Confirmada.** `CostMultiplierForTraitModifier()` escolhe `trait.CurrentLevel()` quando `useLevelFromTrait` é verdadeiro e existe Trait nivelado; caso contrário usa `baseLevels`. Se o valor obtido for menor ou igual a zero, substitui-o por `fxp.One`.

**Confirmada.** `CurrentLevel()` só devolve `CostMultiplier()` quando o modificador está habilitado e é nivelado; nos demais casos devolve zero.

Rastreabilidade: `model/gurps/trait_modifier.go` — `(*TraitModifier).IsLeveled`, `(*TraitModifier).RawCurrentLevel`, `(*TraitModifier).CostMultiplier`, `CostMultiplierForTraitModifier`, `(*TraitModifier).CurrentLevel`.

## Habilitação

**Confirmada.** `Enabled()` devolve `!Disabled || Container()`. Portanto, um container é considerado habilitado independentemente do campo `Disabled`.

**Confirmada.** `SetEnabled()` só altera `Disabled` quando o nó não é container.

**Confirmada.** `ClearUnusedFieldsForType()` zera todos os campos exclusivos de não-container quando o modificador é container; quando não é container, elimina `Children`.

Rastreabilidade: `model/gurps/trait_modifier.go` — `(*TraitModifier).Enabled`, `(*TraitModifier).SetEnabled`, `(*TraitModifier).ClearUnusedFieldsForType`.

## Associação ao Trait

**Confirmada.** `setTrait()` grava o ponteiro privado `trait`. Quando existem `Replacements`, transfere para `trait.Replacements` apenas chaves ainda ausentes e depois limpa `t.Replacements`. Em containers, propaga recursivamente a associação aos filhos.

Rastreabilidade: `model/gurps/trait_modifier.go` — `(*TraitModifier).setTrait`.

## Limites desta passagem

- **Não confirmada:** a gramática interna usada por `emweight.ValueFromString()` para classificar todas as formas possíveis de `CostAdj`; o presente documento confirma apenas que `TraitModifier` delega essa classificação.
- **Não confirmada:** a implementação interna de `emweight.Value.ExtractFraction()`; está confirmado apenas que seu resultado é a fração que `CostModifier()` escala pelo multiplicador de níveis.
- **Não confirmada:** efeitos posteriores de `Features` pertencentes ao modificador fora dos pontos já documentados no fluxo de coleta da `Entity`; exigem rastreamento específico das features concretas.
