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
- `GCS-Traits.md` depende de `GCS-Character.md` e alimenta a investigação de modificadores, features e bônus.
- `GCS-Trait-Modifiers.md` registra a estrutura e semântica diretamente confirmadas de `TraitModifier`.
- `GCS-Trait-Pricing.md` registra o pipeline de custo confirmado de Traits e referencia `TraitModifier` sem duplicar sua estrutura completa.
- `GCS-Prerequisites.md` registra o contrato `Prereq` e as implementações concretas de avaliação já observadas, sem generalizar para tipos ainda não rastreados.
- `GCS-Skills.md` e `GCS-Spells.md` dependem de `GCS-Character.md` e do pipeline de recálculo.
- `GCS-Equipment.md` depende de `GCS-Character.md` e da investigação de features.
- `GCS-Weapons.md` registra estrutura, identidade, clonagem e persistência observadas de `Weapon`; algoritmos de resolução ainda não rastreados permanecem abertos no próprio documento.
- `GCS-Construction.md`, `GCS-Pricing.md` e `GCS-Importer.md` dependem de múltiplos documentos estruturais.

## Ordem de análise

1. `GCS-Character.md`
2. `GCS-Traits.md`
3. `GCS-Trait-Modifiers.md`
4. `GCS-Trait-Pricing.md`
5. `GCS-Modifiers.md`
6. `GCS-Features.md`
7. `GCS-Bonuses.md`
8. `GCS-Prerequisites.md`
9. `GCS-Construction.md`
10. `GCS-Pricing.md`
11. `GCS-Templates.md`
12. `GCS-Skills.md`
13. `GCS-Spells.md`
14. `GCS-Equipment.md`
15. `GCS-Weapons.md`
16. `GCS-Importer.md`

## Estado coordenado das evidências

- **Confirmada:** `Entity.Recalculate()` coleta `Features` de `TraitModifier` durante `processFeatures()` e as encaminha ao mesmo `processFeature()` usado pelas features do Trait. Rastreabilidade: `model/gurps/entity.go` — `(*Entity).processFeatures`, `(*Entity).processFeature`; tipo `TraitModifier`.
- **Confirmada:** o pricing de Traits, incluindo classificação e extração de `TraitModifier.CostAdj`, multiplicadores de autocontrole/frequência e arredondamento observado, está consolidado em `GCS-Trait-Pricing.md`. Rastreabilidade: `model/gurps/trait.go` — `(*Trait).AdjustedPoints`, `AdjustedPoints`; `model/gurps/enums/emweight/value.go` — `ValueFromString`, `Value.ExtractFraction`; `model/gurps/enums/selfctrl/roll.go` — `Roll.Multiplier`; `model/gurps/enums/frequency/frequency.go` — `Roll.Multiplier`.
- **Confirmada:** `PrereqList`, `AttributePrereq` e `EquippedEquipmentPrereq` possuem avaliação concreta documentada em `GCS-Prerequisites.md`; isso não confirma os demais tipos de `Prereq`. Rastreabilidade: `model/gurps/prereq.go`; `model/gurps/prereq_list.go` — `(*PrereqList).Satisfied`; `model/gurps/attribute_prereq.go` — `(*AttributePrereq).Satisfied`; `model/gurps/equipped_equipment_prereq.go` — `(*EquippedEquipmentPrereq).Satisfied`.
- **Confirmada:** estrutura e persistência observadas de Skills, Spells, Equipment e Weapons estão separadas nos respectivos documentos de domínio; o README não replica esses detalhes.

## Questões abertas coordenadas

- **Não confirmada:** cadeia completa de consumo de cada tipo concreto de `Feature` originada em `TraitModifier`, além da coleta e despacho já confirmados em `Entity.processFeatures()`/`processFeature()`.
- **Não confirmada:** avaliação concreta de `TraitPrereq`, `SkillPrereq`, `SpellPrereq`, `ContainedWeightPrereq` e `ScriptPrereq`; `PrereqList`, `AttributePrereq` e `EquippedEquipmentPrereq` já foram observados e não integram mais esta questão aberta.
- **Não confirmada:** algoritmos internos de `Skill.UpdateLevel()` e `Spell.UpdateLevel()` além de sua participação já confirmada no ciclo de convergência de `Entity.Recalculate()`.
- **Não confirmada:** participação completa de Weapons e Templates no grafo e no ciclo de vida, fora dos pontos já documentados por inspeção direta. Para Weapons, estrutura, identidade, clonagem e persistência já estão confirmadas em `GCS-Weapons.md`; resolução e vínculo concreto com implementações de `WeaponOwner` permanecem abertos.

Questões resolvidas deixam esta lista quando a implementação correspondente é observada e registrada no documento de domínio apropriado; o README conserva apenas o estado coordenado atual.
