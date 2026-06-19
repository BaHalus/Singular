# Morfose

**Código:** DOM-MORPH-1.0  
**Status:** Fundação aprovada  
**Camada:** Domain  
**Tipo:** Perfil declarativo e catálogo conhecido

Morfose reutiliza o subsistema de formas temporárias, acrescentando catálogo, aquisição, memorização, improvisação e limites declarados.

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
    └── morphProfile
```

Forma Alternativa usa o mesmo agregado de conjunto, mas mantém:

```js
mechanism: "alternateForm"
morphProfile: null
```

## Estrutura

```js
{
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

```js
{
  pointLimit: 80,
  pointLimitSource: "campaign"
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

O perfil não calcula esse limite. Ele somente registra o valor informado e sua proveniência.

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

## Operações

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
- IDs do catálogo são únicos;
- `templateId`, quando presente, referencia `Character.templates`;
- um template não aparece duas vezes no mesmo catálogo.

Para conjuntos `alternateForm`:

- `morphProfile` deve ser nulo.

## Serialização

O perfil e o catálogo integram `AlternateFormSets` e sobrevivem ao save/load do Character.

## Próximos blocos

```text
DOM-MORPH-1.1 — resolução da vantagem e dos modificadores
DOM-MORPH-1.2 — seleção e materialização de forma conhecida
DOM-MORPH-1.3 — aquisição e memorização
DOM-MORPH-1.4 — improvisação
DOM-MORPH-1.5 — limites e fechamento
```

A divisão poderá ser refinada conforme os formatos reais importados, sem criar caminhos paralelos.

## Não responsabilidades

DOM-MORPH-1.0 não:

- seleciona forma;
- ativa template;
- calcula pontos;
- interpreta automaticamente modificadores;
- aprende formas;
- observa criaturas;
- improvisa formas;
- executa testes.
