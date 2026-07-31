# GCS — Equipment: estrutura, persistência e cálculo

## Escopo e evidência

Este documento registra exclusivamente comportamento observado no código-fonte público de `richardwilkes/gcs`, no commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

Fontes desta passagem: `model/gurps/equipment.go` e `model/gurps/equipment_modifier.go`, tipos `Equipment`, `EquipmentModifier` e funções/métodos citados abaixo.

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

## Estado efetivo de equipamento e ownership

**Confirmada.** `ReallyEquipped()` retorna `false` quando o próprio item possui `Equipped == false` ou `Quantity <= 0`. Se o próprio item passa nesses testes, o método percorre `parent` até a raiz e retorna `false` se qualquer ancestral possuir `Equipped == false` ou `Quantity <= 0`; somente retorna `true` quando o item e todos os ancestrais satisfazem ambas as condições.

**Confirmada.** `SetDataOwner(owner)` grava `owner`, atribui o próprio `Equipment` como owner de cada `Weapon` por `w.SetOwner(e)`, propaga recursivamente o mesmo `DataOwner` aos filhos quando o item é container e, para cada `EquipmentModifier`, chama `setEquipment(e)` e `SetDataOwner(owner)`.

Rastreabilidade: `model/gurps/equipment.go`: `(*Equipment).ReallyEquipped`, `(*Equipment).SetDataOwner`.

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

## Valor e EquipmentModifier

**Confirmada.** `ResolvedBaseValue()` resolve `BaseValue` após substituições e scripts, limita o resultado ao intervalo de zero a `fxp.Max-1`, e `AdjustedValue()` passa esse resultado a `ValueAdjustedForModifiers(e, ..., e.Modifiers)`.

**Confirmada.** `ValueAdjustedForModifiers()` executa quatro etapas, nesta ordem: `emcost.Original`, `emcost.Base`, `emcost.FinalBase` e `emcost.Final`. As etapas `Original`, `FinalBase` e `Final` são processadas por `processNonCFStep()`.

**Confirmada.** Em `processNonCFStep()`, modifiers do tipo da etapa são percorridos recursivamente. `Addition` é acumulada; `Percentage` é acumulada e depois aplicada sobre o valor recebido pela etapa; `Multiplier` altera imediatamente `cost` por multiplicação. Depois são somadas as adições e, se houver percentuais, soma-se `value * percentages / 100`.

**Confirmada.** Na etapa `emcost.Base`, `ValueAdjustedForModifiers()` acumula `cf` a partir do valor extraído de cada modifier multiplicado por `CostMultiplier()`. Quando o valor analisado é `emcost.Multiplier`, subtrai `fxp.One` dessa contribuição. Se `cf != 0`, o custo corrente é multiplicado por `cf.Max(fxp.NegPointEight) + fxp.One`.

**Confirmada.** Ao final das quatro etapas, `ValueAdjustedForModifiers()` retorna `cost.Max(0)`.

**Confirmada.** `EquipmentModifier.CostMultiplier()` usa `multiplierForEquipmentModifier()` para aplicar nível quando `CostIsPerLevel` está ativo. Quando `CostIsPerPound` está ativo, multiplica ainda pelo maior entre `AdjustedWeight(false, defaultUnits)` e `ResolvedBaseWeight()`, arredondado por `Ceil()` e limitado a no mínimo `fxp.One`. `multiplierForEquipmentModifier()` também garante multiplicador mínimo `fxp.One`.

**Confirmada.** `ExtendedValue()` retorna zero para `Quantity <= 0`; caso contrário parte de `AdjustedValue()`, soma recursivamente `ExtendedValue()` dos filhos se for container e multiplica o total pela quantidade do próprio item. `ExtendedValueOfJustOne()` segue o mesmo cálculo, mas não multiplica pela quantidade do próprio item.

Rastreabilidade: `model/gurps/equipment.go`: `ResolvedBaseValue`, `AdjustedValue`, `ExtendedValue`, `ExtendedValueOfJustOne`; `model/gurps/equipment_modifier.go`: `EquipmentModifier.CostMultiplier`, `multiplierForEquipmentModifier`, `ValueAdjustedForModifiers`, `processNonCFStep`.

## Peso e EquipmentModifier

**Confirmada.** `ResolvedBaseWeight()` resolve `BaseWeight` após substituições/scripts usando as unidades padrão da ficha. `AdjustedWeight()` retorna zero quando `forSkills` é verdadeiro, `WeightIgnoredForSkills` é verdadeiro e `ReallyEquipped()` é verdadeiro; nos demais casos delega a `WeightAdjustedForModifiers()`.

**Confirmada.** `WeightAdjustedForModifiers()` processa, nesta ordem, `emweight.Original`, `emweight.Base`, `emweight.FinalBase` e `emweight.Final`, e limita o resultado final a no mínimo zero.

**Confirmada.** Na etapa `Original`, adições são convertidas para libras pela unidade final presente na string ou pela unidade padrão; percentuais são acumulados e depois aplicados sobre o peso original recebido pela função. O numerador da fração extraída é multiplicado por `WeightMultiplier()` antes da aplicação.

**Confirmada.** As etapas `Base`, `FinalBase` e `Final` usam `processMultiplyAddWeightStep()`. Nelas, `Addition` é acumulada separadamente; `PercentageMultiplier` substitui o peso corrente por `weight * numerator / (denominator * 100)`; `Multiplier` substitui o peso corrente por `weight * numerator / denominator`; as adições acumuladas são somadas ao fim da etapa.

**Confirmada.** `EquipmentModifier.WeightMultiplier()` aplica `multiplierForEquipmentModifier()` com `WeightIsPerLevel`, portanto o nível do Equipment é usado somente quando a flag está ativa e o item é nivelado; o multiplicador resultante nunca fica abaixo de `fxp.One`.

**Confirmada.** `ExtendedWeight()` delega a `ExtendedWeightAdjustedForModifiers()` com quantidade, peso base, modifiers, features, filhos e os flags relativos a skills.

**Confirmada.** `ExtendedWeightAdjustedForModifiers()` retorna zero para quantidade não positiva. O peso próprio entra por `WeightAdjustedForModifiers()` salvo quando está sendo calculado para skills e `weightIgnoredForSkills` é verdadeiro.

**Confirmada.** Quando existem filhos, seus `ExtendedWeight()` são somados. Em seguida, `ContainedWeightReduction` é coletado tanto das `Features` do próprio Equipment quanto das `Features` dos `EquipmentModifier` percorridos. Reduções percentuais são somadas entre si e reduções fixas são somadas separadamente.

**Confirmada.** Percentual acumulado de pelo menos 100 zera o peso contido; percentual positivo menor que 100 subtrai `contained * percentage / 100`. Depois o peso contido recebe a redução fixa e é limitado a no mínimo zero antes de ser somado ao peso próprio. O resultado é finalmente multiplicado pela quantidade.

Rastreabilidade: `model/gurps/equipment.go`: `ResolvedBaseWeight`, `AdjustedWeight`, `ExtendedWeight`, `ExtendedWeightAdjustedForModifiers`; `model/gurps/equipment_modifier.go`: `EquipmentModifier.WeightMultiplier`, `WeightAdjustedForModifiers`, `processMultiplyAddWeightStep`.

## Relação com Weapons, Features e Prerequisites

**Confirmada.** `EquipmentSyncData` possui diretamente `Weapons []*Weapon`, `Features Features` e `Prereq *PrereqList`; portanto esses objetos fazem parte da estrutura de dados sincronizável/persistível declarada de Equipment.

**Confirmada.** `SetDataOwner()` estabelece concretamente o vínculo de runtime entre cada `Weapon` incorporada e o Equipment que a contém por `Weapon.SetOwner(e)`.

**Confirmada.** `ContainedWeightReduction` é consumido diretamente pelo cálculo de `ExtendedWeightAdjustedForModifiers()` a partir das features do Equipment e de seus EquipmentModifiers. Isso é independente do fato de `Entity.processFeature()` reconhecer esse tipo sem armazená-lo na coleção interna `Entity.features`.

**Não confirmada nesta passagem.** A semântica completa de atualização e cálculo das `Weapons` incorporadas não é estabelecida apenas pelo vínculo de ownership observado e requer rastreamento das implementações de Weapon.

**Não confirmada nesta passagem.** A avaliação interna de `PrereqList` não é inferida a partir do campo `Prereq`.

## Questões abertas desta passagem

- **Não confirmada:** comportamento de resolução das `Weapons` incorporadas ao Equipment além do vínculo de ownership confirmado em `SetDataOwner()`.
