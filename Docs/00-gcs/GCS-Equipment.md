# GCS — Equipment: estrutura e persistência

## Escopo e evidência

Este documento registra exclusivamente comportamento observado no código-fonte público de `richardwilkes/gcs`, no commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

Fonte principal desta passagem: `model/gurps/equipment.go`, tipos `Equipment`, `EquipmentData`, `EquipmentEditData`, `EquipmentSyncData` e funções/métodos associados citados abaixo.

## Estrutura persistida

**Confirmada.** `Equipment` incorpora `EquipmentData` e mantém `owner DataOwner` e `UnsatisfiedReason string` fora de `EquipmentData`.

**Confirmada.** `EquipmentData` persiste `SourcedID`, `EquipmentEditData`, `ThirdParty` e `Children`. O ponteiro `parent *Equipment` pertence à estrutura, mas não possui tag JSON e não integra a representação persistida declarada.

**Confirmada.** `EquipmentEditData` contém `VTTNotes`, `Replacements`, `Modifiers`, `RatedST`, `Quantity`, `Level`, `Uses` e `Equipped`.

**Confirmada.** `EquipmentSyncData` contém `Name`, referências de página, notas locais, `TechLevel`, `LegalityClass`, `Tags`, `BaseValue`, `BaseWeight`, `MaxUses`, `Prereq`, `Weapons`, `Features` e `WeightIgnoredForSkills`.

Rastreabilidade: `model/gurps/equipment.go`: `Equipment`, `EquipmentData`, `EquipmentEditData`, `EquipmentSyncData`.

## Identidade, containers e hierarquia

**Confirmada.** `NewEquipment(owner, parent, container)` cria um TID por `equipmentKind(container)`. Containers usam `kinds.EquipmentContainer`; itens não-container usam `kinds.Equipment`.

**Confirmada.** Na criação, `Name` recebe `Kind()`, `LegalityClass` recebe `"4"`, `Quantity` recebe `fxp.One`, `Equipped` é definido como `true`, e `parent` e `owner` recebem os argumentos fornecidos. `SetOpen(container)` deixa o estado aberto alinhado ao argumento de container na criação.

**Confirmada.** `Container()` decide o tipo pelo kind do TID. `HasChildren()` só retorna verdadeiro quando o item é container e `Children` não está vazio. `Parent()`/`SetParent()` operam sobre o ponteiro privado `parent`.

**Confirmada.** `Clone()` cria uma nova instância e, quando existem filhos, clona-os recursivamente passando o clone corrente como `parent` dos filhos clonados.

Rastreabilidade: `model/gurps/equipment.go`: `NewEquipment`, `equipmentKind`, `Container`, `HasChildren`, `Parent`, `SetParent`, `Clone`.

## Carga e salvamento de listas

**Confirmada.** O formato de lista usado por `NewEquipmentFromFile()` e `SaveEquipment()` é `equipmentListData`, composto por `Version` e `Rows []*Equipment`.

**Confirmada.** `NewEquipmentFromFile()` usa `jio.Load`, valida `Version` com `jio.CheckVersion` e percorre as linhas carregadas chamando `SetDataOwner(nil)`.

**Confirmada.** `SaveEquipment()` chama `AdjustEquipmentUsesForSave(equipment)` antes de `jio.SaveToFile`; o arquivo recebe `jio.CurrentDataVersion` e as linhas fornecidas.

Rastreabilidade: `model/gurps/equipment.go`: `equipmentListData`, `NewEquipmentFromFile`, `SaveEquipment`.

## Serialização de um Equipment

**Confirmada.** `MarshalJSONTo()` chama `ClearUnusedFieldsForType()` antes de montar a saída.

**Confirmada.** Além de `EquipmentData`, a serialização inclui um objeto `calc` com valores derivados: `value`, `extended_value`, `weight`, `extended_weight`, `extended_weight_for_skills` quando aplicável, `resolved_notes` quando diferem de `LocalNotes`, e `unsatisfied_reason` quando não vazio.

**Confirmada.** Os campos de valor e peso de `calc` são obtidos respectivamente por `AdjustedValue()`, `ExtendedValue()`, `AdjustedWeight(false, defUnits)` e `ExtendedWeight(false, defUnits)`, usando as unidades padrão de peso de `SheetSettingsFor(EntityFromNode(e))`.

**Confirmada.** `extended_weight_for_skills` só é preenchido quando `WeightIgnoredForSkills` é verdadeiro e `ReallyEquipped()` é verdadeiro; nesse caso é calculado por `ExtendedWeight(true, defUnits)`.

Rastreabilidade: `model/gurps/equipment.go`: `Equipment.MarshalJSONTo`.

## Desserialização e migrações observadas

**Confirmada.** `UnmarshalJSONFrom()` aceita, além de `EquipmentData`, campos antigos `type`, `notes`, `categories`, `value`, `weight` e `open`.

**Confirmada.** Quando o TID carregado não é válido, o método cria um novo TID; a escolha entre equipment e container usa o sufixo de `Type`. Nesse caminho, o antigo `open` pode restaurar o estado aberto.

**Confirmada.** Se `BaseValue` estiver vazio e o antigo `value` for diferente de zero, `BaseValue` recebe sua representação textual. Se `BaseWeight` estiver vazio e o antigo `weight` for diferente de zero, `BaseWeight` recebe a formatação em libras (`fxp.Pound.Format`).

**Confirmada.** Se `LocalNotes` estiver vazio e o antigo campo `notes` existir, o valor é convertido por `EmbeddedExprToScript()`.

**Confirmada.** O método chama `ClearUnusedFieldsForType()`, converte categorias antigas em tags por `convertOldCategoriesToTags()` e ordena `Tags` com `slices.Sort()`.

**Confirmada.** Para containers, após a desserialização, cada filho recebe diretamente `one.parent = e`, reconstruindo o vínculo ascendente que não é persistido no campo privado.

Rastreabilidade: `model/gurps/equipment.go`: `Equipment.UnmarshalJSONFrom`.

## Relação com Weapons, Features e Prerequisites

**Confirmada.** `EquipmentSyncData` possui diretamente `Weapons []*Weapon`, `Features Features` e `Prereq *PrereqList`; portanto esses objetos fazem parte da estrutura de dados sincronizável/persistível declarada de Equipment.

**Não confirmada nesta passagem.** A semântica completa de atualização e cálculo das `Weapons` incorporadas não é estabelecida apenas pela presença do campo e requer rastreamento das implementações de Weapon.

**Não confirmada nesta passagem.** A aplicação integral das `Features` de Equipment no ciclo da Entity não é estabelecida neste documento; deve ser correlacionada com o fluxo já documentado de coleta/processamento da Entity.

**Não confirmada nesta passagem.** A avaliação interna de `PrereqList` não é inferida a partir do campo `Prereq`.

## Questões abertas desta passagem

- **Não confirmada:** pipeline interno de `AdjustedValue()` e `ExtendedValue()`.
- **Não confirmada:** pipeline interno de `AdjustedWeight()` e `ExtendedWeight()`.
- **Não confirmada:** semântica completa de `ReallyEquipped()`, inclusive propagação por containers ancestrais.
- **Não confirmada:** transformação de custo/peso realizada por `EquipmentModifier`.
- **Não confirmada:** comportamento das `Weapons` incorporadas ao Equipment além da estrutura observada.
