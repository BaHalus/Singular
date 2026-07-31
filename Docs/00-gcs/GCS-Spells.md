# GCS — Spells

## Escopo e evidência

**Status desta passagem: Confirmada.** Este documento registra somente comportamento observado diretamente na implementação pública de `richardwilkes/gcs`, no commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

Fonte principal desta passagem: `model/gurps/spell.go`, tipos `Spell`, `SpellData`, `SpellEditData`, `SpellNonContainerOnlyEditData`, `SpellSyncData`, `SpellNonContainerOnlySyncData` e `spellListData`.

## Estrutura do domínio

**Confirmada.** `Spell` incorpora `SpellData` e mantém `owner DataOwner`, `LevelData Level` e `UnsatisfiedReason string` fora de `SpellData`.

**Confirmada.** `SpellData` contém `SourcedID`, `SpellEditData`, `ThirdParty`, `Children []*Spell` e o ponteiro privado `parent *Spell`. `Children` é persistido como `children` e é indicado pela implementação como aplicável apenas a containers.

**Confirmada.** Entre os dados persistidos exclusivos de spells não-container estão `TechLevel`, `Points`, `Study` e `StudyHoursNeeded`. A estrutura sincronizada não-container inclui `Difficulty`, `College`, `PowerSource`, `Class`, `Resist`, `CastingCost`, `MaintenanceCost`, `CastingTime`, `Duration`, `Item`, `RitualSkillName`, `PrereqCount`, `Prereq` e `Weapons`.

**Confirmada.** `SpellEditData` também incorpora `SkillContainerOnlySyncData`; containers recebem `TemplatePicker` na criação.

## Identidade e criação

**Confirmada.** `spellKind(container)` retorna `kinds.SpellContainer` para containers e `kinds.Spell` para spells comuns. `Container()` consulta o kind do TID e `HasChildren()` exige container e pelo menos um filho.

**Confirmada.** `NewSpell()` cria o TID conforme `spellKind(container)`, associa `parent` e `owner` e, para containers, inicializa `TemplatePicker`.

**Confirmada.** Para spell comum, `NewSpell()` inicializa o atributo da dificuldade com Intelligence, dificuldade Hard, `PowerSource = "Arcane"`, `Class = "Regular"`, `CastingCost = "1"`, `CastingTime = "1 second"`, `Duration = "Instant"` e `Points = fxp.One`. Em seguida define o nome a partir de `Kind()`, chama `UpdateLevel()` e ajusta o estado aberto conforme `container`.

**Confirmada.** `NewRitualMagicSpell()` cria TID `kinds.RitualMagicSpell`, associa `parent` e `owner`, inicializa os mesmos valores observados de dificuldade, fonte, classe, custo, tempo, duração e pontos, define `RitualSkillName = "Ritual Magic"`, usa `Kind()` como nome e chama `SetRawPoints(0)`.

**Confirmada.** `IsRitualMagic()` é determinado pelo kind `kinds.RitualMagicSpell` do TID.

## Relacionamentos e clonagem

**Confirmada.** A hierarquia usa `Children []*Spell` e `parent *Spell`, expostos por `NodeChildren()`, `SetChildren()`, `Parent()` e `SetParent()`.

**Confirmada.** `Clone()` preserva a distinção de Ritual Magic, spell comum e container. Filhos são clonados recursivamente, recebendo o novo spell como `parent` e o `owner` fornecido à clonagem.

## Persistência de listas

**Confirmada.** Listas independentes são persistidas por `spellListData`, composto por `Version int` e `Rows []*Spell`.

**Confirmada.** `NewSpellsFromFile()` carrega com `jio.Load`, valida a versão com `jio.CheckVersion` e percorre a árvore chamando `SetDataOwner(nil)` em cada spell.

**Confirmada.** `SaveSpells()` grava `spellListData` com `jio.SaveToFile`, `jio.CurrentDataVersion` e os spells recebidos em `Rows`.

## Serialização e migração

**Confirmada.** `MarshalJSONTo()` chama `ClearUnusedFieldsForType()` antes de serializar.

**Confirmada.** O bloco calculado pode incluir `resolved_notes`. Para spell não-container com `LevelData.Level > 0`, inclui ainda `level`, `rsl` e, quando presente, `unsatisfied_reason`. Containers e spells cujo nível calculado não seja positivo não recebem `level` e `rsl` no formato observado.

**Confirmada.** `UnmarshalJSONFrom()` aceita os campos antigos `type`, `notes`, `categories` e `open`. Quando o TID carregado é inválido, `type == "ritual_magic_spell"` produz kind `kinds.RitualMagicSpell`; nos demais casos o sufixo de container do tipo antigo determina `spellKind(...)`.

**Confirmada.** Notas antigas podem ser convertidas para `LocalNotes` por `EmbeddedExprToScript`; categorias antigas são convertidas para tags e as tags são ordenadas.

**Confirmada.** Na desserialização de um container, a implementação percorre `Children` e restaura diretamente `one.parent = s`. O ponteiro privado `parent` não depende, portanto, de persistência própria no JSON.

## Questões ainda não documentadas nesta passagem

- **Não confirmada nesta passagem:** algoritmo interno de `Spell.UpdateLevel()` e cálculo de `LevelData`.
- **Não confirmada nesta passagem:** semântica interna de `SpellBonus`, `SpellPointBonus` e `SpellPrereq`.
- **Não confirmada nesta passagem:** cálculo e uso posterior de `PrereqCount`.
- **Não confirmada nesta passagem:** interação detalhada entre `Weapons` incorporadas ao spell e o restante do motor.
- **Não confirmada nesta passagem:** comportamento interno específico de Ritual Magic além do observado em `spell.go`.

Esses pontos permanecem fora deste documento até inspeção direta das implementações correspondentes.
