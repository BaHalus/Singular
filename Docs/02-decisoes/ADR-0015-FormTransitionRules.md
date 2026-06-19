# ADR-0015 — Regras de transição específicas por forma

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

Formas diferentes do mesmo conjunto podem possuir modificadores diferentes.

Exemplo:

```text
Forma de Lobo: Custa Fadiga 2
Forma de Morcego: Gatilho — Escuridão total
```

Essas condições não podem ser fundidas numa única regra do conjunto, pois isso faria o custo do Lobo afetar o Morcego e o gatilho do Morcego afetar o Lobo.

Também é necessário preservar:

- tempo de transformação;
- manobra exigida;
- custos em recursos;
- testes;
- requisitos;
- gatilhos;
- transformação involuntária;
- impedimentos;
- duração;
- retorno à forma-base.

## Decisão

`AlternateFormSet.transitionRules` contém apenas os padrões compartilhados do conjunto.

Cada `AlternateForm` pode conter:

```js
{
  transitionRules,
  transitionRulesOverride,
  transitionRulesResolution
}
```

A resolução é executada por `FormTransitionRulesResolver` para uma forma de destino específica.

## Precedência

```text
padrão do conjunto ou da forma
regras internas conhecidas
regras de campanha
diretivas estruturadas explícitas
override manual
```

## Evidência isolada

Para cada forma, o resolver analisa somente:

- o trait que originou aquela forma;
- modificadores e features desse trait;
- o template vinculado àquela forma;
- traits, modificadores e features desse template.

A forma-base não herda automaticamente os modificadores da primeira Forma Alternativa do conjunto.

## Regras internas iniciais

Modificadores habilitados reconhecidos:

```text
Custa Fadiga / Costs Fatigue
Gasto Adicional de Tempo / Takes Extra Time
Tempo Reduzido / Reduced Time
Gatilho / Trigger
Preparação Necessária / Preparation Required
Impedimento / Hindrance
Incontrolável / Uncontrollable
```

`Gasto Adicional de Tempo` e `Tempo Reduzido` produzem apenas `timeStepsDelta`.

O resolver não converte esses passos em segundos sem uma regra de tempo-base declarada.

## Estrutura canônica

```js
{
  activation: {
    baseTimeSeconds: null,
    timeStepsDelta: 0,
    maneuver: null,
    costs: [],
    tests: [],
    requirements: [],
    triggers: [],
    involuntary: false,
    interruptible: true
  },

  deactivation: {
    baseTimeSeconds: null,
    timeStepsDelta: 0,
    maneuver: null,
    costs: [],
    tests: [],
    requirements: [],
    triggers: [],
    involuntary: false,
    interruptible: true
  },

  duration: {
    minimumSeconds: null,
    maximumSeconds: null
  },

  return: {
    mode: "manual",
    targetFormId: null,
    triggers: []
  },

  impediments: []
}
```

## Regras de campanha

Regras declarativas podem filtrar por:

```text
setIds
formIds
mechanisms
modifierNames
featureTypes
traitNames
templateIds
```

Coleções usam `merge` por padrão. Uma regra pode declarar `collectionMode: "replace"`.

## Override manual

Overrides manuais substituem os valores escalares e as coleções declaradas.

Eles são persistidos na forma e podem ser removidos explicitamente com `manualOverride: null`.

## Conflitos

Decisões contraditórias de mesma prioridade não são resolvidas silenciosamente.

A primeira decisão determinística permanece e o conflito é registrado no relatório.

## Importação

Depois de vincular as formas e resolver a continuidade de estado, `CharacterImporter` resolve as regras de transição de cada forma.

A importação com diagnósticos retorna:

```js
formTransitionRulesResolutions
```

## Não responsabilidades

O resolver declara condições, mas não:

- consome recursos;
- executa testes;
- mede o tempo transcorrido;
- verifica requisitos no mundo;
- ativa gatilhos;
- bloqueia diretamente a transformação;
- calcula o tempo-base de GURPS;
- troca a forma ativa.

A execução dessas condições pertence a um serviço operacional posterior.
