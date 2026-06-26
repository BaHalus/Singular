# ADR-0051 — Fonte treinada para defaults entre Skills

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-SKILL-1.9

## Contexto

O motor já avalia um `SkillDefaultCandidate` quando recebe explicitamente o nível da fonte. Ainda falta definir qual resultado pode fornecer esse nível quando a fonte é outra Skill.

Em GURPS, uma Skill não pode servir de ponte para um novo default quando ela própria é conhecida somente por default. A fonte mecânica precisa representar treinamento real, não uma cadeia de defaults.

## Decisão

Será criado `resolveSkillDefaultFromTrainedSource`.

A entrada contém:

```js
{
  candidate,
  trainedSourceResult,
  targetAttributeLevel
}
```

A função aceita somente candidatos com `sourceType = "skill"`.

O resultado-fonte deve:

- ser um `SkillMechanicsResult` de `entityType = "skill"`;
- apontar para o mesmo ID declarado em `candidate.sourceId`;
- estar com `status = "resolved"`;
- possuir `basis.kind = "trained"`.

Quando essas condições forem atendidas, a função delega a avaliação numérica a `resolveSkillDefaultCandidate`, usando `trainedSourceResult.level` como `sourceLevel`.

## Bloqueios mecânicos

A função retorna resultado bloqueado para a Skill-alvo quando:

- não foi fornecido resultado da Skill-fonte;
- o resultado da fonte está bloqueado;
- o resultado resolvido foi obtido por default ou outra base não treinada.

Referência a entidade diferente de `candidate.sourceId` é erro estrutural e não bloqueio mecânico.

## Diagnósticos

Os bloqueios distinguem:

- `SKILL_DEFAULT_TRAINED_SOURCE_MISSING`;
- `SKILL_DEFAULT_SOURCE_BLOCKED`;
- `SKILL_DEFAULT_SOURCE_NOT_TRAINED`.

Quando a fonte já está bloqueada, seus diagnósticos são preservados como contexto portátil, sem serem promovidos a diagnósticos próprios da Skill-alvo.

## Fronteiras

Esta etapa não:

- busca a Skill-fonte no `Character`;
- escolhe entre múltiplos resultados possíveis da fonte;
- usa o resultado final da fonte quando ele veio de default;
- interpreta payloads do GCS;
- resolve nomes;
- percorre grafos;
- trata melhoria de uma Skill comprada a partir de seu default;
- resolve Techniques;
- altera aplicação, Point Ledger ou UI.

## Alternativas rejeitadas

### Usar o resultado final da Skill-fonte sem verificar a base

Rejeitada porque permitiria encadear defaults silenciosamente.

### Usar `importedLevel`

Rejeitada porque valores importados são evidência, não autoridade mecânica.

### Procurar a fonte pelo nome

Rejeitada porque nomes editoriais não são identidade mecânica.

## Invariantes

1. Defaults entre Skills exigem fonte canônica explícita.
2. A fonte precisa estar resolvida por treinamento.
3. Um resultado com `basis.kind = "default"` nunca alimenta outro default.
4. A avaliação numérica continua pertencendo a `resolveSkillDefaultCandidate`.
5. A função é pura e determinística.
6. Nenhum NH é persistido no `Character`.
