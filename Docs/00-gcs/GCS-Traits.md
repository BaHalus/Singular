# GCS — Traits: estrutura, relacionamentos e ciclo de vida

> Escopo: comportamento diretamente observado no código-fonte público de `richardwilkes/gcs`. Não contém decisões da SINGULAR.

## Convenção de evidência

- **Confirmada** — comportamento diretamente observado na implementação citada.
- **Indicação** — evidência parcial observada, insuficiente para afirmar o comportamento completo.
- **Não confirmada** — questão registrada sem evidência suficiente; não é tratada como fato.

## Estrutura persistida

**Confirmada.** `Trait` incorpora `TraitData` e acrescenta em runtime `owner DataOwner` e `UnsatisfiedReason`. `TraitData` contém `SourcedID`, os dados editáveis, `ThirdParty`, `Children` e o ponteiro privado `parent`. O campo `Children` é serializado como `children`; `parent` não possui tag JSON e é usado como relacionamento de runtime.

**Confirmada.** `TraitEditData` persiste, entre outros campos, `Modifiers`, `SelfControl`, `Frequency` e `Disabled`. Os dados sincronizáveis comuns incluem `Name`, referências, notas, tags, `Prereq` e ajuste de autocontrole. Para Traits não-container, os dados incluem `BasePoints`, `PointsPerLevel`, `MaxLevels`, `Weapons`, `Features`, `RoundCostDown`, `CanLevel`, `Levels` e estudo. Para containers, incluem `Ancestry`, `TemplatePicker` e `ContainerType`.

Rastreabilidade: `model/gurps/trait.go` — tipos `Trait`, `TraitData`, `TraitEditData`, `TraitSyncData`, `TraitNonContainerOnlyEditData`, `TraitNonContainerSyncData`, `TraitContainerSyncData`.

## Identidade e containers

**Confirmada.** `NewTrait()` cria um TID usando `kinds.TraitContainer` quando `isContainer` é verdadeiro e `kinds.Trait` nos demais casos. `Container()` determina o tipo consultando o kind do TID. Na criação de container, `TemplatePicker` é inicializado e o estado aberto é definido conforme `isContainer`.

**Confirmada.** `HasChildren()` só retorna verdadeiro quando o Trait é container e `Children` não está vazio. `Parent()`/`SetParent()` operam sobre o ponteiro privado `parent`; `Depth()` percorre essa cadeia até `nil`.

Rastreabilidade: `model/gurps/trait.go` — `NewTrait`, `traitKind`, `(*Trait).Container`, `(*Trait).HasChildren`, `(*Trait).Parent`, `(*Trait).SetParent`, `(*Trait).Depth`.

## Ownership e relacionamentos de runtime

**Confirmada.** `SetDataOwner(owner)` grava o owner no Trait. Em containers, propaga o mesmo owner recursivamente aos filhos. Em Traits não-container, chama `SetOwner(t)` em cada `Weapon`. Em todos os casos, percorre `Modifiers`, chama `setTrait(t)` e depois `SetDataOwner(owner)` em cada `TraitModifier`.

**Confirmada.** O vínculo Trait → Weapon é explicitado também pela declaração de que `*Trait` implementa `WeaponOwner`.

Rastreabilidade: `model/gurps/trait.go` — declarações de interface no topo do arquivo; `(*Trait).DataOwner`, `(*Trait).SetDataOwner`; tipos `Weapon`, `TraitModifier`.

## Clonagem

**Confirmada.** `Clone()` cria outro Trait com o mesmo estado container/não-container, ajusta a origem por `AdjustSource`, preserva o estado aberto, copia `ThirdParty`, executa `CopyFrom` e propaga estado de nota fechada. Quando existem filhos, cada filho é clonado recursivamente usando o novo Trait como `parent` e o mesmo `owner` recebido pelo clone.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).Clone`.

## Desserialização e reconstrução de relacionamentos

**Confirmada.** `UnmarshalJSONFrom()` aceita campos legados. Quando o TID carregado não é válido, cria um novo TID e decide entre Trait e Trait container pelo sufixo do antigo campo `type`; nesse caso também preserva o antigo estado `open`.

**Confirmada.** Para Trait não-container, níveis negativos são normalizados para zero; se `Levels` ou `PointsPerLevel` forem diferentes de zero, `CanLevel` é forçado para verdadeiro.

**Confirmada.** Após a desserialização de um container, o método percorre `Children` e atribui diretamente `one.parent = t`, reconstruindo a cadeia pai-filho de runtime.

**Confirmada.** `NewTraitsFromFile()` carrega `traitListData`, valida a versão e percorre toda a árvore chamando `trait.SetDataOwner(nil)`. Essa chamada configura também os vínculos de Weapons e TraitModifiers descritos acima.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).UnmarshalJSONFrom`, `NewTraitsFromFile`, `(*Trait).SetDataOwner`; tipo `traitListData`.

## Persistência

**Confirmada.** Uma biblioteca/lista de Traits é persistida como `traitListData`, contendo `Version` e `Rows`. `SaveTraits()` grava essa estrutura com `Version: jio.CurrentDataVersion`; `NewTraitsFromFile()` usa `jio.Load()` e rejeita versão inválida via `jio.CheckVersion()`.

**Confirmada.** `MarshalJSONTo()` chama `ClearUnusedFieldsForType()` antes da serialização e acrescenta um bloco calculado `calc`. Nesse bloco, `points` recebe `AdjustedPoints()` e `unsatisfied_reason` recebe `UnsatisfiedReason`; notas resolvidas só são gravadas quando diferem de `LocalNotes`, e `current_level` só é incluído quando `IsLeveled()` é verdadeiro.

Rastreabilidade: `model/gurps/trait.go` — `traitListData`, `SaveTraits`, `NewTraitsFromFile`, `(*Trait).MarshalJSONTo`.

## Estado habilitado herdado

**Confirmada.** `EffectivelyDisabled()` retorna verdadeiro quando o próprio Trait está `Disabled` ou quando qualquer Trait na cadeia de `Parent()` está `Disabled`.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).EffectivelyDisabled`.

## Custo e níveis

O algoritmo de custo de Traits está documentado separadamente em `GCS-Trait-Pricing.md`; este documento não o duplica.

**Confirmada.** `IsLeveled()` exige simultaneamente `CanLevel` e que o Trait não seja container. `CurrentLevel()` retorna zero quando o Trait não está habilitado; quando habilitado, `internalCurrentLevel()` soma `Levels` a eventual `Entity.TraitBonusFor(...)` e limita o resultado inferiormente a zero.

Rastreabilidade: `model/gurps/trait.go` — `(*Trait).IsLeveled`, `(*Trait).CurrentLevel`, `(*Trait).internalCurrentLevel`.

## Questões em aberto

Nenhuma conclusão adicional sobre sincronização com fontes de biblioteca, implementação de `CopyFrom()` ou semântica interna de `ClearUnusedFieldsForType()` é registrada aqui sem inspeção direta dessas implementações.
