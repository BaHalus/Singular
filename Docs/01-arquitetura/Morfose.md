# Morfose

**Código:** DOM-MORPH-1.5  
**Status:** Implementado  
**Camada:** Domain  
**Tipo:** Perfil, catálogo, resolução, aquisição, improvisação, limite e projeção transitória  
**Decisões:** ADR-0020, ADR-0021, ADR-0022, ADR-0023, ADR-0025 e ADR-0027

Morfose reutiliza integralmente o subsistema de Forma Alternativa. Ela acrescenta resolução da vantagem, catálogo de formas conhecidas, observação, memorização, improvisação, limites declarados e materialização transitória.

O princípio permanece:

```text
O motor calcula.
O schema declara.
A UI apresenta e coleta entrada.
```

## Terminologia

```text
nome visível: Morfose
identificador técnico: morph
```

`Metamorfose` permanece uma entrada distinta.

## Estrutura no agregado

```text
Character
└── AlternateFormSet [mechanism: "morph"]
    ├── sourceTraitId
    ├── morphProfile
    │   ├── políticas declarativas
    │   ├── knownForms
    │   └── catalogHistory
    ├── morphProfileOverride
    ├── morphProfileResolution
    └── forms
        ├── AlternateForm materializada
        │   ├── morphKnownFormId
        │   └── morphMaterialization
        └── AlternateForm improvisada
            └── morphImprovisation
```

Conjuntos `alternateForm` mantêm dados exclusivos de Morfose como nulos.

## Perfil

```js
{
  pointLimitMode: "undeclared",
  pointLimit: null,
  pointLimitSource: "undeclared",

  catalog: {
    mode: "unknown",
    capacity: null
  },

  memorization: {
    mode: "unknown",
    capacity: null,
    capacityBasis: "unknown",
    durationSeconds: null
  },

  improvisation: {
    mode: "unknown",
    pointLimit: null,
    traitScope: "unknown",
    availabilityScope: "unknown",
    compositionScope: "unknown"
  },

  knownForms: [],
  catalogHistory: [],
  notes: "",
  tags: [],
  importMeta: null,
  raw: null
}
```

O schema declara políticas. O motor resolve capacidades e consequências.

## Resolução da vantagem

A resolução possui precedência:

```text
perfil-base
→ valor importado
→ builtin
→ campanha
→ explícito
→ manual
```

O vínculo usa `sourceTraitId` quando válido. Sem vínculo explícito, só existe associação automática quando há exatamente uma vantagem chamada Morfose.

Modificadores reconhecidos incluem:

```text
Ilimitada
Formas Improvisadas
Cósmica (Para Formas Improvisadas)
Não Exige Memorização
Incapaz de Memorizar Formas
Cosmética
Mantém a Forma
Conservação da Massa
Mudança Ativa
Imperfeita
Somente Formas Não-Vivas
```

Modificadores não resolvidos são preservados como evidência. Nenhuma regra é inferida apenas por semelhança textual fora do vocabulário reconhecido.

## Limite em pontos

Modos:

```text
undeclared
limited
unlimited
```

Fontes:

```text
undeclared
manual
imported
modifier
campaign
```

`pointLimit` representa o teto efetivo já resolvido do valor do template racial. Importadores, regras de campanha e overrides convertem suas representações de origem para esse teto.

A autoridade mecânica única é:

```text
MorphPointLimit
```

Avaliação:

```js
evaluateMorphPointLimit(profile, templateImportedPoints, {
  targetKind: "known" | "improvised"
})
```

Estados:

```text
ready   → limites conhecidos e satisfeitos
pending → falta teto ou valor necessário
blocked → teto conhecido excedido
```

Razões bloqueantes:

```text
morph-point-limit-exceeded
morph-improvisation-point-limit-exceeded
```

Razões pendentes:

```text
morph-point-limit-undeclared
morph-template-points-unknown
```

A igualdade com o teto é válida. Valores negativos de templates são comparados normalmente.

Para improvisações, quando existem dois tetos finitos:

```text
effectivePointLimit = min(generalPointLimit, improvisationPointLimit)
```

`undeclared` não equivale a `unlimited`. A avaliação permanece incompleta e não declara que o limite foi cumprido.

Detalhes: `MorfosePointLimit.md` e `ADR-0027-MorfosePointLimit.md`.

## Catálogo

```text
unknown
knownOnly
open
```

`knownForms` é a única autoridade persistente do repertório. Não existe um segundo catálogo.

## Memorização

Modos:

```text
unknown
none
permanent
limited
```

Bases de capacidade:

```text
unknown
fixed
iq
unlimited
notApplicable
```

Para Morfose padrão, a política efetiva é:

```text
mode: limited
capacityBasis: iq
durationSeconds: 60
```

A capacidade por IQ é calculada pelo motor a partir do atributo efetivo.

Modificadores:

```text
Não Exige Memorização
→ retenção automática
→ capacidade ilimitada
→ duração 0

Incapaz de Memorizar Formas
→ retenção proibida
→ original sempre necessário
→ capacidade não aplicável
```

## Improvisação

```text
unknown
forbidden
allowed
conditional
```

Eixos:

```text
traitScope
availabilityScope
compositionScope
pointLimit
```

Política-base de Formas Improvisadas:

```js
{
  mode: "allowed",
  traitScope: "physicalNatural",
  availabilityScope: "settingOnly",
  compositionScope: "sameComposition"
}
```

Cósmica remove apenas a exigência de existência no cenário. Ilimitada remove a restrição de composição e o teto geral, mas não substitui Formas Improvisadas nem apaga um teto específico.

A projeção improvisada é transitória: não entra em `Character.templates`, não entra em `knownForms` e não é ativada automaticamente.

Detalhes: `MorfoseImprovisation.md` e `ADR-0025-MorfoseImprovisation.md`.

## Forma conhecida

```js
{
  id,
  templateId,
  externalIds,
  name,
  acquisitionMethod,
  acquiredAt,
  memorizedAt,
  lastObservedAt,
  state,
  notes,
  tags,
  importMeta,
  raw
}
```

Métodos:

```text
unknown
manual
imported
memorized
observed
```

Estados:

```text
available
unavailable
forgotten
```

Uma forma esquecida permanece registrada. Referências externas não resolvidas permanecem com `templateId: null`. Nenhum template é inferido por nome.

## Aquisição e observação

A observação e a memorização são eventos distintos.

```text
ver ou tocar o original
→ permite copiar no momento

concentrar por 60 segundos
→ conserva a forma no repertório padrão
```

Uma observação transitória pode gerar histórico sem acrescentar entrada a `knownForms`.

Operações administrativas manuais e importadas podem registrar uma forma diretamente, mas não são confundidas com o procedimento em jogo.

## Fluxo operacional

```text
análise
→ plano efêmero
→ revalidação
→ execução explícita e atômica
→ recibo persistente
```

APIs de catálogo:

```js
analyzeMorphCatalogOperation(character, setId, input, options)
planMorphCatalogOperation(character, setId, input, options)
executeMorphCatalogPlan(character, plan, options)

observeMorphForm(character, setId, input, options)
memorizeMorphForm(character, setId, input, options)
replaceMorphMemorizedForm(character, setId, replacedId, input, options)

registerMorphKnownForm(character, setId, input, options)
forgetMorphKnownForm(character, setId, knownFormId, options)
restoreMorphKnownForm(character, setId, knownFormId, options)
setMorphKnownFormAvailability(character, setId, knownFormId, available, options)
setMorphPointLimit(character, setId, value, source, options)
```

Status:

```text
ready
pending
blocked
no-op
```

Falha, pendência e bloqueio não alteram o `Character` original.

## Capacidade e substituição

Capacidade desconhecida permanece desconhecida.

Quando os espaços estão cheios, a operação fica pendente até receber:

```js
{
  replacementKnownFormId
}
```

A substituição:

1. revalida catálogo e política;
2. impede a substituição da forma ativa;
3. marca a forma anterior como `forgotten`;
4. acrescenta a nova forma;
5. grava um único evento `form-replaced`.

Nenhuma forma é escolhida automaticamente ou apagada.

## Planos obsoletos

Fingerprints incluem forma ativa, catálogo conhecido, políticas declaradas, modificadores reconhecidos e avaliações mecânicas relevantes.

Qualquer mudança entre planejamento e execução torna o plano obsoleto ou produz um novo status na revalidação.

## Histórico do catálogo

`catalogHistory` é append-only, mas não é event sourcing. O estado vigente continua em `knownForms`.

Eventos:

```text
form-acquired
form-observed
form-memorized
form-forgotten
form-restored
form-availability-changed
form-replaced
```

## Materialização de forma conhecida

```js
analyzeMorphKnownFormMaterialization(character, setId, knownFormId)
materializeMorphKnownForm(character, setId, knownFormId, options)
```

Pré-condições estruturais:

- entrada existente;
- estado `available`;
- `templateId` resolvido;
- template presente em `Character.templates`.

A materialização projeta a entrada em `AlternateFormSet.forms`. Ela não ativa a forma nem incorpora o template permanentemente.

Proveniência:

```js
{
  knownFormId,
  templateId,
  templateFingerprint,
  materializedAt,
  sourceName,
  acquisitionMethod,
  externalIds
}
```

Materialização é idempotente. Template alterado exige `refresh: true`. Uma materialização ativa não pode ser atualizada.

## Transição

```text
entrada conhecida ou improvisada
→ materialização ou reutilização
→ avaliação de limite
→ FormTransitionPlanner
→ FormTransitionExecutor
→ runtime e histórico existentes
```

O planner é a fronteira mecânica de ativação. Uma projeção inativa pode existir acima do teto, mas não recebe plano executável.

O executor de Forma Alternativa continua sendo o único responsável por ativar uma forma.

## Validação e serialização

Sobrevivem ao save/load:

- perfil-base e resolvido;
- vínculo da vantagem;
- override, decisões e diagnósticos;
- catálogo e histórico;
- referências externas e `raw`;
- instantes de observação e memorização;
- formas materializadas;
- improvisações transitórias persistíveis;
- fingerprints, proveniência e runtime.

Invariantes:

- IDs de catálogo são únicos;
- um `templateId` resolvido não se repete no mesmo catálogo;
- template resolvido aponta para `Character.templates`;
- histórico pertence ao personagem e ao conjunto corretos;
- uma entrada possui no máximo uma materialização por conjunto;
- a forma-base não pode ser forma conhecida materializada nem improvisação;
- uma forma ativa não pode ser esquecida, substituída, atualizada ou descartada;
- limites finitos exigem valores não negativos;
- a UI não calcula o teto nem a diferença.

## Estado dos blocos

```text
DOM-MORPH-1.0 — fundação
DOM-MORPH-1.1 — resolução da vantagem
DOM-MORPH-1.2 — seleção e materialização
DOM-MORPH-1.3 — aquisição e memorização
DOM-MORPH-1.3.1 — identidade, idempotência e capacidade
DOM-MORPH-1.4 — improvisação
DOM-MORPH-1.5 — limites e fechamento
```

Todos os blocos acima estão implementados no domínio.

## Não responsabilidades

Morfose não:

- calcula regras na UI;
- duplica planner, executor, runtime ou histórico de Forma Alternativa;
- liga referências externas por nome;
- apaga proveniência;
- atualiza silenciosamente uma forma ativa;
- incorpora templates durante materialização;
- recalcula `Template.importedPoints` somando componentes;
- deriva raça nativa por nome;
- calcula o preço final da vantagem fora do resolver apropriado.
