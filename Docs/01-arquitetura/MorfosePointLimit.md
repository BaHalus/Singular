# Limite de pontos da Morfose

**Código:** DOM-MORPH-1.5  
**Status:** Implementado  
**Camada:** Domain  
**Decisão:** ADR-0027

## Objetivo

DOM-MORPH-1.5 fecha a aplicação mecânica do limite de pontos de Morfose para formas conhecidas e improvisadas.

A autoridade é única:

```text
MorphPointLimit
```

A UI não compara pontos, não escolhe limites e não decide se uma forma é válida.

## Semântica do perfil

`MorphProfile.pointLimit` representa o teto efetivo já resolvido para o valor do template racial que a Morfose pode assumir.

```js
{
  pointLimitMode: "undeclared" | "limited" | "unlimited",
  pointLimit: number | null,
  pointLimitSource: "undeclared" | "manual" | "imported" | "modifier" | "campaign"
}
```

O domínio não reconstrói esse teto a partir do custo textual da vantagem, do nome de modificadores ou da raça-base. Importadores, regras de campanha e overrides devem converter suas representações de origem para o teto efetivo antes da avaliação.

Isso impede que a camada de limite duplique o resolver da vantagem ou invente uma raça nativa.

## Avaliação

```js
evaluateMorphPointLimit(profile, templateImportedPoints, {
  targetKind: "known" | "improvised"
})
```

A avaliação produz:

```js
{
  targetKind,
  generalPointLimitMode,
  generalPointLimit,
  generalPointLimitSource,
  improvisationPointLimit,
  effectivePointLimit,
  templateImportedPoints,
  generalExcessPoints,
  improvisationExcessPoints,
  enforcementMode,
  enforced,
  complete,
  status,
  reasons
}
```

Estados:

```text
ready   → todos os limites aplicáveis são conhecidos e satisfeitos
pending → falta o teto geral ou o valor do template
blocked → ao menos um teto conhecido foi excedido
```

## Formas conhecidas

Uma forma conhecida usa o valor:

```text
Character.templates[targetForm.templateId].importedPoints
```

Com limite geral finito:

```text
templateImportedPoints <= pointLimit
```

Igualdade é permitida. Valores negativos de templates são preservados e comparados normalmente.

Sem `importedPoints`, uma política finita não pode ser confirmada e a avaliação permanece `pending`.

## Formas improvisadas

A improvisação usa o snapshot:

```text
targetForm.morphImprovisation.draft.template.importedPoints
```

Quando existe `improvisation.pointLimit`, o teto efetivo é o mais restritivo:

```text
min(pointLimit geral, pointLimit de improvisação)
```

`Ilimitada` remove o teto geral, mas não apaga um teto específico de improvisação declarado por campanha, importação ou override.

## Modo não declarado

`undeclared` não é sinônimo de `unlimited`.

A avaliação registra:

```text
morph-point-limit-undeclared
status: pending
enforced: false
complete: false
```

Para preservar personagens importados antes de uma política resolvida, a ausência total de teto não transforma sozinha uma seleção válida em bloqueio. O plano recebe a avaliação incompleta e não declara que o limite foi cumprido.

Um teto parcial de improvisação ainda pode bloquear uma violação conhecida mesmo quando o teto geral está ausente.

## Integração com o planner

`FormTransitionPlanner` continua sendo a fronteira de ativação.

Fluxo:

```text
seleção conhecida ou improvisada
→ avaliação estrutural existente
→ MorphPointLimit
→ união de razões
→ status final do plano
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

Uma forma pode permanecer materializada como projeção inativa, mas não recebe um plano executável quando excede um limite conhecido.

## Revalidação

A avaliação integral entra em `morphSelection.pointLimitEvaluation` e, portanto, no fingerprint do plano de transição.

Alterações em:

- modo do limite;
- valor do limite;
- fonte;
- teto específico de improvisação;
- valor do template;

mudam o plano refeito pelo executor. Um plano antigo não pode contornar uma política atualizada.

## APIs

```js
evaluateMorphPointLimit(profile, templateImportedPoints, options)
evaluateMorphTargetPointLimit(character, set, targetForm)
applyMorphPointLimitToSelection(selection, evaluation)
getMorphPointLimitReasonSeverity(reason)
```

## Não responsabilidades

DOM-MORPH-1.5 não:

- calcula o preço final da vantagem Morfose;
- deriva raça nativa por nome;
- recalcula `Template.importedPoints` somando componentes;
- modifica templates;
- materializa ou ativa formas;
- duplica o resolver de modificadores;
- aplica fórmulas na UI.
