# Índice mestre — engenharia reversa do GCS

Status dos documentos:

- [ ] Não iniciado
- [~] Em análise
- [x] Consolidado

## Critério de evidência

- **Confirmada:** comportamento observado diretamente na implementação citada.
- **Indicação:** evidência observada aponta para o comportamento, mas a implementação necessária para fechar a conclusão ainda não foi integralmente rastreada.
- **Não confirmada:** questão explicitamente mantida em aberto; não deve ser tratada como comportamento do GCS.

Toda conclusão deve preservar rastreabilidade para arquivo e tipo, método ou função do código-fonte. Ausência de evidência observada não é preenchida por inferência.

## Dependências

- `GCS-Character.md` é a base estrutural para todos os demais documentos.
- `GCS-Recalculate.md` registra o ciclo de atualização de `Entity` e é a referência coordenadora para a participação de Skills, Spells, Features e Prerequisites no recálculo.
- `GCS-Traits.md` depende de `GCS-Character.md` e alimenta a investigação de modificadores, features e bônus.
- `GCS-Trait-Modifiers.md` registra a estrutura e semântica diretamente confirmadas de `TraitModifier`.
- `GCS-Trait-Pricing.md` registra o pipeline de custo confirmado de Traits e referencia `TraitModifier` sem duplicar sua estrutura completa.
- `GCS-Prerequisites.md` registra o contrato `Prereq` e as implementações concretas de avaliação já observadas, sem generalizar para tipos ainda não rastreados.
- `GCS-Skills.md` e `GCS-Spells.md` dependem de `GCS-Character.md` e do pipeline documentado em `GCS-Recalculate.md`.
- `GCS-Equipment.md` depende de `GCS-Character.md` e da investigação de features.
- `GCS-Weapons.md` registra estrutura, identidade, clonagem e persistência observadas de `Weapon`; algoritmos de resolução ainda não rastreados permanecem abertos no próprio documento.
- `GCS-Construction.md`, `GCS-Pricing.md` e `GCS-Importer.md` dependem de múltiplos documentos estruturais.

## Ordem de análise

1. `GCS-Character.md`
2. `GCS-Recalculate.md`
3. `GCS-Traits.md`
4. `GCS-Trait-Modifiers.md`
5. `GCS-Trait-Pricing.md`
6. `GCS-Modifiers.md`
7. `GCS-Features.md`
8. `GCS-Bonuses.md`
9. `GCS-Prerequisites.md`
10. `GCS-Construction.md`
11. `GCS-Pricing.md`
12. `GCS-Templates.md`
13. `GCS-Skills.md`
14. `GCS-Spells.md`
15. `GCS-Equipment.md`
16. `GCS-Weapons.md`
17. `GCS-Importer.md`

## Estado coordenado das evidências

- **Confirmada:** `Entity.Recalculate()` possui fluxo próprio consolidado em `GCS-Recalculate.md`: reanexação, descarte de caches, preparação de hashes, atualização inicial de Skills/Spells e até cinco passagens de `processFeatures()` → `processPrereqs()` → descarte de caches → atualização de Skills/Spells, com término antecipado quando ambos deixam de reportar mudança. Rastreabilidade: `model/gurps/entity.go` — `(*Entity).Recalculate`, `(*Entity).UpdateSkills`, `(*Entity).UpdateSpells`.
- **Confirmada:** `Entity.Recalculate()` coleta `Features` de `TraitModifier` durante `processFeatures()` e as encaminha ao mesmo `processFeature()` usado pelas features do Trait. Rastreabilidade: `model/gurps/entity.go` — `(*Entity).processFeatures`, `(*Entity).processFeature`; tipo `TraitModifier`.
- **Confirmada:** `processPrereqs()` participa do ciclo de recálculo e pode acrescentar `SkillBonus`/`SpellBonus` negativos às features da `Entity` quando a avaliação de prerequisite sinaliza penalidade de equipamento. Os valores observados são `-10` com `TechLevel` não vazio e `-5` nos demais casos. Rastreabilidade: `model/gurps/entity.go` — `(*Entity).processPrereqs`; tipos `SkillBonus`, `SpellBonus`.
- **Confirmada:** o pricing de Traits, incluindo classificação e extração de `TraitModifier.CostAdj`, multiplicadores de autocontrole/frequência e arredondamento observado, está consolidado em `GCS-Trait-Pricing.md`. Rastreabilidade: `model/gurps/trait.go` — `(*Trait).AdjustedPoints`, `AdjustedPoints`; `model/gurps/enums/emweight/value.go` — `ValueFromString`, `Value.ExtractFraction`; `model/gurps/enums/selfctrl/roll.go` — `Roll.Multiplier`; `model/gurps/enums/frequency/frequency.go` — `Roll.Multiplier`.
- **Confirmada:** `PrereqList`, `AttributePrereq` e `EquippedEquipmentPrereq` possuem avaliação concreta documentada em `GCS-Prerequisites.md`; isso não confirma os demais tipos de `Prereq`. Rastreabilidade: `model/gurps/prereq.go`; `model/gurps/prereq_list.go` — `(*PrereqList).Satisfied`; `model/gurps/attribute_prereq.go` — `(*AttributePrereq).Satisfied`; `model/gurps/equipped_equipment_prereq.go` — `(*EquippedEquipmentPrereq).Satisfied`.
- **Confirmada:** estrutura e persistência observadas de Skills, Spells, Equipment, Weapons e Templates estão separadas nos respectivos documentos de domínio; o README não replica esses detalhes.

## Questões abertas coordenadas

- **Não confirmada:** cadeia completa de consumo de cada tipo concreto de `Feature` originada em `TraitModifier`, além da coleta e despacho já confirmados em `Entity.processFeatures()`/`processFeature()`.
- **Não confirmada:** avaliação concreta de `TraitPrereq`, `SkillPrereq`, `SpellPrereq`, `ContainedWeightPrereq` e `ScriptPrereq`; `PrereqList`, `AttributePrereq` e `EquippedEquipmentPrereq` já foram observados e não integram mais esta questão aberta.
- **Não confirmada:** algoritmos internos de `Skill.UpdateLevel()` e `Spell.UpdateLevel()` além de sua participação já confirmada no ciclo de convergência de `Entity.Recalculate()`.
- **Não confirmada:** semântica interna de `Equipment.ReallyEquipped()`; está confirmado em `GCS-Recalculate.md` que esse método condiciona a coleta de Features de Equipment, e em `GCS-Prerequisites.md` que também é exigido por `EquippedEquipmentPrereq`, mas sua implementação permanece não rastreada.
- **Não confirmada:** resolução interna de Weapons e vínculo concreto de ciclo de vida com implementações de `WeaponOwner`; estrutura, identidade, clonagem e persistência já estão confirmadas em `GCS-Weapons.md`.
- **Não confirmada:** implementações internas dos pontos de sincronização e ajuste de save de Templates mantidos em aberto em `GCS-Templates.md`; estrutura, ownership, persistência e despacho de sincronização já estão confirmados.

Questões resolvidas deixam esta lista quando a implementação correspondente é observada e registrada no documento de domínio apropriado; o README conserva apenas o estado coordenado atual.
