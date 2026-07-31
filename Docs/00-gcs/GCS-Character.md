# GCS — Entity e ciclo de recálculo

> Escopo: observações diretamente verificadas no código-fonte público de `richardwilkes/gcs`. Este documento não descreve decisões da SINGULAR.

## Convenção de evidência

- **Confirmada** — comportamento diretamente observado na implementação citada.
- **Indicação** — evidência parcial observada, insuficiente para afirmar o comportamento completo.
- **Não confirmada** — questão registrada sem evidência suficiente; não é tratada como fato.

## Entity como agregado persistido

**Confirmada.** `model/gurps/entity.go` declara `EntityData` como os dados de `Entity` escritos em disco. O tipo contém `Version`, `ID`, `TotalPoints`, `PointsRecord`, `Profile`, `SheetSettings`, `Attributes`, `Traits`, `Skills`, `Spells`, `CarriedEquipment`, `OtherEquipment`, `Notes`, datas de criação/modificação e `ThirdParty`.

Rastreabilidade: `model/gurps/entity.go` — tipos `EntityData`, `Entity`, `PointsBreakdown`.

**Confirmada.** `Entity` incorpora `EntityData` e mantém, fora desse bloco persistido, bônus derivados e caches internos, incluindo `LiftingStrengthBonus`, `StrikingStrengthBonus`, `ThrowingStrengthBonus`, `DodgeBonus`, `ParryBonus`, `BlockBonus`, coleção interna `features` e caches de resolução/encumbrance.

Rastreabilidade: `model/gurps/entity.go` — tipos `Entity`, `features`.

## Criação, carga e persistência

**Confirmada.** `NewEntity()` inicializa caches, gera um TID de `kinds.Entity`, usa `InitialPoints`, cria o primeiro `PointsRecord`, inicializa `SheetSettings` e `Attributes`, executa preenchimentos opcionais de perfil/ataques naturais conforme configurações globais, define `ModifiedOn` e chama `Recalculate()` antes de devolver a entidade.

**Confirmada.** `NewEntityFromFile()` chama `DiscardCaches()`, carrega o JSON por `jio.Load`, valida a versão com `jio.CheckVersion` e devolve a entidade carregada.

**Confirmada.** `Save()` chama `Recalculate()` antes de ajustar usos de equipamento para persistência e chamar `jio.SaveToFile`.

**Confirmada.** `MarshalJSONTo()` também chama `Recalculate()`. O JSON emitido inclui um bloco `calc` com `Swing`, `Thrust`, `BasicLift`, bônus de ST, Dodge/Parry/Block e arrays de Move/Dodge por nível de encumbrance. A versão serializada é substituída por `jio.CurrentDataVersion`.

**Confirmada.** `UnmarshalJSONFrom()` aceita o antigo campo JSON `advantages` como fallback para `Traits`, corrige ID inválido, cria settings/attributes ausentes, reconcilia `PointsRecord` com `TotalPoints` quando necessário e chama `Recalculate()` ao final.

Rastreabilidade: `model/gurps/entity.go` — `NewEntity`, `NewEntityFromFile`, `Save`, `MarshalJSONTo`, `UnmarshalJSONFrom`.

## Recalculate()

**Confirmada.** `Entity.Recalculate()` retorna imediatamente para receptor `nil` e, para uma entidade válida, executa nesta ordem inicial:

1. `ensureAttachments()`;
2. `DiscardCaches()`;
3. `SourceMatcher().PrepareHashes(e)`;
4. `UpdateSkills()`;
5. `UpdateSpells()`.

Depois executa um laço limitado a cinco iterações. Em cada iteração chama, nesta ordem:

1. `processFeatures()`;
2. `processPrereqs()`;
3. `DiscardCaches()`;
4. `UpdateSkills()`;
5. `UpdateSpells()`.

O laço termina antecipadamente quando tanto `UpdateSkills()` quanto `UpdateSpells()` informam que não houve mudança. O comentário da própria implementação registra dependência circular entre níveis de skills/spells e processamento de features/prerequisites como motivo da repetição e o limite de cinco como proteção contra loop infinito.

Rastreabilidade: `model/gurps/entity.go` — método `(*Entity).Recalculate`.

## Reanexação do grafo

**Confirmada.** `ensureAttachments()` reassocia `SheetSettings` à entidade, atribui `Entity = e` aos atributos e chama `SetDataOwner(e)` para Traits, Skills, Spells, equipamento carregado, outro equipamento e Notes.

Rastreabilidade: `model/gurps/entity.go` — método `(*Entity).ensureAttachments`.

## Coleta e despacho de features

**Confirmada.** `processFeatures()` começa substituindo `e.features` por uma coleção vazia. A estrutura interna possui coleções separadas para `AttributeBonus`, `CostReduction`, `DRBonus`, `EquipmentMaxUsesBonus`, `SkillBonus`, `SkillPointBonus`, `SpellBonus`, `SpellPointBonus`, `TraitBonus`, `TraitMaxLevelBonus`, `WeaponBonus` e `SelectorOverride`.

**Confirmada.** Traits são percorridos; features próprias são processadas somente quando o trait não é container, e features de `TraitModifier` também são percorridas. Skills têm suas `Features` processadas. Em `CarriedEquipment`, features só entram nesse processamento quando `ReallyEquipped()` é verdadeiro; os `EquipmentModifier` desse equipamento também são percorridos.

**Confirmada.** O código adia features derivadas de autocontrole dos traits até depois da travessia inicial, explicitamente porque a resolução de autocontrole e ajustes via selector override requer que os overrides tenham sido coletados primeiro.

**Confirmada.** `processFeature()` associa contexto antes de classificar a feature. Objetos que implementam `Bonus` recebem `owner`, `subOwner` e `leveledOwner`; objetos que implementam `Override` recebem `owner` e `subOwner`.

**Confirmada.** O dispatcher de `processFeature()` adiciona os tipos concretos às respectivas coleções internas: `AttributeBonus`, `CostReduction`, `EquipmentMaxUsesBonus`, `SkillBonus`, `SkillPointBonus`, `SpellBonus`, `SpellPointBonus`, `TraitBonus`, `TraitMaxLevelBonus`, `WeaponBonus` e `SelectorOverride`. `DRBonus` com `Locations` não vazio é coletado diretamente; quando `Locations` é vazio, o método chama `expandThisArmorDRBonus()`.

**Confirmada.** `ConditionalModifierBonus`, `ContainedWeightReduction` e `ReactionBonus` são explicitamente reconhecidos pelo dispatcher, mas não são coletados nessa etapa. Qualquer outro tipo que alcance o `default` gera log de `unhandled feature` com seu `FeatureType()`.

**Confirmada.** `expandThisArmorDRBonus()` só expande um `DRBonus` sem localizações quando o owner é `*Equipment`; caso contrário retorna sem coletá-lo. Para equipamento, examina os demais `DRBonus` da peça, replica localizações com especialização correspondente e cria uma cópia combinada para localizações restantes.

Rastreabilidade: `model/gurps/entity.go` — tipos `features`, `Bonus`, `Override`, `AttributeBonus`, `CostReduction`, `EquipmentMaxUsesBonus`, `DRBonus`, `SkillBonus`, `SkillPointBonus`, `SpellBonus`, `SpellPointBonus`, `TraitBonus`, `TraitMaxLevelBonus`, `WeaponBonus`, `SelectorOverride`; métodos `(*Entity).processFeatures`, `(*Entity).processFeature`, `(*Entity).expandThisArmorDRBonus`.

## Aplicação de bônus coletados

**Confirmada.** Depois da coleta de features e das features derivadas de autocontrole, `processFeatures()` calcula `LiftingStrengthBonus`, `StrikingStrengthBonus` e `ThrowingStrengthBonus` consultando `AttributeBonusFor(StrengthID, ...)` e aplicando `Floor()`.

**Confirmada.** Para cada atributo com `AttributeDef()` válido, `processFeatures()` atribui `attr.Bonus` usando `AttributeBonusFor(attr.AttrID, stlimit.None, nil)`; atributos cuja definição não permite decimal têm o bônus truncado por `Floor()`. O mesmo passo atribui `attr.CostReduction` por `CostReductionFor(attr.AttrID)`. Sem definição válida, ambos são zerados.

**Confirmada.** `CostReductionFor()` soma `Percentage` de todas as `CostReduction` cujo `Attribute` coincide com o ID consultado, limita o total superior a 80 e retorna no mínimo zero.

**Confirmada.** Após atualizar os atributos, `processFeatures()` chama `Profile.Update(e)`. Se não existir atributo explícito `DodgeID`, `DodgeBonus` recebe o bônus de atributo correspondente; se existir, `DodgeBonus` é zerado. `ParryBonus` e `BlockBonus` são calculados por `AttributeBonusFor()` e seus tooltips são preservados.

**Confirmada.** `SkillBonusFor`, `SkillPointBonusFor`, `SpellBonusFor`, `SpellPointBonusFor` e `TraitBonusFor` percorrem suas coleções já processadas, aplicam os critérios específicos de seleção e somam `AdjustedAmount()` apenas para correspondências; quando fornecido, o tooltip recebe a contribuição de cada bônus correspondente.

Rastreabilidade: `model/gurps/entity.go` — métodos `(*Entity).processFeatures`, `AttributeBonusFor`, `CostReductionFor`, `SkillBonusFor`, `SkillPointBonusFor`, `SpellBonusFor`, `SpellPointBonusFor`, `TraitBonusFor`.

## Processamento de pré-requisitos

**Confirmada.** `processPrereqs()` recalcula `UnsatisfiedReason` para Traits, Skills, Spells e Equipment; o valor anterior é zerado antes da avaliação de cada objeto.

**Confirmada.** Para Trait com `Prereq`, `Prereq.Satisfied(e, t, ...)` determina se o texto de falha é armazenado. Independentemente disso, `ResolvedMaxLevels()` é consultado: se o máximo for positivo e `Levels` o exceder, uma razão adicional indicando o máximo é criada ou anexada à razão já existente.

**Confirmada.** Skills containers não executam a avaliação de pré-requisito desse trecho. Para skill não-container, `Prereq.Satisfied()` é avaliado quando presente. Se a avaliação sinalizar `eqpPenalty`, é criado um `SkillBonus` negativo específico para nome/especializações da própria skill e anexado diretamente a `e.features.skillBonuses`: `-10` quando a skill possui `TechLevel` não vazio, caso contrário `-5`.

**Confirmada.** Se os pré-requisitos anteriores de uma skill foram satisfeitos e `IsTechnique()` é verdadeiro, `TechniqueSatisfied()` também participa da decisão. Falha em qualquer dessas verificações produz `UnsatisfiedReason`.

**Confirmada.** Spells seguem estrutura análoga: containers são excluídos; `Prereq.Satisfied()` é avaliado; `eqpPenalty` cria um `SpellBonus` específico para o nome da spell, com `-10` se houver `TechLevel` não vazio e `-5` caso contrário. Se ainda satisfeita e `IsRitualMagic()` for verdadeiro, `RitualMagicSatisfied()` também é avaliado.

**Confirmada.** Tanto `CarriedEquipment` quanto `OtherEquipment` são percorridos para pré-requisitos. Para cada Equipment, `UnsatisfiedReason` é zerado e, quando existe `Prereq`, uma falha de `Prereq.Satisfied()` grava a razão correspondente. Nesse trecho, o valor de `eqpPenalty` produzido pela avaliação de Equipment não é usado para criar bônus.

Rastreabilidade: `model/gurps/entity.go` — método `(*Entity).processPrereqs`; tipos `Trait`, `Skill`, `Spell`, `Equipment`, `SkillBonus`, `SpellBonus` e interface/estrutura de pré-requisito acessada por `Prereq.Satisfied`.

## Atualização de Skills e Spells

**Confirmada.** `UpdateSkills()` percorre `e.Skills` e chama `UpdateLevel()` em cada skill visitada; retorna `true` se pelo menos uma chamada indicar mudança. A travessia usa `Traverse(..., false, true, e.Skills...)`.

**Confirmada.** `UpdateSpells()` faz o equivalente para `e.Spells`, chamando `UpdateLevel()` e acumulando se ocorreu mudança; a travessia também usa `Traverse(..., false, true, e.Spells...)`.

Rastreabilidade: `model/gurps/entity.go` — métodos `(*Entity).UpdateSkills`, `(*Entity).UpdateSpells`; métodos `(*Skill).UpdateLevel`, `(*Spell).UpdateLevel` como pontos chamados pelo pipeline.

## Pontos e forças derivadas observadas

**Confirmada.** `PointsBreakdown()` soma `PointCost()` de atributos, classifica traits por `AdjustedPoints()` e soma diretamente `Points` de skills e spells visitadas. Traits desabilitados não entram; containers `Group` delegam aos filhos, enquanto containers `Ancestry` e `Attributes` são acumulados em categorias próprias.

**Confirmada.** `StrikingStrength()`, `LiftingStrength()` e `ThrowingStrength()` usam o atributo específico correspondente quando ele existe; caso contrário usam `StrengthID` com mínimo zero. Em seguida somam o bônus derivado correspondente e retornam `Floor()`.

**Confirmada.** `Thrust()` usa `StrikingStrength()` e delega a `SheetSettings.DamageProgression.Thrust(st)`; `Swing()` faz o equivalente com `DamageProgression.Swing(st)`.

Rastreabilidade: `model/gurps/entity.go` — `PointsBreakdown`, `calculateSingleTraitPoints`, `StrikingStrength`, `LiftingStrength`, `ThrowingStrength`, `Thrust`, `ThrustFor`, `Swing`, `SwingFor`.

## Traits no grafo da Entity

**Confirmada.** `model/gurps/trait.go` define `Trait` como vantagem, desvantagem, peculiaridade ou perk. `TraitData` contém `Children` e ponteiro privado `parent`; `Trait` mantém `owner DataOwner` fora dos dados serializados.

**Confirmada.** A distinção entre trait normal e container é codificada no tipo do TID (`kinds.Trait` versus `kinds.TraitContainer`). `Container()` consulta esse kind. Containers podem possuir `Children`; `Parent()`/`SetParent()` mantêm o relacionamento ascendente em memória.

**Confirmada.** `TraitEditData` persiste `Modifiers`, `SelfControl`, `Frequency`, `Disabled` e dados comuns/de container. Para traits não-container, `TraitNonContainerSyncData` persiste `BasePoints`, `PointsPerLevel`, `MaxLevels`, `Weapons`, `Features`, `RoundCostDown` e `CanLevel`.

Rastreabilidade: `model/gurps/trait.go` — tipos `Trait`, `TraitData`, `TraitEditData`, `TraitNonContainerOnlyEditData`, `TraitSyncData`, `TraitNonContainerSyncData`, `TraitContainerSyncData`; métodos `Container`, `NodeChildren`, `Parent`, `SetParent`.

## Questões em aberto

- **Não confirmada:** implementação interna de `Prereq.Satisfied()` para cada tipo concreto de pré-requisito.
- **Não confirmada:** algoritmo interno de `Skill.UpdateLevel()` e `Spell.UpdateLevel()`; nesta etapa está confirmado apenas como são chamados e como seu retorno controla convergência.
- **Não confirmada:** cálculo completo de custo de traits e interação de `TraitModifier` com arredondamento, níveis e tipos de container.
- **Não confirmada:** participação completa de Weapons e Templates no grafo além dos pontos explicitamente observados acima.
- **Não confirmada:** persistência e ciclo de vida completos de Skills, Spells, Equipment, Weapons e Templates.

Essas questões permanecem deliberadamente sem conclusão até inspeção direta das respectivas implementações.
