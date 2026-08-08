# GCS — síntese arquitetural confirmada e comparação com a SINGULAR

## Escopo

Este documento consolida a arquitetura observada no código público de `richardwilkes/gcs` e os artefatos públicos de `richardwilkes/gcs_master_library`.

Ele separa rigorosamente:

- **Fato GCS:** comportamento observado diretamente na implementação ou em documentação/artefatos do repositório-fonte.
- **Decisão SINGULAR:** escolha arquitetural própria da SINGULAR; não é atribuída ao GCS.

A parte de implementação do GCS é ancorada no commit `49cb0baddb44d15421e13138a7b1b104d4a12163`, já utilizado pelos documentos especializados desta pasta. O `gcs_master_library` é referenciado pelo estado público `main` observado nesta investigação.

## 1. Modelo arquitetural confirmado do GCS

### 1.1 Agregado de personagem

**Fato GCS — confirmado.** `Entity` é o objeto coordenador que contém dados persistidos de personagem e estado derivado de runtime. `EntityData` contém, entre outros, identidade (`ID`), pontos, perfil, settings, atributos, Traits, Skills, Spells, equipamentos, notas, datas e dados de terceiros. `Entity` acrescenta bônus derivados, coleções internas de features e caches que não pertencem ao bloco persistido.

Rastreabilidade: `richardwilkes/gcs/model/gurps/entity.go` — `EntityData`, `Entity`.

### 1.2 Grafo de objetos e ownership

**Fato GCS — confirmado.** Traits, Skills, Spells, Equipment e Notes mantêm vínculos de runtime com a `Entity` por `DataOwner`; atributos recebem diretamente `Entity = e`. Traits e modificadores, além de Equipment e seus modificadores, podem formar árvores com `parent`/`Children`.

**Fato GCS — confirmado.** `Entity.Recalculate()` chama `ensureAttachments()` antes do processamento, reconstituindo esses vínculos de runtime.

Rastreabilidade: `entity.go` — `ensureAttachments`; `trait.go`; `trait_modifier.go`; documentos `GCS-Character.md` e `GCS-Trait-Modifiers.md`.

### 1.3 Estado derivado não é separado em um snapshot soberano

**Fato GCS — confirmado.** O GCS mantém valores derivados dentro dos objetos em runtime: bônus de atributos, bônus de ST, Dodge/Parry/Block, `UnsatisfiedReason`, `LevelData` de Skills/Spells e coleções internas de bônus/features. Caches também vivem na `Entity`.

**Fato GCS — confirmado.** A serialização da `Entity` chama `Recalculate()` antes de emitir o bloco `calc`, de modo que resultados derivados são recalculados no caminho de persistência/serialização.

Rastreabilidade: `entity.go`; `skill.go`; `spell.go`; documentos `GCS-Recalculate.md`, `GCS-Skill-Level.md` e `GCS-Spells.md`.

### 1.4 Recálculo como ciclo de convergência

**Fato GCS — confirmado.** `Entity.Recalculate()` executa:

```text
ensureAttachments
→ DiscardCaches
→ PrepareHashes
→ UpdateSkills
→ UpdateSpells
→ repetir até 5 vezes:
    processFeatures
    → processPrereqs
    → DiscardCaches
    → UpdateSkills
    → UpdateSpells
```

O laço termina antes de cinco passagens quando Skills e Spells deixam de reportar mudança. O próprio comentário do método atribui a repetição a referências circulares entre níveis de Skills/Spells, Features e Prerequisites.

Rastreabilidade: `entity.go` — `Recalculate`, `UpdateSkills`, `UpdateSpells`; `GCS-Recalculate.md`.

### 1.5 Features como mecanismo de propagação

**Fato GCS — confirmado.** `processFeatures()` reconstrói a coleção interna de features a cada passagem. O dispatcher reconhece tipos concretos de bônus, reduções, overrides e bônus de armas/DR e injeta contexto de owner/sub-owner/leveled-owner antes de armazená-los.

**Fato GCS — confirmado.** Features podem vir de Traits, TraitModifiers, Skills e Equipment realmente equipado; EquipmentModifiers também participam. Features derivadas de autocontrole são processadas depois da primeira coleta de selector overrides.

**Fato GCS — confirmado.** `ConditionalModifierBonus`, `ContainedWeightReduction` e `ReactionBonus` são reconhecidos no dispatcher, mas não são coletados naquela etapa específica; tipos desconhecidos caem no caminho de `unhandled feature`.

Rastreabilidade: `entity.go` — `processFeatures`, `processFeature`, `expandThisArmorDRBonus`; `GCS-Recalculate.md`.

### 1.6 Pré-requisitos como participantes do recálculo

**Fato GCS — confirmado.** `processPrereqs()` recalcula `UnsatisfiedReason` para Traits, Skills, Spells e Equipment. Para Skills e Spells, uma penalidade de equipamento sinalizada pelo prerequisite pode gerar dinamicamente um `SkillBonus` ou `SpellBonus` negativo dentro das features da própria Entity.

**Fato GCS — confirmado.** Skills e Spells podem possuir etapas adicionais de satisfação após o prerequisite principal, como `TechniqueSatisfied()` e `RitualMagicSatisfied()`.

Rastreabilidade: `entity.go`; `GCS-Prerequisites.md`; `GCS-Recalculate.md`.

### 1.7 Modificadores de Trait

**Fato GCS — confirmado.** `TraitModifier` é um nó próprio, podendo ser container ou não-container. O estado persistido inclui custo (`CostAdj`), níveis, habilitação, `Affects`, Features, tags, origem e filhos quando container.

**Fato GCS — confirmado.** A habilitação de um modificador não-container depende de `Disabled`; containers são considerados habilitados independentemente desse campo. `UseLevelFromTrait` pode vincular o nível do modificador ao Trait proprietário.

**Fato GCS — confirmado.** `CostModifier()` interpreta o ajuste através de `emweight.ValueFromString(...).ExtractFraction(...)` e o escala pelo multiplicador de nível observado.

Rastreabilidade: `trait_modifier.go`; `GCS-Trait-Modifiers.md`.

### 1.8 Pricing de Traits

**Fato GCS — confirmado.** O preço ajustado de Trait considera os dados de base/níveis e os modificadores de custo observados, além dos multiplicadores de autocontrole/frequência e regras de arredondamento documentadas em `GCS-Trait-Pricing.md`.

**Limite de evidência.** A gramática completa de `CostAdj` e a implementação interna de `ExtractFraction()` não são tratadas como fatos neste documento porque permanecem explicitamente abertas nos documentos especializados.

### 1.9 Defaults e Skills como dependência resolvida

**Fato GCS — confirmado.** `Skill.UpdateLevel()` recalcula defaults e nível; `SkillDefault.SkillLevel()` pode consultar Skills, atributos e características defensivas. `SkillLevelFast()` usa dados de nível já armazenados, enquanto o caminho completo pode recalcular candidatos. A seleção de defaults evita ciclos segundo os mecanismos rastreados em `GCS-Skill-Level.md`.

**Fato GCS — confirmado.** A própria necessidade de repetir `UpdateSkills()` no ciclo de `Entity.Recalculate()` demonstra que níveis de Skills participam de um grafo de dependências que não é resolvido por uma única passagem.

Rastreabilidade: `skill.go`, `skill_default.go`, `GCS-Skill-Level.md`, `GCS-Recalculate.md`.

### 1.10 Persistência

**Fato GCS — confirmado.** `Entity` é carregada e salva como JSON por `jio.Load`/`jio.SaveToFile`. `NewEntityFromFile()` valida versão; `UnmarshalJSONFrom()` executa migrações/normalizações observadas e depois recalcula; `Save()` recalcula antes de persistir.

**Fato GCS — confirmado.** Traits e TraitModifiers também possuem funções próprias de carga/salvamento de listas JSON e mantêm identificadores, origem, campos de edição e árvores conforme seus contratos de dados.

**Fato GCS — confirmado.** A serialização da Entity inclui tanto dados persistidos quanto um bloco `calc` calculado durante o `MarshalJSONTo()`.

Rastreabilidade: `entity.go`, `trait.go`, `trait_modifier.go`; `GCS-Character.md`, `GCS-Trait-Modifiers.md`.

## 2. Organização dos subsistemas confirmada

```text
model/gurps/
├── Entity / Character coordination
├── Attributes
├── Traits
│   └── TraitModifiers
├── Skills
│   └── SkillDefaults / Techniques
├── Spells
├── Equipment
│   └── EquipmentModifiers / Weapons
├── Features / Bonuses / Overrides
├── Prerequisites
├── Templates
├── serialization / import-export helpers
└── enums / criteria / numeric value types

ux/
└── editors, tables, navigation, library UI e ações

model/gurps + model/jio
└── persistência e transformação dos dados
```

**Fato GCS — confirmado.** A implementação separa o modelo de domínio (`model/gurps`) da camada de UX (`ux`). Os documentos analisados não sustentam a afirmação de que a UX seja uma camada puramente passiva: existem ações/editor/updater e outros componentes de UX que interagem com o modelo. Portanto, essa conclusão mais forte permanece fora deste documento.

## 3. `gcs_master_library`: fatos observados

### 3.1 Organização física

**Fato do repositório — confirmado.** O `gcs_master_library` organiza conteúdo sob `Library/`, incluindo diretórios por linha editorial/produto, como `Basic Set`, `Bio-Tech`, `Psionics`, `High Tech`, `Ultra Tech`, `Dungeon Fantasy RPG`, `Infinite Worlds`, `Monster Hunters`, `Tactical Shooting` e conteúdo `Home Brew`.

**Fato do repositório — confirmado.** Há artefatos de múltiplos tipos, incluindo exemplos observados de `.eqp` (Equipment), `.eqm` (Equipment Modifiers), `.gct` (templates/coleções de conteúdo em exemplos do repositório) e `.gcs` em pelo menos um artefato de biblioteca.

Rastreabilidade: `richardwilkes/gcs_master_library/Library/...`.

### 3.2 Documentação da biblioteca

**Fato do repositório — confirmado.** O repositório contém documentação Markdown de User Guide e Scripting, incluindo páginas específicas para Equipment, Equipment Modifiers, Trait Modifiers e seus modelos de scripting.

**Fato do repositório — confirmado.** A documentação de Trait Modifiers descreve modificadores como enhancements/limitations aplicáveis a Traits, com estado enabled/disabled, custo, nível, vínculo opcional ao nível do owner, Features e identificação de origem no Master Library.

**Fato do repositório — confirmado.** A documentação de Equipment Modifiers descreve ajustes de custo monetário e peso, estado enabled/disabled, aplicação por nível, Features e múltiplos estágios de ajuste. Também descreve identificação da fonte na Master Library.

Rastreabilidade: `Library/Markdown/User Guide/Trait Modifiers.md`; `Library/Markdown/User Guide/Equipment Modifiers.md`.

### 3.3 O que a biblioteca não prova

**Não confirmado.** A simples presença de uma extensão ou diretório não é tratada como prova de seu parser interno, contrato completo ou ciclo de sincronização. Para esses pontos, esta documentação depende da implementação correspondente no `gcs`.

## 4. Fluxo arquitetural confirmado do GCS

```text
edição / importação / construção
        │
        ▼
objetos do modelo + árvores + Features + Prerequisites
        │
        ▼
Entity.Recalculate()
        │
        ├── reanexa ownership
        ├── limpa caches
        ├── atualiza Skills/Spells
        ├── coleta Features
        ├── avalia Prerequisites
        └── repete até convergir ou 5 passagens
        │
        ▼
estado derivado atualizado no modelo
        │
        ├── UI consulta valores
        └── Save/MarshalJSON recalculam novamente
```

**Fato GCS — confirmado.** Esse fluxo é uma síntese dos métodos observados; não é uma arquitetura declarada pelo projeto GCS. A existência do ciclo e seus pontos de entrada é, entretanto, diretamente confirmada pela implementação.

## 5. Comparação separada: arquitetura desejada da SINGULAR

Esta seção **não descreve o GCS**. Ela registra decisões da SINGULAR e as contrasta com os fatos acima.

### 5.1 Fonte soberana de estado

**Decisão SINGULAR.** `Character` é o Aggregate Root da SINGULAR e a unidade fundamental de persistência, serialização e manipulação. O domínio deve preferir objetos de dados simples, composição, funções puras e imutabilidade.

**Diferença.** O GCS possui `Entity` mutável e reanexa ownership/caches em runtime. A SINGULAR deve evitar reproduzir esses vínculos mutáveis como mecanismo estrutural do domínio.

Rastreabilidade SINGULAR: `Docs/01-arquitetura/Character.md`; `Docs/ADR/ADR-0001-Character-Imutavel.md`.

### 5.2 Motor soberano versus recálculo embutido no agregado

**Decisão SINGULAR.** `Character` mantém estrutura e invariantes, mas não executa regras de GURPS. Regras devem ser resolvidas por serviços/motor de domínio apropriados, com contratos explícitos.

**Diferença.** No GCS, `Entity.Recalculate()` coordena diretamente Features, Prerequisites, Skills e Spells e muta estado derivado da própria Entity.

**Implicação de implementação.** A SINGULAR pode aproveitar o conhecimento do grafo de dependências do GCS, mas não deve copiar `Entity.Recalculate()` como método mutador do Aggregate Root.

### 5.3 Estado derivado e snapshot

**Decisão SINGULAR.** O domínio deve distinguir estado canônico do Character de resultados derivados produzidos pelo motor. A UI deve consumir o resultado calculado e não duplicar regras.

**Diferença.** O GCS armazena diversos resultados derivados dentro de objetos de domínio/runtime e recalcula também durante serialização.

**Implicação de implementação.** O equivalente SINGULAR deve ter uma fronteira explícita entre entrada canônica, cálculo e resultado/snapshot; persistência não deve ser usada como gatilho implícito para corrigir o domínio.

### 5.4 Dependências

**Decisão SINGULAR.** Dependências devem ser representadas explicitamente no motor e resolvidas de forma determinística, com contratos testáveis. Ciclos devem ser identificados como parte do modelo de cálculo, e não escondidos em um limite arbitrário de iterações.

**Diferença.** O GCS confirma um ciclo de convergência com máximo fixo de cinco passagens.

**Implicação de implementação.** A SINGULAR deve preservar o comportamento necessário do grafo, mas substituir a política de convergência por um mecanismo explicitamente especificado pelo motor, incluindo diagnóstico de não convergência quando aplicável.

### 5.5 Modificadores

**Fato GCS.** TraitModifiers e EquipmentModifiers são estruturas próprias, persistíveis, habilitáveis/desabilitáveis e capazes de carregar Features.

**Decisão SINGULAR.** Modificadores são conceitos GURPS específicos e devem permanecer modelados como tais; não devem ser reduzidos a uma abstração genérica de RPG que perca a semântica de Trait, Equipment, Feature, custo, níveis e estágios.

**Implicação de implementação.** A SINGULAR deve separar pelo menos:

```text
Trait
└── TraitModifier

Equipment
└── EquipmentModifier

Feature
└── efeitos concretos consumidos pelo motor
```

A ordem e as fases de aplicação de modificadores devem ser especificadas pelo domínio SINGULAR; não devem ser inferidas apenas da existência das estruturas GCS.

### 5.6 Persistência

**Fato GCS.** Save e Marshal podem disparar recálculo; load também termina com recálculo.

**Decisão SINGULAR.** Persistência deve transportar o estado canônico do Character e os dados persistíveis definidos pelo contrato. Cálculo não deve ser uma responsabilidade implícita do serializer.

**Implicação de implementação.** `load → validate → calculate` e `edit → calculate → present → persist` devem ser fluxos explícitos da aplicação/motor, em vez de efeitos colaterais escondidos em `serialize()`/`save()`.

### 5.7 Biblioteca e importação

**Fato GCS.** O Master Library é organizado como coleção de conteúdo versionado por fontes/produtos, com artefatos de Traits, Equipment, Modifiers, templates e documentação.

**Decisão SINGULAR.** Importação deve preservar a proveniência e os dados brutos relevantes antes de normalização, e converter o conteúdo para contratos próprios da SINGULAR sem fazer a UI conhecer o formato GCS.

**Implicação de implementação.** A fronteira recomendada é:

```text
GCS raw payload
    ↓
Importer / adapter
    ↓
SINGULAR domain contract
    ↓
Motor soberano
    ↓
snapshot
    ↓
UI
```

## 6. Contratos arquiteturais derivados para implementação SINGULAR

Os itens abaixo são **decisões de projeto SINGULAR**, não fatos do GCS.

### C-01 — Character

`Character` deve ser o Aggregate Root persistível. Deve conter apenas estado canônico e invariantes estruturais; não deve possuir um método equivalente a `Entity.Recalculate()` que mutile resultados derivados como parte da API de domínio.

### C-02 — Calculation input

O motor deve receber um `Character` válido e contexto explícito de cálculo. O cálculo deve produzir um resultado derivado/snapshot sem exigir que a UI execute fórmulas.

### C-03 — Calculation phases

O motor deve possuir fases explícitas, conceitualmente equivalentes às dependências confirmadas no GCS:

```text
normalize/attach runtime calculation context
→ resolve direct inputs
→ collect effects/features
→ resolve prerequisites/dependencies
→ resolve skills/spells and other dependents
→ finalize derived values
→ emit snapshot + diagnostics
```

A sequência exata é contrato do motor SINGULAR e não deve ser apresentada como comportamento do GCS.

### C-04 — Modifier contract

Cada modificador deve declarar explicitamente seu alvo GURPS, estado de habilitação, parâmetros persistidos, proveniência e efeitos. O motor deve aplicar o modificador por fases sem depender de mutação silenciosa de objetos persistidos.

### C-05 — Dependency contract

Dependências entre Skills, Defaults, Traits, Features, Prerequisites, Spells e Equipment devem ser resolvíveis por serviços do motor. O contrato deve permitir detectar ciclo e não convergência.

### C-06 — Persistence boundary

Serializadores não devem iniciar cálculo por efeito colateral. Se uma operação exige estado derivado atualizado, ela deve chamar explicitamente o motor e persistir o estado canônico conforme o contrato de persistência.

### C-07 — Library boundary

O formato GCS é responsabilidade do importer. Nenhum componente da UI deve depender diretamente de `.gcs`, `.eqp`, `.eqm`, `.gct` ou de estruturas internas do GCS.

## 7. Matriz de diferenças

| Tema | GCS confirmado | SINGULAR desejada |
|---|---|---|
| Root | `Entity` mutável | `Character` como Aggregate Root preferencialmente imutável |
| Cálculo | `Entity.Recalculate()` muta/atualiza estado derivado | Motor explícito produz resultado derivado |
| Dependências | ciclo de até 5 iterações | resolução explícita + diagnóstico de ciclo/não convergência |
| Features | coletadas em runtime dentro da Entity | efeitos resolvidos pelo motor |
| Prerequisites | participam diretamente do recálculo | contratos de dependência explícitos |
| Modifiers | nós próprios, persistidos e com Features | conceitos GURPS próprios, sem abstração genérica que apague semântica |
| Caches | armazenados no objeto runtime | preferencialmente fora do estado canônico |
| Save | chama `Recalculate()` | cálculo deve ser explícito antes da persistência |
| Load | termina chamando `Recalculate()` | load/validate/calculate são etapas separadas |
| UI | camada UX integrada a ações/editors do modelo | UI consome contratos/snapshots; não calcula regras |
| Library | Master Library externa ao Character, organizada por fontes/produtos | importer/adapters preservam proveniência e normalizam para domínio SINGULAR |

## 8. Questões deliberadamente não resolvidas

Este documento não transforma em fato nenhuma das seguintes questões:

- algoritmo completo de todos os tipos de `Prereq`;
- implementação interna de todas as Features;
- gramática completa de todos os formatos de custo/modificador;
- pipeline completo de combate/WeaponDamage;
- sincronização integral da Master Library;
- comportamento de tipos do GCS que ainda não foram rastreados nos documentos especializados.

Esses pontos permanecem nas respectivas questões abertas de `Docs/00-gcs/`.

## 9. Fontes primárias utilizadas

### GCS

- `richardwilkes/gcs` — `model/gurps/entity.go`
- `richardwilkes/gcs` — `model/gurps/trait.go`
- `richardwilkes/gcs` — `model/gurps/trait_modifier.go`
- `richardwilkes/gcs` — `model/gurps/skill.go`
- `richardwilkes/gcs` — `model/gurps/skill_default.go`
- `richardwilkes/gcs` — `model/gurps/spell.go`
- Documentos especializados desta pasta `Docs/00-gcs/`

### Master Library

- `richardwilkes/gcs_master_library` — `Library/Markdown/User Guide/Trait Modifiers.md`
- `richardwilkes/gcs_master_library` — `Library/Markdown/User Guide/Equipment Modifiers.md`
- Conteúdo sob `Library/` para confirmação da organização física e dos tipos de artefato observados.

### SINGULAR — somente para a comparação arquitetural

- `Docs/01-arquitetura/Character.md`
- `Docs/ADR/ADR-0001-Character-Imutavel.md`
