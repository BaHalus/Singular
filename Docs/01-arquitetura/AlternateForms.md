# AlternateForms

**Código:** DOM-FORM-1.3  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado, operações, linker e resolução de estado

AlternateForms controla transformações reversíveis entre formas vinculadas a templates.

A arquitetura segue ADR-0011, ADR-0012, ADR-0013 e ADR-0014.

## Conceitos separados

```text
template importado
template permanentemente incorporado
vínculo entre vantagem e template
forma temporariamente ativa
estado transitório da forma
política derivada de continuidade
```

Essa separação permite combinações como Elfo Vampiro, Orc Lich e Anão Lobisomem sem confundir templates permanentes com formas corporais momentâneas.

## AlternateFormSet

```js
{
  id: "set-body",
  name: "Formas Vampíricas",
  mechanism: "alternateForm",
  sourceTraitId: "adv-forma-alternativa",

  baseFormId: "form-humanoid",
  activeFormId: "form-bat",
  activeActivationId: "activation-bat",
  activeSince: "2026-06-19T12:00:00.000Z",

  statePolicy: {
    pools: {
      HP: "shared",
      FP: "shared",
      EnergyReserve: "shared"
    },
    injuries: "shared",
    conditions: "shared",
    effects: "shared",
    equipment: "shared"
  },

  statePolicyOverride: null,
  statePolicyResolution: null,

  forms: []
}
```

Somente uma forma fica ativa dentro de cada conjunto.

Conjuntos independentes podem coexistir, por exemplo Corpo e Revestimento.

## AlternateForm

```js
{
  id: "form-bat",
  name: "Morcego",
  templateId: "template-bat",
  sourceTraitId: "adv-forma-morcego",

  state: {},

  runtimeState: {
    initialized: false,
    capturedAt: null,
    pools: {},
    injuries: [],
    conditions: [],
    effects: [],
    equipment: []
  }
}
```

A forma-base normalmente usa `templateId: null`.

## Linker

`AlternateFormsLinker` vincula vantagens Forma Alternativa a templates somente quando a relação é determinística.

Prioridade:

1. ID explícito;
2. nome explícito;
3. nome entre parênteses;
4. nome após dois-pontos;
5. notas;
6. equivalência canônica exata.

Casos ambíguos permanecem sem vínculo automático.

## Continuidade de estado

Cada campo de `statePolicy` aceita:

```text
shared
perForm
```

`shared` mantém o valor atual no Character.

`perForm` captura o estado da forma de saída e restaura o estado salvo quando ela volta a ser ativada.

A política pode controlar:

- PV atuais;
- PF atuais;
- Reserva de Energia atual;
- ferimentos;
- condições;
- efeitos;
- estado, usos e quantidade de equipamentos.

## FormStatePolicyResolver

`FormStatePolicyResolver` deriva a política a partir de:

- traits de origem;
- modificadores habilitados;
- features habilitadas;
- templates vinculados;
- regras de campanha;
- override manual.

Precedência:

```text
política-base
regras internas
regras de campanha
diretivas explícitas
override manual
```

A primeira regra interna reconhece o modificador habilitado:

```text
Dano Não-Recíproco
Non-Reciprocal Damage
```

e deriva:

```js
{
  pools: { HP: "perForm" },
  injuries: "perForm"
}
```

Modificadores desabilitados não produzem decisões.

## Resolução explicável

```js
statePolicyResolution: {
  setId,
  resolvedAt,
  basePolicy,
  policy,
  decisions,
  diagnostics,
  evidence
}
```

Cada decisão informa:

```js
{
  mode: "perForm",
  source: "builtin",
  priority: 100,
  derivedFrom: [],
  overridden: false,
  conflict: false
}
```

O `basePolicy` preservado permite recomputar a política quando modificadores ou regras mudarem.

## Override manual

Overrides são persistidos em:

```text
statePolicyOverride
```

Eles têm precedência reservada e permanecem aplicáveis em novas resoluções.

## Regras de campanha

Regras declarativas podem filtrar por:

```text
setIds
mechanisms
modifierNames
featureTypes
traitNames
templateIds
```

As comparações são exatas após normalização de caixa e acentos.

## Transição

```text
capturar estado da forma atual
↓
remover seus componentes temporários
↓
adicionar componentes da nova forma
↓
restaurar o estado salvo
↓
atualizar a forma ativa
```

## Operações

```js
analyzeAlternateFormLinks(character)
linkAlternateForms(character)

analyzeFormStatePolicy(character, setId, options)
resolveFormStatePolicy(character, setId, options)
applyResolvedFormStatePolicy(character, setId, options)
applyResolvedFormStatePolicies(character, options)

activateAlternateForm(character, setId, formId)
switchAlternateForm(character, setId, formId)
deactivateAlternateForm(character, setId)
```

## Morfo

`mechanism` aceita `alternateForm` e `morph`.

A estrutura está preparada para Morfo, mas aquisição dinâmica, limites de pontos e improvisação permanecem fora do escopo.

## Não responsabilidades

AlternateForms não calcula:

- custo da vantagem;
- diferença de custo;
- tempo ou teste de transformação;
- máximos de pools;
- proporção de dano;
- atributos finais;
- secundárias;
- NH;
- RD;
- carga;
- ataques finais;
- limites de Morfo.
