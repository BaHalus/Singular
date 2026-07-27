# Pesquisa: Trait Containers

## Resumo

Este relatório documenta como o repositório Singular implementa e usa os "Trait containers" — coleções de traços pertencentes a um `Character`. Cobre arquivos principais, arquitetura, APIs públicas, comportamentos notáveis, pontos de atenção e recomendações.

## Principais descobertas

- O "Trait container" canônico é a propriedade `traits` do `Character`, uma coleção imutável de objetos Trait criada por factories em `src/domain/character/Traits.js`.
- Todas as mutações são funcionais/imutáveis: operações (add/update/remove/reorder) em `src/domain/character/TraitsOperations.js` retornam novas coleções.
- Traços têm composição rica: `pointValue`, `modifiers`, `selfControl`, `frequency`, `externalIds`, entre outros, montados por `TraitFields.js`.
- Comandos finos (modifiers, cost-basis) são aplicados por motores de comandos (`TraitModifierCommands.js`, `TraitCostBasisCommands.js`).
- A camada de application expõe handlers (ex.: `TraitCommandHandlers.js`) que traduzem comandos da UI/persistência em operações de domínio e retornam snapshots serializáveis do `Character`.
- A UI mobile injeta e renderiza os traits via `src/ui/mobile/CharacterMobileApp.js` e comunica-se com a camada de application por comandos/snapshots.

## Arquivos mais relevantes (seleção)

- `src/domain/character/Traits.js` — factories, validação, serialização e id generation.
- `src/domain/character/TraitsOperations.js` — operações puras sobre coleções de traits.
- `src/domain/character/TraitFields.js` — composição e normalização do record de Trait.
- `src/domain/character/TraitModifiers.js` — formato e validação de modifiers.
- `src/domain/character/TraitModifierCommands.js` — engine de comandos para modifiers.
- `src/domain/character/TraitPointValue.js` — lógica do pointValue e modos de custo.
- `src/domain/character/TraitCostBasisCommands.js` — comandos que alteram a base de custo.
- `src/domain/character/TraitFinalCostAuthority.js` e `TraitCostAuthorityExecutor.js` — análise/execução de autoridade de custo e atualização de `calculatedPoints`.
- `src/application/traits/TraitCommandHandlers.js` — handlers que orquestram operações a partir de comandos externos.
- `src/ui/mobile/CharacterMobileApp.js` — injeção e renderização dos controles de trait na UI mobile.
- testes de roundtrip: `src/infrastructure/persistence/browser/TraitModifierSnapshotRoundtrip.test.js` (garante preservação em export/import).

## Arquitetura e fluxos (resumo)

- Representação: Traits são arrays de records imutáveis (deepFreeze) construídos por `createTrait` / `createTraits`.
- Criação: `createCharacter` reconstitui `traits` chamando `createTraitsFromCharacterInput`, que normaliza formatos legados e gera ids.
- Mutação: operações de domínio são puras e retornam novas coleções (ex.: `addTrait`, `updateTrait`, `removeTrait`).
- Operações internas: mudanças nos subcampos usam appliers/command engines que validam e retornam novos objetos (ex.: modifiers, cost-basis).
- Cálculo: análise de custo e execução (autoridade) ocorrem em módulos separados; o executor atualiza `pointValue.calculatedPoints` e anexa `finalCostAuthority` ao trait.
- Persistência: snapshots via `serializeCharacter` e reconstrução com `createCharacter` — testes garantem roundtrip fiel.

Mermaid (fluxo simplificado):

```mermaid
graph LR
  UI[UI / Mobile] -->|commands| App[Application Handlers]
  App -->|domain ops| Domain[TraitsOperations / Commands]
  Domain -->|new traits| Character[Character (traits array)]
  Character -->|serialize| Persistence[Persistence / Snapshot]
  Domain -->|analyze| CostAnalyzer[Cost Authority Analyzer]
  CostAnalyzer -->|plan| Executor[Cost Authority Executor]
  Executor --> Character
```

## APIs públicas e padrões de uso

- `createTraits(input = [])` / `createTrait(input, explicitRole = null)` — factories canônicas.
- `serializeTraits(traits)` / `serializeTrait(trait)` — obter forma portátil.
- `addTrait(traits, traitInput)`, `updateTrait(traits, traitId, patch)`, `removeTrait(traits, traitId)`, `reorderTrait(traits, traitId, idx)` — operações de container.
- `applyTraitModifierCommands(modifiers, commands)` — aplicar comandos de modifier.
- `applyTraitCostBasisCommands(trait, commands)` — aplicar mudanças de base de custo.
- `executeTraitCostAuthorityPlan(character, plan)` — aplicar plano de custo e atualizar `calculatedPoints`.

Exemplo de uso (padrão):

```js
const nextTraits = addTrait(character.traits, draftTrait);
const updated = updateTrait(nextTraits, traitId, { points: 10 });
// persist: serializeCharacter(characterWithUpdatedTraits)
```

## Problemas observados e riscos

- ID_GEN_NONDETERMINISTIC: geração de ids de trait usa função baseada em random, possível colisão em cenários distribuídos/import.
- UI_HTML_INJECTION_FRAGILE: `injectTraitControls` manipula HTML via slicing de strings — frágil a mudanças de template.
- RAW_MODIFIER_SCHEMA_FLEXIBILITY: modifiers podem ser retornados em formato 'raw' ou canônico, levando a heterogeneidade.
- CLONE_CYCLE_ERRORS: importadores com ciclos em objetos podem falhar na serialização/clonagem.
- LEGACY_COLLECTION_MERGE_SURPRISE: mesclagem de coleções legadas pode substituir coleções canônicas quando entrada mista existe.
- POTENTIAL_PERF_IMMUTABILITY_OVERHEAD: re-serializar e recriar coleções em cada operação pode ter custo em listas grandes ou UI de alta frequência.

## Recomendações

1. Substituir `generateTraitId` por `crypto.randomUUID()` ou um gerador UUID determinístico para reduzir risco de colisões.
2. Refatorar `injectTraitControls` para usar template DOM/templating seguro em vez de slicing de string.
3. Documentar claramente quando modifiers são 'raw' vs canônicos; considerar normalização aplicada na criação se possível.
4. Adicionar testes que cubram combinações mistas de entrada (canonical + legacy) para evitar substituições inesperadas.
5. Medir performance em cenários com muitos traits e avaliar otimizações (batching, diffs, mutação controlada) se for necessário.

## Ações de acompanhamento sugeridas

- Revisar e migrar id generation (baixa complexidade, alto impacto).
- Especificar e padronizar schema dos modifiers (médio esforço).
- Refatorar injeção de UI para DOM-based rendering (médio esforço).
- Criar testes de integração para import/export com objetos circulares/legados e para operações de alta frequência.

## Referências (selecionadas)

- `src/domain/character/Traits.js`
- `src/domain/character/TraitsOperations.js`
- `src/domain/character/TraitFields.js`
- `src/domain/character/TraitModifiers.js`
- `src/domain/character/TraitModifierCommands.js`
- `src/domain/character/TraitPointValue.js`
- `src/domain/character/TraitCostBasisCommands.js`
- `src/domain/character/TraitFinalCostAuthority.js`
- `src/domain/character/TraitCostAuthorityExecutor.js`
- `src/application/traits/TraitCommandHandlers.js`
- `src/ui/mobile/CharacterMobileApp.js`
- `src/infrastructure/persistence/browser/TraitModifierSnapshotRoundtrip.test.js`

---

Relatório gerado automaticamente pelo agente reverse-engineer — revisar trechos de código citados antes de ações de refactor.
