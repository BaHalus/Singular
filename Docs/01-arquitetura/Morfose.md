# Morfose

**Código:** DOM-MORPH-1.3  
**Status:** Aquisição e memorização implementadas  
**Camada:** Domain  
**Tipo:** Perfil, catálogo, resolução, operações e projeção transitória  
**Decisões:** ADR-0020, ADR-0021, ADR-0022 e ADR-0023

Morfose reutiliza integralmente o subsistema de Forma Alternativa. Ela acrescenta catálogo de formas conhecidas, aquisição, observação, memorização, improvisação futura, limites declarados, resolução da vantagem e materialização transitória.

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
        └── AlternateForm materializada
            ├── morphKnownFormId
            └── morphMaterialization
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
    pointLimit: null
  },

  knownForms: [],
  catalogHistory: [],
  notes: "",
  tags: [],
  importMeta: null,
  raw: null
}
```

O schema declara políticas. O motor resolve capacidades e consequências. A UI não calcula.

## Limite em pontos

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

A aplicação mecânica permanece reservada ao DOM-MORPH-1.5.

## Catálogo

```text
unknown
knownOnly
open
```

`knownForms` é a única autoridade persistente do repertório. Não existe um segundo catálogo.

## Memorização

Modes:

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

Campos:

```js
{
  mode,
  capacity,
  capacityBasis,
  durationSeconds
}
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

Os modificadores são reconhecidos pelo resolver existente. As operações consomem seus IDs reconhecidos e não criam outro resolver textual.

## Improvisação

```text
unknown
forbidden
allowed
conditional
```

DOM-MORPH-1.4 tratará composição e improvisação. O `pointLimit` de improvisação é independente do limite geral.

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

API:

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

Quando os espaços estão cheios, a operação fica pendente até receber uma forma anterior explícita:

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

O fingerprint inclui forma ativa, catálogo conhecido, política declarada e modificadores reconhecidos. Qualquer mudança relevante entre planejamento e execução torna o plano obsoleto.

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

Cada entrada preserva personagem, conjunto, forma, template, instante, método de aquisição, estados, substituição e dados contextuais.

## Recomposição do perfil

Aquisições e histórico são sincronizados no `baseProfile` persistido da resolução. Uma nova recomposição pode remover contribuições de modificadores desabilitados sem apagar formas adquiridas após a resolução anterior.

## Materialização de forma conhecida

```js
analyzeMorphKnownFormMaterialization(character, setId, knownFormId)
materializeMorphKnownForm(character, setId, knownFormId, options)
```

Pré-condições:

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
entrada conhecida
→ materialização ou reutilização
→ FormTransitionPlanner
→ FormTransitionExecutor
→ runtime e histórico de transição existentes
```

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
- fingerprints, proveniência e runtime.

Invariantes:

- IDs de catálogo são únicos;
- um `templateId` resolvido não se repete no mesmo catálogo;
- template resolvido aponta para `Character.templates`;
- histórico pertence ao personagem e ao conjunto corretos;
- uma entrada possui no máximo uma materialização por conjunto;
- a forma-base não pode ser uma forma conhecida materializada;
- uma forma ativa não pode ser esquecida ou substituída.

## Próximos blocos

```text
DOM-MORPH-1.4 — improvisação
DOM-MORPH-1.5 — limites e fechamento
```

## Não responsabilidades

DOM-MORPH-1.3 não:

- improvisa ou compõe modelos;
- aplica limite de pontos;
- calcula custo da vantagem;
- duplica o planner, executor, runtime ou histórico de transição;
- liga referência externa por nome;
- apaga proveniência;
- atualiza silenciosamente uma forma ativa.
