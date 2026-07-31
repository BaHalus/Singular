# GCS — fluxo confirmado de `Entity.Recalculate()`

## Escopo e evidência

Este documento registra somente comportamento observado diretamente em `richardwilkes/gcs`, commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

Fonte principal: `model/gurps/entity.go`, tipos e métodos `Entity`, `(*Entity).Recalculate`, `(*Entity).ensureAttachments`, `(*Entity).DiscardCaches`, `(*Entity).processFeatures`, `(*Entity).processFeature`, `(*Entity).processPrereqs`, `(*Entity).UpdateSkills` e `(*Entity).UpdateSpells`.

## Entrada no recálculo

**Confirmada.** `(*Entity).Recalculate()` retorna imediatamente quando o receptor é `nil`.

**Confirmada.** Para uma `Entity` não nula, a sequência inicial observada é:

1. `ensureAttachments()`;
2. `DiscardCaches()`;
3. `SourceMatcher().PrepareHashes(e)`;
4. `UpdateSkills()`;
5. `UpdateSpells()`.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).Recalculate`.

## Reanexação dos objetos

**Confirmada.** `ensureAttachments()` associa `SheetSettings` à `Entity`, atribui `Entity` a cada atributo e chama `SetDataOwner(e)` nos elementos de topo de Traits, Skills, Spells, CarriedEquipment, OtherEquipment e Notes.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).ensureAttachments`.

## Descarte de caches

**Confirmada.** `DiscardCaches()` recria os mapas `variableResolverExclusions`, `skillResolverExclusions`, `scriptCache` e `variableCache`; também redefine os caches de basic lift e encumbrance para valores sentinela.

**Confirmada.** `Recalculate()` chama `DiscardCaches()` antes da primeira atualização de Skills/Spells e novamente em cada iteração, depois de processar Features e Prerequisites e antes de atualizar Skills/Spells.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).DiscardCaches`, `(*Entity).Recalculate`.

## Ciclo de convergência

**Confirmada.** Depois da atualização inicial de Skills e Spells, `Recalculate()` executa no máximo cinco iterações. Em cada iteração, a ordem é:

1. `processFeatures()`;
2. `processPrereqs()`;
3. `DiscardCaches()`;
4. `UpdateSkills()`;
5. `UpdateSpells()`.

**Confirmada.** `UpdateSkills()` e `UpdateSpells()` retornam `true` quando ao menos um item reporta alteração em `UpdateLevel()`.

**Confirmada.** O laço termina antecipadamente quando tanto Skills quanto Spells deixam de reportar alteração. O comentário da própria implementação identifica dependência circular entre níveis de Skills/Spells, Features e Prerequisites como razão para a repetição e explicita o limite de cinco iterações para impedir loop infinito.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).Recalculate`, `(*Entity).UpdateSkills`, `(*Entity).UpdateSpells`.

## Coleta de Features dentro do ciclo

**Confirmada.** Cada execução de `processFeatures()` começa substituindo `e.features` por um novo valor vazio de `features`. Portanto, as coleções internas de features são reconstruídas a cada passagem do ciclo.

**Confirmada.** A coleta percorre Features de Traits não-container, Features de `TraitModifier`, Features de Skills e Features de Equipment carregado que satisfaça `ReallyEquipped()`. Para Equipment, também percorre Features de `EquipmentModifier`.

**Confirmada.** Features derivadas de self-control de Traits são processadas somente depois do primeiro percurso dos Traits; o comentário da implementação informa que isso permite que selector overrides já tenham sido coletados antes da resolução do self-control.

**Confirmada.** `processFeature()` configura estado de runtime antes do despacho: quando a feature implementa `Bonus`, chama `SetOwner(owner)`, `SetSubOwner(subOwner)` e `SetLeveledOwner(leveledOwner)`; quando implementa `Override`, chama `SetOwner(owner)` e `SetSubOwner(subOwner)`.

**Confirmada.** O despacho de `processFeature()` adiciona às coleções internas correspondentes `AttributeBonus`, `CostReduction`, `EquipmentMaxUsesBonus`, `SkillBonus`, `SkillPointBonus`, `SpellBonus`, `SpellPointBonus`, `TraitBonus`, `TraitMaxLevelBonus`, `WeaponBonus` e `SelectorOverride`. `DRBonus` com `Locations` não vazio é coletado diretamente; quando `Locations` está vazio, o método chama `expandThisArmorDRBonus()`. `ConditionalModifierBonus`, `ContainedWeightReduction` e `ReactionBonus` são explicitamente marcados no `switch` como não coletados nesse estágio.

**Confirmada.** Após a coleta, `processFeatures()` deriva `LiftingStrengthBonus`, `StrikingStrengthBonus` e `ThrowingStrengthBonus` por `AttributeBonusFor()` e aplica `Floor()` aos resultados. Para cada atributo com `AttributeDef()` não nulo, define `Attribute.Bonus` por `AttributeBonusFor()` e `Attribute.CostReduction` por `CostReductionFor()`; atributos cuja definição não permite decimal têm o bônus submetido a `Floor()`. Sem definição, ambos são zerados.

**Confirmada.** Ainda em `processFeatures()`, `Profile.Update(e)` é chamado depois da atualização dos atributos. `DodgeBonus` é obtido por `AttributeBonusFor(DodgeID, ...)` apenas quando `ResolveAttribute(DodgeID)` retorna `nil`; caso contrário é zerado. `ParryBonus` e `BlockBonus` são obtidos por `AttributeBonusFor()` com captura dos respectivos tooltips e aplicação de `Floor()`.

Rastreabilidade: `model/gurps/entity.go` — `features`, `(*Entity).processFeatures`, `(*Entity).processFeature`, `(*Entity).expandThisArmorDRBonus`; tipos `Bonus`, `Override`, `AttributeBonus`, `CostReduction`, `EquipmentMaxUsesBonus`, `DRBonus`, `SkillBonus`, `SkillPointBonus`, `SpellBonus`, `SpellPointBonus`, `TraitBonus`, `TraitMaxLevelBonus`, `WeaponBonus`, `SelectorOverride`, `ConditionalModifierBonus`, `ContainedWeightReduction`, `ReactionBonus`.

## Prerequisites dentro do ciclo

**Confirmada.** `processPrereqs()` recalcula `UnsatisfiedReason` de Traits, Skills, Spells, CarriedEquipment e OtherEquipment.

**Confirmada.** Para Skills e Spells, quando `Prereq.Satisfied()` sinaliza `eqpPenalty`, `processPrereqs()` cria dinamicamente um `SkillBonus` ou `SpellBonus` negativo e o acrescenta à coleção de features da `Entity`. O valor observado é `-10` quando o item possui `TechLevel` não vazio e `-5` caso contrário.

**Confirmada.** O `SkillBonus` criado por esse caminho recebe como owner a própria Skill e critérios construídos a partir de `NameWithReplacements()`, `SpecializationWithReplacements()` e `OptionalSpecializationWithReplacements()`. O `SpellBonus` recebe como owner o próprio Spell e critério de nome construído a partir de `NameWithReplacements()`.

**Confirmada.** Para Skills, depois de um prerequisite satisfeito, Techniques são submetidas a `TechniqueSatisfied()`. Para Spells, Ritual Magic é submetida a `RitualMagicSatisfied()`.

**Confirmada.** Traits também verificam `ResolvedMaxLevels()` e acrescentam razão de insatisfação quando `Levels` excede o máximo positivo resolvido.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).processPrereqs`; tipos `Trait`, `Skill`, `Spell`, `Equipment`, `SkillBonus`, `SpellBonus`.

## Pontos de entrada observados fora do laço

**Confirmada.** `NewEntity()` termina sua construção chamando `Recalculate()` depois de inicializar ID, pontos iniciais, datas, settings, atributos e os preenchimentos opcionais mostrados no método.

**Confirmada.** `Save()` chama `Recalculate()` antes de `AdjustEquipmentUsesForSave()` sobre Equipment carregado e não carregado e antes de `jio.SaveToFile()`.

**Confirmada.** `MarshalJSONTo()` também chama `Recalculate()` antes de montar o bloco `calc` serializado. Esse bloco contém `Swing`, `Thrust`, `BasicLift`, os três bônus de ST, `DodgeBonus`, `ParryBonus`, `BlockBonus` e arrays de `Move` e `Dodge` calculados para cada nível de encumbrance.

**Confirmada.** `UnmarshalJSONFrom()` chama `Recalculate()` ao final do fluxo observado de desserialização, depois das migrações/normalizações mostradas no método e da reconciliação de `PointsRecord` com `TotalPoints`.

Rastreabilidade: `model/gurps/entity.go` — `NewEntity`, `(*Entity).Save`, `(*Entity).MarshalJSONTo`, `(*Entity).UnmarshalJSONFrom`, `(*Entity).Recalculate`.

## Limites desta passagem

- **Confirmada em documento especializado:** implementação de `Skill.UpdateLevel()` e cálculo de Skill/Technique estão rastreados em `GCS-Skill-Level.md`.
- **Confirmada em documento especializado:** implementação de `Spell.UpdateLevel()` e seus caminhos de cálculo estão rastreados em `GCS-Spells.md`.
- **Confirmada em documento especializado:** semântica de `Equipment.ReallyEquipped()` está rastreada em `GCS-Equipment.md`.
- **Não confirmada:** efeito concreto de cada classe de Feature após o despacho, além das coleções, expansões e atualizações diretamente observadas e registradas acima ou nos documentos especializados.
