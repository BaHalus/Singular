# GCS — Templates

Este documento registra exclusivamente comportamento observado diretamente na implementação pública de `richardwilkes/gcs`.

## Evidência principal

- `model/gurps/template.go`
- tipos: `Template`, `TemplateData`
- métodos/funções: `NewTemplateFromFile`, `NewTemplate`, `MarshalJSONTo`, `UnmarshalJSONFrom`, `Save`, `EnsureAttachments`, `SyncWithLibrarySources`

## Estrutura persistida

**Confirmada.** `Template` incorpora `TemplateData` e mantém fora de `TemplateData` os campos `srcMatcher`, `ExplicitModifiedOn` e `ExplicitPageTitle`.

**Confirmada.** `TemplateData` é declarado como o conjunto de dados escrito em disco e contém `Version`, `ID`, `Traits`, `Skills`, `Spells`, `Equipment`, `Notes` e `BodyType`.

Rastreabilidade: `model/gurps/template.go` — `Template`, `TemplateData`.

## Identidade e construção

**Confirmada.** `NewTemplate()` cria um `Template` e atribui a `ID` um novo TID do kind `kinds.Template` por `tid.MustNewTID(kinds.Template)`.

**Confirmada.** `UnmarshalJSONFrom()` substitui a ID quando ela não satisfaz `tid.IsKindAndValid(t.ID, kinds.Template)`, gerando novo TID do kind Template.

Rastreabilidade: `model/gurps/template.go` — `NewTemplate`, `(*Template).UnmarshalJSONFrom`.

## Carga e persistência

**Confirmada.** `NewTemplateFromFile()` carrega o arquivo por `jio.Load`, valida `Version` com `jio.CheckVersion` e retorna o Template carregado.

**Confirmada.** `MarshalJSONTo()` chama `EnsureAttachments()`, define `Version = jio.CurrentDataVersion` e serializa `TemplateData`.

**Confirmada.** `Save()` chama `AdjustEquipmentUsesForSave(t.Equipment)` antes de `jio.SaveToFile(filePath, t)`.

**Confirmada.** Durante desserialização, `UnmarshalJSONFrom()` aceita o campo legado JSON `advantages`; ele é usado como `Traits` somente quando `Traits` é `nil` e `advantages` não é `nil`.

**Confirmada.** Ao final de `UnmarshalJSONFrom()`, `EnsureAttachments()` é chamado.

Rastreabilidade: `model/gurps/template.go` — `NewTemplateFromFile`, `(*Template).MarshalJSONTo`, `(*Template).UnmarshalJSONFrom`, `(*Template).Save`.

## Relacionamentos e ownership

**Confirmada.** `Template` implementa `ListProvider` e `DataOwner` conforme as asserções de interface no arquivo.

**Confirmada.** `DataOwner()` retorna o próprio Template. `OwningEntity()` retorna `nil`.

**Confirmada.** Para `ListProvider`, `TraitList`, `SkillList`, `SpellList`, `NoteList` e seus setters operam diretamente sobre os respectivos campos de `TemplateData`.

**Confirmada.** `CarriedEquipmentList()` retorna `t.Equipment` e `SetCarriedEquipmentList()` substitui esse campo. `OtherEquipmentList()` retorna `nil` e `SetOtherEquipmentList()` não altera estado.

**Confirmada.** `EnsureAttachments()` percorre Traits, Skills, Spells, Equipment e Notes de primeiro nível e chama `SetDataOwner(t)` em cada item.

Rastreabilidade: `model/gurps/template.go` — asserções de interface; `DataOwner`, `OwningEntity`, métodos de `ListProvider`, `EnsureAttachments`.

## Sincronização com fontes de biblioteca

**Confirmada.** `SyncWithLibrarySources()` percorre recursivamente Traits e chama `SyncWithSource()` em cada Trait; para cada Trait também percorre seus `Modifiers` e chama `TraitModifier.SyncWithSource()`.

**Confirmada.** O mesmo método percorre Skills e Spells chamando `SyncWithSource()` em cada item.

**Confirmada.** Para Equipment, percorre os itens, chama `Equipment.SyncWithSource()` e percorre os `Modifiers` de cada Equipment chamando `EquipmentModifier.SyncWithSource()`.

**Confirmada.** Notes também são percorridas e recebem `SyncWithSource()`.

Rastreabilidade: `model/gurps/template.go` — `(*Template).SyncWithLibrarySources`; tipos `Trait`, `TraitModifier`, `Skill`, `Spell`, `Equipment`, `EquipmentModifier`, `Note`.

## Questões não confirmadas nesta passagem

- **Não confirmada:** comportamento de `SyncWithSource()` dentro de cada tipo concreto; esta passagem confirma apenas o despacho realizado por `Template.SyncWithLibrarySources()`.
- **Não confirmada:** implementação interna de `AdjustEquipmentUsesForSave()`; esta passagem confirma apenas que `Template.Save()` a invoca antes da persistência.
- **Não confirmada:** semântica e persistência interna de `Body`; esta passagem confirma somente que `TemplateData.BodyType` é um `*Body` serializado como `body_type` quando não vazio.
