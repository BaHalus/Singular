# GCS — Spells

## Escopo e evidência

**Status desta passagem: Confirmada.** Este documento registra somente comportamento observado diretamente na implementação pública de `richardwilkes/gcs`, no commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

Fonte principal: `model/gurps/spell.go`, tipos `Spell`, `SpellData`, `SpellEditData`, `SpellNonContainerOnlyEditData`, `SpellSyncData`, `SpellNonContainerOnlySyncData`, `spellListData` e funções de cálculo de nível nele definidas.

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

## Atualização e cálculo de nível

**Confirmada.** `(*Spell).UpdateLevel()` salva o `LevelData` anterior, resolve `CollegeWithReplacements()` e substitui `LevelData` pelo resultado de um de dois caminhos: `CalculateRitualMagicSpellLevel(...)` quando `IsRitualMagic()` é verdadeiro, ou `CalculateSpellLevel(...)` nos demais casos. O retorno é `saved != s.LevelData`. Rastreabilidade: `model/gurps/spell.go` — `(*Spell).UpdateLevel`.

**Confirmada.** `(*Spell).CalculateLevel()` executa os mesmos dois caminhos de cálculo sem escrever em `s.LevelData`. Rastreabilidade: `model/gurps/spell.go` — `(*Spell).CalculateLevel`.

**Confirmada.** `CalculateSpellLevel()` inicia `relativeLevel` com `attrDiff.Difficulty.BaseRelativeLevel()` e `level` com `fxp.Min`. Com `Entity` presente, os pontos são truncados por `Floor()` e o nível-base é obtido por `Entity.ResolveAttributeCurrent(attrDiff.Attribute)`. Para dificuldade `Wildcard`, os pontos usados no cálculo são divididos por três e truncados. Rastreabilidade: `model/gurps/spell.go` — `CalculateSpellLevel`.

**Confirmada.** Ainda em `CalculateSpellLevel()`, pontos inferiores a 1 colocam `level` em `fxp.Min` e `relativeLevel` em zero; exatamente 1 ponto mantém o relativo-base; valores entre 1 e 4 acrescentam 1 ao relativo; a partir de 4, o acréscimo observado é `1 + floor(points/4)`. Se `level` não for `fxp.Min`, `Entity.SpellBonusFor(...)` é somado ao nível relativo, o resultado relativo é truncado por `Floor()` e então somado ao nível absoluto. O `Level` retornado contém `Level`, `RelativeLevel` e o tooltip acumulado. Rastreabilidade: `model/gurps/spell.go` — `CalculateSpellLevel`; `Entity.SpellBonusFor` é chamado aqui, sem que sua implementação interna seja afirmada neste documento.

**Confirmada.** `CalculateRitualMagicSpellLevel()` calcula uma opção por college através de `determineRitualMagicSkillLevelForCollege()` e conserva a de maior `Level`; sem colleges, chama a mesma função com college vazio. Com `Entity` presente, chama `Entity.SpellBonusFor(...)`, trunca o bônus com `Floor()` e soma o resultado tanto a `Level` quanto a `RelativeLevel`. Rastreabilidade: `model/gurps/spell.go` — `CalculateRitualMagicSpellLevel`.

**Confirmada.** `determineRitualMagicSkillLevelForCollege()` constrói um `SkillDefault` de tipo `SkillID`, especialização igual ao college e modificador `-prereqCount`; quando `ritualSkillName` não é vazio, também exige esse nome. O cálculo principal chama `CalculateTechniqueLevel(...)`; em seguida o método soma `def.Modifier` ao `RelativeLevel`, porque o comentário da própria implementação registra que `CalculateTechniqueLevel()` não adiciona esse modificador ao nível relativo. Rastreabilidade: `model/gurps/spell.go` — `determineRitualMagicSkillLevelForCollege`.

**Confirmada.** O mesmo método calcula um fallback removendo a especialização do default e reduzindo seu modificador em mais 6. Esse fallback também passa por `CalculateTechniqueLevel(...)` e recebe `def.Modifier` em `RelativeLevel`. A função retorna o cálculo principal quando seu `Level` é maior ou igual ao fallback; caso contrário, retorna o fallback. Rastreabilidade: `model/gurps/spell.go` — `determineRitualMagicSkillLevelForCollege`, `specializedRitualSkills`.

**Confirmada.** `RitualMagicSatisfied()` retorna imediatamente verdadeiro para spells que não são Ritual Magic. Para Ritual Magic, ausência de college produz falso. Com colleges presentes, retorna verdadeiro se encontrar `BestSkillNamed(ritual, college, ...)` para qualquer college; caso contrário procura uma skill com o nome ritual e especialização efetivamente vazia. Sem correspondência, retorna falso e pode escrever a exigência no tooltip. Rastreabilidade: `model/gurps/spell.go` — `(*Spell).RitualMagicSatisfied`.

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

- **Não confirmada nesta passagem:** implementação interna de `Entity.SpellBonusFor()` e do ajuste de pontos usado por `Spell.AdjustedPoints()`.
- **Não confirmada nesta passagem:** implementação completa de `CalculateTechniqueLevel()`, embora sua chamada e os ajustes posteriores feitos pelo caminho de Ritual Magic estejam confirmados acima.
- **Não confirmada nesta passagem:** semântica interna de `SpellPrereq`.
- **Não confirmada nesta passagem:** interação detalhada entre `Weapons` incorporadas ao spell e o restante do motor.

Esses pontos permanecem fora deste documento até inspeção direta das implementações correspondentes.
