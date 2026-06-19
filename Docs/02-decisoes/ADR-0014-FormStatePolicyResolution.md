# ADR-0014 — Resolução da continuidade de estado das formas

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

A política de estado de uma forma pode depender de traits, modificadores, features, regras de campanha e decisões manuais.

O domínio precisa derivar essa política sem interpretar modificadores desabilitados, sem usar aproximação textual e sem ocultar conflitos.

## Decisão

`FormStatePolicyResolver` resolve a política nesta ordem:

```text
política-base
regras internas
regras de campanha
diretivas explícitas
override manual
```

A política-base é preservada em cada resolução. Reexecuções partem dela, permitindo reverter uma decisão quando a evidência que a produziu deixa de existir.

## Evidências

São analisados:

- traits de origem do conjunto e das formas;
- modificadores habilitados;
- features habilitadas;
- templates vinculados;
- traits, modificadores e features desses templates.

Objetos com `disabled: true` ou `enabled: false` não produzem decisões.

## Regra interna inicial

O modificador habilitado `Dano Não-Recíproco` ou `Non-Reciprocal Damage` deriva:

```js
{
  pools: { HP: "perForm" },
  injuries: "perForm"
}
```

Outros modificadores só produzem política quando existe regra cadastrada ou diretiva estrutural explícita.

## Diretivas explícitas

São aceitas estruturas como:

```js
formStatePolicy: {
  equipment: "perForm"
}
```

e:

```js
{
  type: "form_state_policy",
  target: "equipment",
  mode: "perForm"
}
```

## Regras de campanha

Regras declarativas podem filtrar por nomes de modificadores, tipos de features, nomes de traits, templates, conjuntos e mecanismos.

Comparações são exatas após normalização de maiúsculas e acentos. Não existe correspondência aproximada.

## Override manual

Overrides manuais são persistidos em `AlternateFormSet.statePolicyOverride` e têm precedência sobre as decisões derivadas.

## Resolução armazenada

`AlternateFormSet.statePolicyResolution` registra:

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

Cada decisão informa modo, fonte, prioridade, evidências, override e conflito.

## Conflitos

Regras de mesma prioridade que discordam não são resolvidas silenciosamente. A decisão determinística anterior permanece e um diagnóstico de conflito é registrado.

## Importação

Depois do `AlternateFormsLinker`, `CharacterImporter` executa a resolução de políticas.

A importação com diagnósticos retorna também:

```js
formStatePolicyResolutions
```

## Consequências

A arquitetura passa a oferecer política derivada, explicável, reversível, extensível por campanha e corrigível manualmente, sem calcular máximos, proporções ou efeitos mecânicos.
