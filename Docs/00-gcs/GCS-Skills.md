# GCS — Skills

## Escopo e evidência

**Status desta passagem: Confirmada.** Este documento registra somente comportamento observado diretamente na implementação pública de `richardwilkes/gcs`, no commit `49cb0baddb44d15421e13138a7b1b104d4a12163`.

Fonte principal desta passagem: `model/gurps/skill.go`, tipos `Skill`, `SkillData`, `SkillEditData`, `SkillNonContainerOnlyEditData`, `SkillSyncData`, `SkillNonContainerOnlySyncData`, `SkillContainerOnlySyncData` e `skillListData`.

## Estrutura do domínio

**Confirmada.** `Skill` incorpora `SkillData` e mantém três campos não pertencentes a `SkillData`: `owner DataOwner`, `LevelData Level` e `UnsatisfiedReason string`.

**Confirmada.** `SkillData` contém `SourcedID`, `SkillEditData`, `ThirdParty`, `Children` e um ponteiro privado `parent *Skill`. `Children` é serializado como `children` e é indicado pela própria implementação como aplicável apenas a containers.

**Confirmada.** Os dados editáveis/persistidos são decompostos em estruturas comuns, exclusivas de itens não-container e exclusivas de containers. Entre os campos observados de itens não-container estão `TechLevel`, `Points`, `DefaultedFrom`, `Study`, `StudyHoursNeeded`, `Specialization`, `OptionalSpecialization`, `Difficulty`, `EncumbrancePenaltyMultiplier`, `Defaults`, `TechniqueDefault`, `TechniqueLimitModifier`, `Prereq`, `Weapons` e `Features`. Containers possuem `TemplatePicker`.

## Identidade, containers e técnicas

**Confirmada.** `NewSkill()` cria TID com `skillKind(container)`. Para container, inicializa `TemplatePicker`; para skill comum, inicializa o atributo de dificuldade com Dexterity, dificuldade Average e `Points = fxp.One`.

**Confirmada.** `Container()` determina a natureza de container pelo kind do TID (`kinds.SkillContainer`). `HasChildren()` exige simultaneamente `Container()` e `len(Children) > 0`.

**Confirmada.** `NewTechnique()` usa TID de `kinds.Technique`, dificuldade Average e um ponto. Também cria `TechniqueDefault` do tipo `SkillID`, cujo critério de nome recebe o nome da skill fornecida (ou `"Skill"` quando vazio).

**Confirmada.** `IsTechnique()` também é determinado pelo kind do TID, especificamente `kinds.Technique`.

## Relacionamentos e clonagem

**Confirmada.** A hierarquia de skills é representada por `Children []*Skill` e `parent *Skill`. `Parent()`, `SetParent()`, `NodeChildren()` e `SetChildren()` expõem essas relações.

**Confirmada.** `Clone()` preserva a distinção entre técnica, skill e container. Quando existem filhos, cada filho é clonado recursivamente com o novo objeto como `parent` e com o mesmo `owner` recebido pela clonagem.

## Persistência de listas

**Confirmada.** Listas independentes usam `skillListData`, com `Version int` e `Rows []*Skill`.

**Confirmada.** `NewSkillsFromFile()` carrega via `jio.Load`, valida `Version` com `jio.CheckVersion` e percorre toda a árvore. Durante esse percurso há uma correção explícita de dados: técnicas Hard com exatamente um ponto passam a dois pontos. Em seguida `SetDataOwner(nil)` é chamado para cada skill percorrida.

**Confirmada.** `SaveSkills()` grava `skillListData` via `jio.SaveToFile`, usando `jio.CurrentDataVersion` e a coleção recebida em `Rows`.

## Serialização de uma Skill

**Confirmada.** `MarshalJSONTo()` chama `ClearUnusedFieldsForType()` antes da serialização.

**Confirmada.** O bloco calculado `calc` pode incluir `resolved_notes` e `unsatisfied_reason`. Para uma skill não-container com `LevelData.Level > 0`, inclui também `level` e `rsl`; containers ou skills cujo nível calculado não seja positivo não recebem esses dois campos no formato observado.

**Confirmada.** `UnmarshalJSONFrom()` aceita campos antigos (`type`, `notes`, `categories`, `open`). Se o TID carregado não for válido, cria um novo TID; `type == "technique"` seleciona `kinds.Technique`, e nos demais casos o sufixo de container do tipo antigo determina `skillKind(...)`.

**Confirmada.** Na desserialização, `TechniqueDefault.Name.Compare` é normalizado para `criteria.IsText` quando `TechniqueDefault` existe. Notas antigas podem ser convertidas para `LocalNotes` por `EmbeddedExprToScript`; categorias antigas são convertidas em tags e as tags são ordenadas.

**Confirmada.** Após carregar um container, `UnmarshalJSONFrom()` percorre `Children` e restaura diretamente `one.parent = s`. Portanto o ponteiro privado de ascendência não depende do JSON persistido.

## Questões ainda não documentadas nesta passagem

- **Não confirmada nesta passagem:** algoritmo completo de `Skill.UpdateLevel()` e cálculo de `LevelData`.
- **Não confirmada nesta passagem:** resolução completa de defaults e escolha de `DefaultedFrom`.
- **Não confirmada nesta passagem:** semântica interna de `SkillDefault`, `SkillBonus`, `SkillPointBonus` e `SkillPrereq`.
- **Não confirmada nesta passagem:** interação detalhada entre `Weapons` incorporadas à skill e o restante do motor.

Esses pontos permanecem fora deste documento até inspeção direta das implementações correspondentes.
