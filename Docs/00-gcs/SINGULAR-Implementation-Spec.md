# SINGULAR — especificação técnica de implementação derivada da arquitetura GCS

**Status:** especificação consolidada para implementação  
**Escopo:** domínio, cálculo, dependências, modificadores, persistência e importação  
**Base factual GCS:** `Docs/00-gcs/GCS-Architecture-Synthesis.md` e documentação técnica consolidada nesta pasta  
**Fonte SINGULAR:** contratos arquiteturais vigentes em `Docs/01-arquitetura/` e código de domínio existente  

> **Regra de evidência**
>
> **FATO GCS** significa comportamento confirmado na implementação/documentação pública analisada do GCS.  
> **DECISÃO SINGULAR** significa escolha arquitetural da SINGULAR.  
> **ESPECIFICAÇÃO** significa contrato que deve orientar a implementação da SINGULAR; não é apresentado como comportamento do GCS.

---

## 1. Objetivo

Transformar o conhecimento arquitetural confirmado do GCS em contratos implementáveis na SINGULAR sem copiar a arquitetura interna do GCS.

A especificação preserva as semânticas relevantes do domínio GURPS, mas mantém a fronteira arquitetural definida pela SINGULAR: `Character` é o Aggregate Root; regras são resolvidas por motor/serviços de domínio; a UI consome resultados calculados; persistência não deve esconder recálculo.

---

## 2. Fronteiras arquiteturais

```text
                 ┌──────────────────────────────┐
                 │          UI / UX              │
                 │ edição · consulta · comandos │
                 └──────────────┬───────────────┘
                                │ comandos / snapshots
                 ┌──────────────▼───────────────┐
                 │       Application Layer       │
                 │ load · edit · calculate · save│
                 └──────────────┬───────────────┘
                                │
                 ┌──────────────▼───────────────┐
                 │        Domain / Motor         │
                 │ Character + regras GURPS      │
                 │ dependências · modifiers      │
                 │ features · prerequisites      │
                 └──────────────┬───────────────┘
                                │ estado canônico
                 ┌──────────────▼───────────────┐
                 │      Persistence / Import      │
                 │ JSON · GCS importer · library  │
                 └──────────────────────────────┘
```

### 2.1 DECISÃO SINGULAR — Character

`Character` é o Aggregate Root e unidade fundamental de persistência, serialização e manipulação. Mantém estrutura e invariantes, mas não executa regras GURPS. Esta decisão está formalizada em `Docs/01-arquitetura/Character.md`.

### 2.2 DECISÃO SINGULAR — cálculo fora do Aggregate Root

O motor de cálculo recebe estado canônico e produz resultado derivado. O cálculo não deve ser implementado como uma cópia de `Entity.Recalculate()` dentro de `Character`.

### 2.3 DECISÃO SINGULAR — UI sem regra de domínio

A UI emite comandos e consome snapshots/resultados do motor. Não deve reproduzir cálculo de custo, nível, dependências ou propagação de Features.

---

## 3. Contratos de domínio

### 3.1 Character

```ts
interface Character {
  identity: Identity;
  attributes: Attributes;
  secondaryCharacteristics: SecondaryCharacteristics;
  pools: Pools;
  state: CharacterState;
  advantages: Advantage[];
  perks: Perk[];
  disadvantages: Disadvantage[];
  quirks: Quirk[];
  skills: Skill[];
  techniques: Technique[];
  spells: Spell[];
  powers: Power[];
  equipment: Equipment[];
  attacks: Attack[];
  languages: Language[];
  familiarities: Familiarity[];
  templates: Template[];
  templateApplications: TemplateApplication[];
  alternateFormSets: AlternateFormSet[];
  formTransitionHistory: FormTransitionEvent[];
  metadata: CharacterMetadata;
}
```

**DECISÃO SINGULAR.** A forma exata dos tipos pode evoluir sem alterar a responsabilidade do Aggregate Root: armazenar estado canônico/invariantes, não executar cálculo.

### 3.2 CalculationInput

```ts
interface CalculationInput {
  character: Character;
  ruleset: Ruleset;
  options?: CalculationOptions;
}
```

**ESPECIFICAÇÃO.** A entrada do cálculo deve ser suficiente para produzir o resultado sem consultar a UI.

### 3.3 CalculationSnapshot

```ts
interface CalculationSnapshot {
  attributes: CalculatedAttributes;
  secondaryCharacteristics: CalculatedSecondaries;
  traitResults: TraitResult[];
  skillResults: SkillResult[];
  spellResults: SpellResult[];
  equipmentResults: EquipmentResult[];
  features: FeatureResult[];
  prerequisites: PrerequisiteResult[];
  diagnostics: CalculationDiagnostic[];
  convergence: ConvergenceResult;
}
```

**DECISÃO SINGULAR.** Resultados derivados devem ser explícitos e consumíveis pela UI. Não devem virar estado canônico simplesmente porque foram calculados.

### 3.4 Feature

```ts
interface Feature {
  kind: FeatureKind;
  source: FeatureSource;
  payload: unknown;
  enabled: boolean;
}
```

**FATO GCS.** O GCS possui uma coleção interna de Features e despacha tipos concretos de bônus, reduções, overrides e efeitos relacionados a armas/DR. Features podem ser fornecidas por Traits, TraitModifiers, Skills e Equipment.

**DECISÃO SINGULAR.** O conceito de Feature deve ser modelado como mecanismo GURPS específico, com tipos concretos e consumidores conhecidos; não como uma abstração genérica `Effect` de RPG.

### 3.5 Prerequisite

```ts
interface PrerequisiteEvaluator {
  evaluate(
    prerequisite: Prerequisite,
    context: EvaluationContext
  ): PrerequisiteResult;
}
```

**FATO GCS.** Prerequisites participam do recálculo de Traits, Skills, Spells e Equipment. Em Skills/Spells, determinados prerequisites podem produzir penalidades dinâmicas de equipamento.

**DECISÃO SINGULAR.** Avaliação de prerequisite deve ser pura e observável: entrada, resultado e diagnóstico. Efeitos derivados devem retornar ao pipeline de cálculo, não mutar silenciosamente o Character.

---

## 4. Contratos de modificadores

### 4.1 TraitModifier

```ts
interface TraitModifier {
  id: string;
  name: string;
  disabled: boolean;
  levels: number;
  costAdj?: string;
  affects?: string[];
  features: Feature[];
  children?: TraitModifier[];
  source?: LibrarySource;
}
```

**FATO GCS.** `TraitModifier` é nó próprio, pode ser container, pode possuir filhos, Features, `CostAdj`, níveis, habilitação, `Affects`, tags/origem e pode usar nível do Trait proprietário. Containers são tratados de maneira diferente de modificadores não-container quanto à habilitação.

**DECISÃO SINGULAR.** O contrato deve preservar semântica de TraitModifier e sua árvore; não deve colapsá-lo em um modificador genérico.

### 4.2 EquipmentModifier

```ts
interface EquipmentModifier {
  id: string;
  name: string;
  disabled: boolean;
  levels: number;
  costAdjustment?: unknown;
  weightAdjustment?: unknown;
  features: Feature[];
  children?: EquipmentModifier[];
  source?: LibrarySource;
}
```

**FATO GCS.** O Master Library documenta Equipment Modifiers com ajustes de custo/peso, habilitação, níveis, Features, estágios de ajuste e proveniência.

**DECISÃO SINGULAR.** O cálculo de EquipmentModifier deve ser separado do cálculo de TraitModifier mesmo quando compartilham infraestrutura técnica.

### 4.3 Ordem de aplicação

**FATO GCS.** O GCS possui estágios distintos de cálculo de Features e pricing; a documentação especializada não autoriza transformar todos os divisores/multiplicadores em uma única fase.

**DECISÃO SINGULAR.** A ordem semântica de modificadores deve ser um contrato do domínio e possuir testes de regressão. A implementação deve distinguir, quando aplicável:

```text
1. ajustes aditivos do próprio Trait
2. multiplicadores/divisores do próprio Trait
3. modificadores percentuais
4. divisores estruturais do custo
```

A última etapa inclui mecanismos como Alternative Abilities e outros divisores estruturais definidos pelo domínio. Nenhum estágio deve ser fundido apenas por conveniência de implementação.

---

## 5. Dependências e resolução

### 5.1 Grafo

**FATO GCS.** Skills e Spells dependem de defaults, Features e Prerequisites; o recálculo pode precisar de múltiplas passagens porque alterações em uma parte podem alterar outra.

**DECISÃO SINGULAR.** Dependências devem ser explicitáveis e diagnosticáveis.

```ts
interface DependencyNode {
  id: string;
  kind: DependencyKind;
}

interface DependencyEdge {
  from: string;
  to: string;
  reason: string;
}

interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}
```

### 5.2 Resolução

```ts
interface DependencyResolver {
  build(input: CalculationInput): DependencyGraph;
  resolve(graph: DependencyGraph): ResolutionResult;
}
```

**DECISÃO SINGULAR.** Ciclos devem gerar estado de resolução explícito. O motor não deve esconder não-convergência atrás de um limite silencioso.

### 5.3 Convergência

**FATO GCS.** `Entity.Recalculate()` repete processamento de Features/Prerequisites/Skills/Spells até não haver mudanças ou até cinco passagens.

**DECISÃO SINGULAR.** O motor deve declarar uma política de convergência e produzir diagnóstico quando não convergir. O limite de cinco passagens é um comportamento do GCS, não um requisito da SINGULAR.

---

## 6. Fluxos de aplicação

### 6.1 Carregar personagem

```text
Load request
  → Persistence.load()
  → parse/deserialize
  → validate canonical Character
  → calculate(Character)
  → return Character + CalculationSnapshot
```

**FATO GCS.** Load/Unmarshal da Entity termina com recálculo/normalização observados.

**DECISÃO SINGULAR.** O recálculo após load é uma etapa explícita da aplicação, não efeito colateral do serializer.

### 6.2 Editar

```text
UI command
  → Application command handler
  → immutable Character update / domain operation
  → validate
  → calculate
  → publish snapshot
```

A UI não calcula.

### 6.3 Salvar

```text
current Character
  → validate
  → Persistence.save(canonical state)
```

**FATO GCS.** `Save`/`MarshalJSONTo` pode chamar `Recalculate()` antes da persistência.

**DECISÃO SINGULAR.** O serializer não deve ser responsável por disparar o motor. Se a aplicação exige estado derivado atualizado antes de salvar, ela deve executar `calculate` explicitamente.

### 6.4 Importar GCS

```text
GCS payload
  → preserve raw payload/provenance
  → parse
  → map GCS concepts to SINGULAR concepts
  → validate
  → normalize only where contract permits
  → calculate
  → expose diagnostics
```

**DECISÃO SINGULAR.** O importer deve preservar dados brutos relevantes antes de normalização e nunca transferir conhecimento do formato GCS para a UI.

---

## 7. Casos de uso

### UC-01 — Calcular personagem

**Entrada:** `Character`, `Ruleset`, opções.  
**Saída:** `CalculationSnapshot`.  
**Pré-condição:** Character estruturalmente válido.  
**Pós-condição:** nenhum estado canônico alterado.

Fluxo:

1. validar entrada;
2. construir contexto;
3. coletar Features;
4. resolver Prerequisites;
5. resolver dependências de Skills/Spells;
6. calcular secundárias e resultados de Traits/Equipment;
7. verificar convergência;
8. retornar snapshot e diagnósticos.

### UC-02 — Editar Trait

1. receber comando de alteração;
2. produzir novo Character;
3. validar invariantes;
4. calcular snapshot;
5. apresentar resultado.

O cálculo não pertence ao comando de persistência.

### UC-03 — Aplicar TraitModifier

1. localizar Trait;
2. validar Modifier e árvore;
3. aplicar alteração ao estado canônico;
4. recalcular Features/pricing/dependências;
5. retornar snapshot e diagnósticos.

### UC-04 — Equipar item

1. localizar Equipment;
2. alterar estado canônico de equipamento;
3. recalcular Features e consequências de carga;
4. recalcular dependências afetadas;
5. retornar snapshot.

**FATO GCS.** Equipment realmente equipado participa da coleta de Features.

### UC-05 — Persistir

1. validar Character;
2. persistir somente estado definido pelo contrato;
3. não executar regras implícitas no serializer;
4. registrar erro de persistência sem alterar o Character em memória.

---

## 8. Interfaces de aplicação

```ts
interface CharacterRepository {
  load(id: string): Promise<Character>;
  save(character: Character): Promise<void>;
}

interface CharacterCalculator {
  calculate(input: CalculationInput): CalculationSnapshot;
}

interface CharacterApplicationService {
  load(id: string): Promise<CalculatedCharacter>;
  execute(command: CharacterCommand): Promise<CalculatedCharacter>;
  save(character: Character): Promise<void>;
}

interface CalculatedCharacter {
  character: Character;
  snapshot: CalculationSnapshot;
}
```

**DECISÃO SINGULAR.** `CharacterRepository` não calcula. `CharacterCalculator` não persiste. `UI` não implementa nenhum dos dois contratos.

---

## 9. Persistência

### 9.1 Estado persistível

**DECISÃO SINGULAR.** Persistir estado canônico e estado transitório explicitamente definido pelo contrato de `Character`. Resultados de cálculo não são automaticamente canônicos.

### 9.2 Dados calculados

**FATO GCS.** A Entity possui dados calculados/runtime e inclui um bloco `calc` na serialização, após recálculo.

**DECISÃO SINGULAR.** SINGULAR deve tratar snapshots de cálculo como derivados. Se algum resultado for cacheado para performance, deve existir política explícita de invalidação e reconstrução; não deve haver dependência semântica do cache.

---

## 10. Organização dos subsistemas

### 10.1 GCS — fato observado

```text
model/gurps
├── Entity
├── Attributes
├── Traits / TraitModifiers
├── Skills / SkillDefaults / Techniques
├── Spells
├── Equipment / EquipmentModifiers / Weapons
├── Features / Bonuses / Overrides
├── Prerequisites
├── Templates
└── serialization/import helpers

ux
└── editors / tables / navigation / actions
```

### 10.2 SINGULAR — decisão

```text
src/domain
├── character
├── rules
├── calculation
├── dependencies
├── import
└── persistence contracts

src/application
└── commands / use cases / orchestration

src/ui
└── presentation / editors / views
```

**DECISÃO SINGULAR.** O domínio permanece GURPS-específico. Não criar um engine RPG genérico com abstrações como `Resource`, `Ability` ou `Statistic` apenas para uniformizar conceitos que possuem semânticas diferentes em GURPS.

---

## 11. ADRs consolidados

### ADR-SG-001 — Character como Aggregate Root

**Contexto:** GCS centraliza estado em `Entity`.  
**Decisão:** SINGULAR usa `Character` como Aggregate Root.  
**Consequência:** toda alteração estrutural passa pelo contrato de Character; cálculo permanece externo.

### ADR-SG-002 — Motor de cálculo separado

**Contexto:** GCS concentra `Recalculate()` em Entity.  
**Decisão:** SINGULAR separa estado canônico e cálculo.  
**Consequência:** cálculo é testável, substituível e consumível por UI/aplicação sem mutar o Aggregate Root.

### ADR-SG-003 — Dependências explícitas

**Contexto:** GCS precisa de múltiplas passagens.  
**Decisão:** SINGULAR explicita grafo, resolução e diagnóstico.  
**Consequência:** ciclos deixam de ser comportamento implícito.

### ADR-SG-004 — Modificadores GURPS-específicos

**Contexto:** GCS possui TraitModifier e EquipmentModifier com semânticas próprias.  
**Decisão:** SINGULAR preserva esses conceitos.  
**Consequência:** compartilhamento técnico não deve apagar diferenças semânticas.

### ADR-SG-005 — Persistência sem cálculo implícito

**Contexto:** GCS recalcula durante Save/Marshal.  
**Decisão:** SINGULAR explicita `load → validate → calculate` e `edit → calculate → save`.  
**Consequência:** serializer permanece determinístico e sem efeitos de domínio ocultos.

### ADR-SG-006 — Proveniência no importer

**Contexto:** Master Library possui conteúdo por fonte/produto e artefatos com proveniência.  
**Decisão:** importer preserva origem, IDs externos e payload bruto relevante.  
**Consequência:** conversão GCS→SINGULAR permanece auditável e reversível onde o contrato permitir.

---

## 12. Regras de implementação

1. Não mover regra de GURPS para a UI.
2. Não colocar cálculo em `Character` apenas porque o GCS o coloca em `Entity`.
3. Não usar serializer como gatilho oculto de cálculo.
4. Não transformar TraitModifier e EquipmentModifier em um único objeto semântico.
5. Não fundir estágios de cálculo de custo/modificadores.
6. Não esconder ciclos de dependência atrás de um limite fixo sem diagnóstico.
7. Não descartar payload bruto/proveniência durante importação antes de preservar o que o contrato exige.
8. Não inferir comportamento GCS a partir de nomes de arquivos ou extensões isoladamente.
9. Toda afirmação sobre compatibilidade GCS deve apontar para evidência observada.
10. Toda divergência em relação ao GCS deve ser registrada como **DECISÃO SINGULAR**, não como “correção” do GCS.

---

## 13. Critérios de aceite técnico

### Domínio

- [ ] Character permanece livre de cálculo GURPS.
- [ ] Invariantes estruturais são verificáveis sem executar o motor.
- [ ] TraitModifier e EquipmentModifier possuem contratos distintos.

### Motor

- [ ] CalculationInput é suficiente para cálculo determinístico.
- [ ] CalculationSnapshot contém resultados derivados necessários à UI.
- [ ] Features e Prerequisites têm origem e diagnóstico.
- [ ] Dependências podem ser inspecionadas.
- [ ] Não-convergência é diagnosticável.

### Aplicação

- [ ] Load, edit, calculate e save são casos de uso explícitos.
- [ ] Repository não calcula.
- [ ] Calculator não persiste.

### Importação

- [ ] Payload bruto/proveniência são preservados conforme contrato.
- [ ] GCS não vaza para a UI.
- [ ] Diagnósticos de conversão são persistíveis/auditáveis quando necessário.

### Persistência

- [ ] Serializer não dispara regra de domínio.
- [ ] Estado canônico e derivado são distinguíveis.
- [ ] Reload reproduz o mesmo estado canônico.

---

## 14. Limites de evidência

Esta especificação não transforma lacunas do GCS em requisitos. Em particular:

- a gramática completa de `CostAdj` não é considerada fechada apenas por sua presença no modelo;
- detalhes internos de `ExtractFraction()` não são assumidos sem evidência direta;
- extensões de biblioteca não são interpretadas como contratos de parser sem implementação/documentação correspondente;
- comportamento de UX do GCS não é tratado como regra de domínio;
- decisões da SINGULAR não são apresentadas como comportamento do GCS.

A fonte factual consolidada para o GCS permanece `Docs/00-gcs/GCS-Architecture-Synthesis.md`; esta especificação transforma esses fatos em contratos de implementação da SINGULAR.
