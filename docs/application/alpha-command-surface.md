# Alpha command surface

## Status

Versioned with `APP-ALPHA-CONTRACT-DOCS-SYNC 1.0`.

## Purpose

This document is the short application-facing contract map for the Alpha command surface consumed by the mobile UI.

The authoritative runtime surface remains the canonical `AlphaCommandCatalog`, which composes command handler entries from pools, character summary, attributes, attacks, equipment, spells, powers, traits, skills, languages/culture, secondary characteristics and notes.

## Architectural boundaries

- The UI sends commands and renders returned snapshots/read models.
- The application validates payload shape, delegates to canonical domain operations and records receipts through the command executor/session flow.
- The domain remains the authority for character normalization and GURPS rule-bearing invariants.
- This surface does not create a second registry, executor, session, schema, snapshot normalizer or GURPS calculator.
- Concrete persistence stores portable snapshots and is outside this command contract.

## Common command envelope

Each Alpha command is expected to be routed through the canonical command executor with:

```js
{
  type: "command.type",
  payload: { }
}
```

Every handler requires a plain-object payload and rejects unsupported payload keys. Entity identifiers are non-empty strings where applicable. Reorder targets are integer indexes within the relevant collection contract.

## Command families

### Pools

Authority: `PoolCommandHandlers` and `PoolsOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `pool.current.set` | `{ poolKey, current }` | Sets transient pool current value. | Does not change structural maximum. |
| `pool.current.adjust` | `{ poolKey, delta }` | Adjusts transient pool current value. | Does not recalculate derived rules in UI. |
| `pool.current.reset-to-maximum` | `{ poolKey }` | Resets current value to maximum. | Does not add new pool schemas. |

Supported application pool keys are `HP`, `FP` and `EnergyReserve`.

### Character summary

Authority: `CharacterSummaryCommandHandlers` and `CharacterSummaryOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `character.summary.set` | `{ name, concept }` | Replaces summary identity fields. | Does not alter biography, notes or UI layout. |

### Attributes

Authority: `AttributeCommandHandlers` and `AttributesOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `attribute.base.adjust` | `{ attributeKey, delta }` | Adjusts an attribute base through the domain operation. | Does not calculate point totals in UI. |

### Attacks

Authority: `AttackCommandHandlers` and `AttacksOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `attack.add` | `{ attack }` | Appends a canonical attack snapshot. | Does not infer combat rules in application. |
| `attack.update` | `{ attackId, patch }` | Updates an existing attack through the domain operation. | Does not create a parallel attack schema. |
| `attack.remove` | `{ attackId }` | Removes an existing attack. | Does not alter equipment or traits automatically. |
| `attack.reorder` | `{ attackId, targetIndex }` | Reorders an attack. | Does not sort by display preferences. |

### Equipment

Authority: `EquipmentCommandHandlers` and `EquipmentOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `equipment.add` | `{ item }` | Adds root equipment; `item.id` is required. | Does not import catalogs. |
| `equipment.add-child` | `{ containerId, item }` | Adds child equipment inside a container; `item.id` is required. | Does not create UI drag/drop. |
| `equipment.update` | `{ itemId, patch }` | Updates an equipment item. | Does not recalculate in UI. |
| `equipment.rename` | `{ itemId, name }` | Renames an item. | Does not mutate unrelated fields. |
| `equipment.quantity.set` | `{ itemId, quantity }` | Sets item quantity. | Does not add pricing rules. |
| `equipment.state.set` | `{ itemId, state }` | Sets carried/equipped/storage state. | Does not persist UI-only filters. |
| `equipment.remove` | `{ itemId }` | Removes an item. | Does not alter external libraries. |
| `equipment.move` | `{ itemId, targetContainerId }` | Moves item to root or a target container. | Does not implement visual drag/drop. |
| `equipment.reorder` | `{ itemId, targetIndex }` | Reorders item in its current container. | Does not sort automatically. |

### Spells

Authority: `SpellCommandHandlers` and `Spells` domain contracts.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `spell.add` | `{ spell }` | Adds a spell; `spell.id` is required. | Does not import official spell catalogs. |
| `spell.update` | `{ spellId, patch }` | Updates mutable spell fields only. | Does not calculate spell NH in UI/application. |
| `spell.remove` | `{ spellId }` | Removes a spell. | Does not alter prerequisites elsewhere. |
| `spell.reorder` | `{ spellId, targetIndex }` | Reorders spells. | Does not sort by college/class. |

### Powers

Authority: `PowerCommandHandlers` and `PowersOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `power.add` | `{ power }` | Adds a power; `power.id` is required. | Does not build power frameworks. |
| `power.rename` | `{ powerId, name }` | Renames a power. | Does not rename member traits. |
| `power.source.set` | `{ powerId, source }` | Sets power source. | Does not infer source rules. |
| `power.modifier.set` | `{ powerId, powerModifier }` | Sets power modifier object or null through domain. | Does not calculate final costs. |
| `power.talentTrait.set` | `{ powerId, talentTraitId }` | Sets or clears associated talent trait id. | Does not create the trait. |
| `power.notes.update` | `{ powerId, notes }` | Updates notes. | Does not touch structured notes. |
| `power.memberTrait.add` | `{ powerId, traitId }` | Adds member trait id. | Does not mutate trait content. |
| `power.memberTrait.remove` | `{ powerId, traitId }` | Removes member trait id. | Does not delete the trait. |
| `power.tag.add` | `{ powerId, tag }` | Adds a tag. | Does not maintain external taxonomy. |
| `power.tag.remove` | `{ powerId, tag }` | Removes a tag. | Does not remove unrelated tags. |
| `power.remove` | `{ powerId }` | Removes a power. | Does not remove member traits. |

### Traits

Authority: `TraitCommandHandlers` and `TraitsOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `trait.add` | `{ trait }` | Appends a canonical trait snapshot. | Does not calculate cost in UI. |
| `trait.update` | `{ traitId, patch }` | Updates mutable trait fields through domain operation. | Does not create a parallel trait model. |
| `trait.remove` | `{ traitId }` | Removes a trait. | Does not cascade into powers unless commanded separately. |
| `trait.reorder` | `{ traitId, targetIndex }` | Reorders traits. | Does not sort by role automatically. |

### Skills and techniques

Authority: `SkillCommandHandlers`, `SkillsOperations` and `Techniques` contracts.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `skill.add` | `{ skill }` | Adds a skill. | Does not calculate final NH in UI/application. |
| `skill.update` | `{ skillId, patch }` | Updates mutable skill fields. | Does not import skill catalogs. |
| `skill.remove` | `{ skillId }` | Removes a skill. | Does not remove techniques automatically. |
| `skill.reorder` | `{ skillId, targetIndex }` | Reorders skills. | Does not sort by attribute/difficulty. |
| `technique.add` | `{ technique }` | Adds a technique. | Does not create linked skill automatically. |
| `technique.update` | `{ techniqueId, patch }` | Updates mutable technique fields. | Does not calculate technique NH. |
| `technique.remove` | `{ techniqueId }` | Removes a technique. | Does not alter the parent skill. |
| `technique.reorder` | `{ techniqueId, targetIndex }` | Reorders techniques. | Does not group automatically by skill. |

### Languages and cultural familiarities

Authority: `LanguageCultureCommandHandlers`, `LanguagesOperations` and `FamiliaritiesOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `language.add` | `{ language }` | Adds a language. | Does not infer native language. |
| `language.update` | `{ languageId, patch }` | Updates a language. | Does not calculate points in UI. |
| `language.remove` | `{ languageId }` | Removes a language. | Does not alter character identity. |
| `language.reorder` | `{ languageId, targetIndex }` | Reorders languages. | Does not sort by level/name. |
| `familiarity.add` | `{ familiarity }` | Adds a cultural familiarity. | Does not infer culture from language. |
| `familiarity.update` | `{ familiarityId, patch }` | Updates a familiarity. | Does not calculate costs in UI. |
| `familiarity.remove` | `{ familiarityId }` | Removes a familiarity. | Does not alter languages. |
| `familiarity.reorder` | `{ familiarityId, targetIndex }` | Reorders familiarities. | Does not sort by region. |

### Secondary characteristics

Authority: `SecondaryCommandHandlers`, `SecondaryCharacteristicsOperations` and `PoolsOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `secondary.base.set` | `{ characteristicKey, base }` | Sets structural secondary base. | Does not calculate derived values in UI. |
| `secondary.override.set` | `{ characteristicKey, override }` | Sets explicit secondary override. | Does not change base. |
| `secondary.override.clear` | `{ characteristicKey }` | Clears explicit secondary override. | Does not reset base. |
| `pool.maximum.set` | `{ poolKey, maximum }` | Sets structural maximum for supported pools. | Does not change transient current unless domain says so. |

Structural pool maximum support is limited to `HP` and `FP`.

### Notes

Authority: `NotesCommandHandlers` and `NotesOperations`.

| Command | Minimum payload | Effect | Non-goals |
| --- | --- | --- | --- |
| `notes.general.set` | `{ text }` | Replaces general notes text. | Does not edit structured notes. |
| `note.add` | `{ note }` | Adds a structured note. | Does not parse rich text. |
| `note.update` | `{ noteId, patch }` | Updates a structured note. | Does not mutate general notes. |
| `note.remove` | `{ noteId }` | Removes a structured note. | Does not alter other notes. |
| `note.reorder` | `{ noteId, targetIndex }` | Reorders structured notes. | Does not sort by title. |

## Validation and hardening evidence

The Alpha application surface is covered by the hardening sequence:

- invalid payload matrix;
- undo/redo matrix;
- JSON roundtrip matrix;
- no-op and atomicity matrix;
- corruption boundary checks.

These tests assert that invalid payloads are rejected without mutation, history/future snapshots are restored deterministically, portable metadata roundtrips, no-ops do not pollute history and corrupted session snapshots are rejected where canonical contracts already define that boundary.
