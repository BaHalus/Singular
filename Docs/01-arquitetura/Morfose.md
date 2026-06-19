# Morfose

**Código:** DOM-MORPH-1.2  
**Status:** Seleção e materialização de forma conhecida implementadas  
**Camada:** Domain  
**Tipo:** Perfil, catálogo, resolução e projeção transitória  
**Decisões:** ADR-0020, ADR-0021 e ADR-0022

Morfose reutiliza integralmente o subsistema de formas temporárias e acrescenta catálogo, aquisição, memorização, improvisação, limites declarados, resolução da vantagem e materialização de formas conhecidas.

## Terminologia

Nome visível em português:

```text
Morfose
```

Identificador técnico:

```text
morph
```

`Metamorfose` permanece uma entrada distinta.

## Estrutura no agregado

```text
AlternateFormSet
└── mechanism: "morph"
    ├── sourceTraitId
    ├── morphProfile
    ├── morphProfileOverride
    ├── morphProfileResolution
    └── forms
        └── AlternateForm materializada
            ├── morphKnownFormId
            └── morphMaterialization
```

Conjuntos de Forma Alternativa mantêm os campos exclusivos de Morfose como nulos.

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
    capacity: null
  },

  improvisation: {
    mode: "unknown",
    pointLimit: null
  },

  knownForms: [],
  notes: "",
  tags: [],
  importMeta: null,
  raw: null
}
```

## Limite declarado

Modes:

```text
undeclared
limited
unlimited
```

Exemplo limitado:

```js
{
  pointLimitMode: "limited",
  pointLimit: 80,
  pointLimitSource: "campaign"
}
```

Exemplo ilimitado:

```js
{
  pointLimitMode: "unlimited",
  pointLimit: null,
  pointLimitSource: "modifier"
}
```

Fontes:

```text
undeclared
manual
imported
modifier
campaign
```

O perfil registra valor, modo e proveniência. Não calcula o limite.

A aplicação mecânica do limite permanece reservada ao DOM-MORPH-1.5.

## Catálogo

Modes:

```text
unknown
knownOnly
open
```

`unknown` significa política ainda não resolvida.

`knownOnly` exige seleção do catálogo conhecido.

`open` declara que o catálogo não é a única fonte, sem autorizar improvisação irrestrita por si só.

## Memorização

Modes:

```text
unknown
none
permanent
limited
```

`capacity` é declarativa e não é derivada localmente.

## Improvisação

Modes:

```text
unknown
forbidden
allowed
conditional
```

`pointLimit` de improvisação é independente do limite geral.

## Forma conhecida

```js
{
  id,
  templateId,
  externalIds,
  name,
  acquisitionMethod,
  acquiredAt,
  state,
  notes,
  tags,
  importMeta,
  raw
}
```

Métodos de aquisição:

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

Uma forma esquecida permanece registrada para preservar proveniência.

## Referências resolvidas e não resolvidas

Forma resolvida:

```js
{
  templateId: "template-wolf"
}
```

Forma importada ainda não vinculada:

```js
{
  templateId: null,
  externalIds: {
    gcs: "external-form-001"
  }
}
```

Nenhum template é inferido por semelhança de nome.

## Resolução da vantagem

```js
analyzeMorphProfile(character, setId, options)
resolveMorphProfile(character, setId, options)
applyResolvedMorphProfile(character, setId, options)
applyResolvedMorphProfiles(character, options)
```

O resolver:

1. usa `sourceTraitId` explícito válido;
2. aceita vínculo automático apenas com uma única vantagem Morfose;
3. preserva ambiguidades sem escolha arbitrária;
4. coleta modifiers, features e dados explícitos;
5. ignora mecanicamente evidências desabilitadas;
6. preserva modifiers desconhecidos;
7. aplica precedência explicável;
8. persiste decisões e diagnósticos;
9. recompõe o perfil a partir do perfil-base.

## Precedência

```text
perfil-base
→ valor importado
→ builtin
→ campanha
→ explícito
→ manual
```

Conflitos de mesma prioridade são diagnosticados, não sobrescritos silenciosamente.

## Modificadores reconhecidos

Com efeito direto já declarado:

```text
Ilimitada
Formas Improvisadas
Cósmica (Para Formas Improvisadas)
Não Exige Memorização
Incapaz de Memorizar Formas
```

Reconhecidos como evidência, sem inventar consequências ainda não modeladas:

```text
Cosmética
Mantém a Forma
Conservação da Massa
Mudança Ativa
Imperfeita
Somente Formas Não-Vivas
```

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

A materialização cria uma projeção transitória em `AlternateFormSet.forms`:

```js
{
  id: "morph:<setId>:<knownFormId>",
  name,
  templateId,
  sourceTraitId,
  morphKnownFormId,
  morphMaterialization,
  runtimeState
}
```

Ela não incorpora o template permanentemente e não ativa a forma.

## Proveniência

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

Esses dados sobrevivem à serialização.

## Idempotência e atualização

Materializar novamente sem alterações reutiliza a forma existente.

Quando o template muda, a materialização fica obsoleta e precisa de atualização explícita:

```js
{
  refresh: true
}
```

Uma forma materializada ativa não pode ser atualizada no meio da sessão.

## Preparação da transição

```js
prepareMorphKnownFormTransition(
  character,
  setId,
  knownFormId,
  context,
  options
)
```

Fluxo:

```text
entrada conhecida
→ materialização ou reutilização
→ planFormTransition
→ plano retornado ao chamador
```

A operação não executa a transformação.

## Planner

O plano inclui:

```js
{
  targetTemplateId,
  morphSelection: {
    knownFormId,
    knownFormState,
    templateId,
    templateImportedPoints,
    materialization,
    status,
    reasons,
    pointLimitEvaluation
  }
}
```

A seleção participa do fingerprint do plano.

O planner bloqueia quando a forma conhecida:

- está indisponível;
- foi esquecida;
- perdeu o template;
- possui materialização inconsistente;
- possui materialização obsoleta.

## Executor

A execução continua usando `FormTransitionExecutor`.

Ele revalida:

- catálogo;
- estado da entrada;
- template;
- fingerprint da materialização;
- regras e recursos da transição.

O recibo e o histórico registram:

```text
targetTemplateId
morphKnownFormId
```

Nenhuma falha altera o Character original.

## Runtime e continuidade

A forma recém-materializada recebe `AlternateForm.runtimeState` válido e não inicializado.

Depois da ativação, reutiliza:

- políticas de continuidade;
- runtime da forma ativa;
- custos e duração;
- retorno;
- histórico persistente.

## Motivos de análise

Pendente:

```text
morph-known-form-template-unresolved
```

Bloqueantes:

```text
morph-known-form-not-found
morph-known-form-unavailable
morph-known-form-forgotten
morph-known-form-template-missing
morph-materialization-invalid
morph-materialization-stale
```

## Operações do catálogo

```js
registerMorphKnownForm(character, setId, input, options)
forgetMorphKnownForm(character, setId, knownFormId, options)
restoreMorphKnownForm(character, setId, knownFormId, options)
setMorphKnownFormAvailability(character, setId, knownFormId, available, options)
setMorphPointLimit(character, setId, value, source, options)
findMorphKnownForm(set, knownFormId)
findMorphKnownFormByTemplate(set, templateId)
listAvailableMorphKnownForms(character, setId)
```

## Validação no Character

Para conjuntos `morph`:

- `morphProfile` é obrigatório;
- override e resolution são objetos ou nulos;
- IDs do catálogo são únicos;
- templates resolvidos apontam para `Character.templates`;
- uma entrada conhecida possui no máximo uma forma materializada;
- a forma materializada referencia entrada e template coerentes;
- a forma-base não pode ser uma materialização conhecida;
- proveniência é obrigatória para formas materializadas.

Para conjuntos `alternateForm`:

- dados exclusivos de Morfose são nulos;
- formas não podem carregar materialização de Morfose.

## Serialização

Sobrevivem ao save/load:

- perfil-base e resolvido;
- vínculo da vantagem;
- override;
- decisões e diagnósticos;
- catálogo;
- referências externas;
- formas materializadas;
- fingerprints e proveniência;
- runtime state da forma.

## Próximos blocos

```text
DOM-MORPH-1.3 — aquisição e memorização
DOM-MORPH-1.4 — improvisação
DOM-MORPH-1.5 — limites e fechamento
```

## Não responsabilidades

DOM-MORPH-1.2 não:

- aprende formas;
- observa criaturas;
- resolve memorização;
- improvisa templates;
- aplica limite de pontos;
- calcula custo da vantagem;
- atualiza silenciosamente uma forma ativa.
