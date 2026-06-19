# FormStatePolicyResolver

**Código:** DOM-FORM-1.3  
**Status:** Aprovado  
**Camada:** Domain / Rules boundary  
**Tipo:** Resolver declarativo

FormStatePolicyResolver produz a política de continuidade de estado de cada conjunto de formas.

## Entrada

```js
resolveFormStatePolicy(character, formSetId, options)
```

O resolver consulta:

- política-base do conjunto;
- traits de origem;
- modificadores;
- features;
- templates das formas;
- regras de campanha;
- override manual.

## Saída

```js
{
  setId,
  resolvedAt,
  basePolicy,
  policy,
  decisions,
  diagnostics,
  evidence
}
```

## Precedência

```text
existing
builtin
campaign
explicit
manual
```

A decisão manual possui prioridade reservada e não pode ser superada por regra de campanha.

## Decisões

Cada campo possui uma decisão explicável:

```js
{
  mode: "perForm",
  source: "builtin",
  priority: 100,
  derivedFrom: [
    {
      kind: "modifier",
      id: "modifier-id",
      name: "Dano Não-Recíproco",
      ruleId: "gurps.non-reciprocal-damage"
    }
  ],
  overridden: false,
  conflict: false
}
```

Os campos resolvidos são:

```text
pools.HP
pools.FP
pools.EnergyReserve
injuries
conditions
effects
equipment
```

## Regra interna inicial

Um modificador habilitado chamado:

```text
Dano Não-Recíproco
Non-Reciprocal Damage
```

produz:

```js
{
  pools: { HP: "perForm" },
  injuries: "perForm"
}
```

Modificadores desabilitados são preservados como evidência, mas não produzem sinais.

## Regras de campanha

```js
{
  id: "campaign.absorptive-equipment",

  when: {
    modifierNames: ["Mudança com Absorção"]
  },

  policy: {
    equipment: "perForm"
  },

  priority: 200,
  enabled: true
}
```

Filtros disponíveis:

```text
setIds
mechanisms
modifierNames
featureTypes
traitNames
templateIds
```

Todos os filtros declarados precisam corresponder.

## Diretivas explícitas

Objetos podem declarar:

```js
formStatePolicy: {
  effects: "perForm"
}
```

ou uma feature:

```js
{
  type: "form_state_policy",
  target: "effects",
  mode: "perForm"
}
```

## Override manual

```js
applyResolvedFormStatePolicy(character, setId, {
  manualOverride: {
    injuries: "shared"
  },
  overrideId: "master-ruling-001"
})
```

O override é salvo em `statePolicyOverride`.

## Recomposição

Quando uma política já foi resolvida, uma nova execução usa `statePolicyResolution.basePolicy`.

Isso evita que um resultado antigo se torne o novo fallback e permite reverter efeitos derivados quando modificadores são removidos ou desabilitados.

## Operações

```js
analyzeFormStatePolicy(character, setId, options)
resolveFormStatePolicy(character, setId, options)
applyResolvedFormStatePolicy(character, setId, options)
applyResolvedFormStatePolicies(character, options)
collectFormStateEvidence(character, set)
```

## Não responsabilidades

O resolver não calcula:

- máximos de PV, PF ou Reserva de Energia;
- proporção de dano;
- cura;
- perda de recursos;
- custo da transformação;
- tempo de ativação;
- efeitos mecânicos de modificadores não cadastrados.
