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

## Coleta de features

**Confirmada.** `processFeatures()` começa substituindo `e.features` por uma coleção vazia. A estrutura interna possui coleções separadas para `AttributeBonus`, `CostReduction`, `DRBonus`, `EquipmentMaxUsesBonus`, `SkillBonus`, `SkillPointBonus`, `SpellBonus`, `SpellPointBonus`, `TraitBonus`, `TraitMaxLevelBonus`, `WeaponBonus` e `SelectorOverride`.

**Confirmada.** No trecho observado de `processFeatures()`, traits são percorridos; features próprias são processadas somente quando o trait não é container, e features de `TraitModifier` também são percorridas. Skills têm suas `Features` processadas. Em `CarriedEquipment`, features só entram nesse processamento quando `ReallyEquipped()` é verdadeiro; os `EquipmentModifier` desse equipamento também são percorridos.

**Confirmada.** O código adia features derivadas de autocontrole dos traits até depois da travessia inicial, explicitamente porque a resolução de autocontrole e ajustes via selector override requer que os overrides tenham sido coletados primeiro.

Rastreabilidade: `model/gurps/entity.go` — tipos `features`; métodos `(*Entity).processFeatures`, `(*Entity).processFeature` (chamado pelo pipeline).

## Traits no grafo da Entity

**Confirmada.** `model/gurps/trait.go` define `Trait` como vantagem, desvantagem, peculiaridade ou perk. `TraitData` contém `Children` e ponteiro privado `parent`; `Trait` mantém `owner DataOwner` fora dos dados serializados.

**Confirmada.** A distinção entre trait normal e container é codificada no tipo do TID (`kinds.Trait` versus `kinds.TraitContainer`). `Container()` consulta esse kind. Containers podem possuir `Children`; `Parent()`/`SetParent()` mantêm o relacionamento ascendente em memória.

**Confirmada.** `TraitEditData` persiste `Modifiers`, `SelfControl`, `Frequency`, `Disabled` e dados comuns/de container. Para traits não-container, `TraitNonContainerSyncData` persiste `BasePoints`, `PointsPerLevel`, `MaxLevels`, `Weapons`, `Features`, `RoundCostDown` e `CanLevel`.

Rastreabilidade: `model/gurps/trait.go` — tipos `Trait`, `TraitData`, `TraitEditData`, `TraitNonContainerOnlyEditData`, `TraitSyncData`, `TraitNonContainerSyncData`, `TraitContainerSyncData`; métodos `Container`, `NodeChildren`, `Parent`, `SetParent`.

## Questões em aberto

- **Não confirmada:** semântica completa de `processFeature()` por cada kind de feature; requer inspeção integral do dispatcher e dos tipos concretos.
- **Não confirmada:** algoritmo completo de `processPrereqs()` e propagação de `UnsatisfiedReason` entre todos os domínios.
- **Não confirmada:** detalhes de convergência e ordenação interna de `UpdateSkills()` e `UpdateSpells()` além do contrato observado em `Recalculate()`.
- **Não confirmada:** cálculo completo de custo de traits e interação de `TraitModifier` com arredondamento, níveis e tipos de container.
- **Não confirmada:** participação completa de Spells, Equipment, Weapons e Templates no grafo além dos pontos explicitamente observados acima.

Essas questões permanecem deliberadamente sem conclusão até inspeção direta das respectivas implementações.
