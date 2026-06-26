# ADR-0048 — Avaliação unitária de default de Skill

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-SKILL-1.7

## Contexto

A ADR-0047 criou `SkillDefaultCandidate`, que contém identidade explícita, tipo de fonte e modificador. O próximo passo deve avaliar um candidato isolado sem ainda escolher entre vários defaults, percorrer grafos ou comparar com nível treinado.

## Decisão

Será criado `resolveSkillDefaultCandidate`.

A entrada contém:

- um `SkillDefaultCandidate` válido;
- `sourceLevel`, já resolvido para o atributo ou Skill-fonte;
- `targetAttributeLevel`, nível do atributo-base da Skill-alvo.

A saída é um `SkillMechanicsResult` para `targetSkillId`.

O nível do default é:

```text
sourceLevel + modifier
```

O NH relativo é:

```text
nível do default - targetAttributeLevel
```

## Diagnósticos

A resolução bloqueia quando:

- `sourceLevel` não é finito;
- `targetAttributeLevel` não é finito;
- a soma ou o NH relativo não é finito.

Um resultado resolvido inclui diagnóstico informativo com ID do candidato, tipo da fonte, modificador e valores usados.

## Fronteiras

- A identidade da fonte já foi resolvida antes desta função.
- A função não consulta `Character`, importadores ou nomes.
- A função não escolhe o melhor candidato.
- A função não percorre defaults encadeados.
- O chamador continua responsável por detectar ciclos e fornecer níveis de fonte soberanos.

## Invariantes

1. A avaliação é pura e determinística.
2. O candidato não é alterado.
3. A fonte é explícita e já resolvida.
4. Nenhuma associação por nome é permitida.
5. O resultado usa `SkillMechanicsResult`.
6. Seleção, ciclos, nível treinado e Techniques permanecem fora de escopo.
