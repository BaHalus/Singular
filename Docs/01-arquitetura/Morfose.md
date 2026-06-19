# Morfose

**Código:** DOM-MORPH-1.1  
**Status:** Resolução da vantagem implementada  
**Camada:** Domain  
**Tipo:** Perfil declarativo, catálogo conhecido e resolução explicável

Morfose reutiliza o subsistema de formas temporárias e acrescenta catálogo, aquisição, memorização, improvisação, limites declarados e resolução da vantagem de origem.

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

## Localização

```text
AlternateFormSet
└── mechanism: "morph"
    ├── sourceTraitId
    ├── morphProfile
    ├── morphProfileOverride
    └── morphProfileResolution
```

Forma Alternativa usa o mesmo agregado de conjunto, mas mantém:

```js
mechanism: "alternateForm"
morphProfile: null
morphProfileOverride: null
morphProfileResolution: null
```

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

O perfil não calcula esse limite. Ele registra valor, modo e proveniência.

## Catálogo

Modes:

```text
unknown
knownOnly
open
```

`unknown` significa que a política ainda não foi resolvida.

`knownOnly` declara que a seleção deve vir do catálogo conhecido.

`open` declara que o catálogo não é a única fonte, sem autorizar por si só improvisação irrestrita.

## Memorização

Modes:

```text
unknown
none
permanent
limited
```

`capacity` permanece declarativa e não é derivada localmente.

## Improvisação

Modes:

```text
unknown
forbidden
allowed
conditional
```

`pointLimit` é independente do limite geral e pode permanecer nulo.

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

O domínio preserva a referência externa e não inventa associação por nome aproximado.

## Resolução da vantagem

```js
analyzeMorphProfile(character, setId, options)
resolveMorphProfile(character, setId, options)
applyResolvedMorphProfile(character, setId, options)
applyResolvedMorphProfiles(character, options)
```

O resolver:

1. usa `sourceTraitId` válido;
2. na ausência dele, aceita somente uma vantagem chamada `Morfose`;
3. não escolhe quando há múltiplas candidatas;
4. coleta modifiers, features e dados explícitos preservados;
5. ignora mecanicamente evidências desabilitadas;
6. aplica regras builtin conhecidas;
7. aplica regras de campanha;
8. aplica diretivas explícitas;
9. aplica override manual por último;
10. persiste perfil, decisões, evidências e diagnósticos.

## Precedência

```text
perfil-base
→ valor importado
→ builtin
→ campanha
→ explícito
→ manual
```

Conflitos de mesma prioridade são registrados, não sobrescritos silenciosamente.

## Recomposição

A resolução preserva:

```text
morphProfileResolution.baseProfile
```

Toda nova resolução recomeça desse perfil-base. Remover ou desabilitar um modificador remove também sua contribuição anterior.

## Modificadores reconhecidos

Com efeito direto já declarado:

```text
Ilimitada
Formas Improvisadas
Cósmica (Para Formas Improvisadas)
Não Exige Memorização
Incapaz de Memorizar Formas
```

Reconhecidos sem inventar consequências ainda não modeladas:

```text
Cosmética
Mantém a Forma
Conservação da Massa
Mudança Ativa
Imperfeita
Somente Formas Não-Vivas
```

Modificadores desabilitados aparecem em `ignoredModifiers`.

Modificadores ativos ainda desconhecidos aparecem em `unresolvedModifiers`.

## Diretivas explícitas

Dados importados ou autorais podem fornecer:

```js
{
  morphProfile: {
    catalog: {
      mode: "knownOnly",
      capacity: 8
    },
    improvisation: {
      mode: "conditional",
      pointLimit: 30
    }
  }
}
```

A forma `morph_profile` também é aceita.

## Regras de campanha

Uma regra pode selecionar por:

```text
setId
sourceTraitId
traitName
modifierName
```

E declarar um perfil parcial com precedência superior às regras builtin.

## Override manual

```text
AlternateFormSet.morphProfileOverride
```

Tem precedência final e permanece serializado.

## Explicação persistente

```text
AlternateFormSet.morphProfileResolution
```

Contém:

- vantagem vinculada;
- método de vínculo;
- perfil-base;
- perfil resolvido;
- decisão por campo;
- evidências;
- modifiers reconhecidos;
- modifiers ignorados;
- modifiers não resolvidos;
- conflitos e diagnósticos;
- instante de resolução.

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

As operações não alteram Forma Alternativa e não ativam formas.

## Validação no Character

Para cada conjunto `morph`:

- `morphProfile` é obrigatório;
- override e resolution devem ser objetos ou nulos;
- IDs do catálogo são únicos;
- `templateId`, quando presente, referencia `Character.templates`;
- um template não aparece duas vezes no mesmo catálogo;
- limite, modo e fonte devem ser coerentes.

Para conjuntos `alternateForm`:

- perfil, override e resolution de Morfose devem ser nulos.

## Serialização

Sobrevivem ao save/load:

- perfil-base e perfil resolvido;
- vínculo com a vantagem;
- override;
- decisões;
- evidências;
- diagnósticos;
- catálogo e referências externas.

## Próximos blocos

```text
DOM-MORPH-1.2 — seleção e materialização de forma conhecida
DOM-MORPH-1.3 — aquisição e memorização
DOM-MORPH-1.4 — improvisação
DOM-MORPH-1.5 — limites e fechamento
```

A divisão poderá ser refinada conforme os formatos reais importados, sem criar caminhos paralelos.

## Não responsabilidades

DOM-MORPH-1.1 não:

- seleciona forma;
- ativa template;
- calcula custo da vantagem;
- inventa efeito para modifiers desconhecidos;
- aprende formas;
- observa criaturas;
- improvisa templates;
- executa testes de transformação.
