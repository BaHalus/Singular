# ADR-0052 — Progressão mecânica de Techniques

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-TECH-1.5

## Contexto

O domínio estrutural de Techniques já preserva:

- `skillId` da perícia-base;
- dificuldade `A` ou `H`;
- pontos investidos;
- penalidade padrão;
- limite máximo relativo;
- níveis importados para auditoria.

Ainda falta uma autoridade mecânica soberana que calcule a técnica sem gravar NH derivado no `Character`.

## Decisão

Será criado `resolveTechnique` no Skill Mechanics Engine.

Entrada conceitual:

```js
{
  technique,
  trainedSkillResult
}
```

A Skill-base precisa ser um `SkillMechanicsResult`:

- de `entityType = "skill"`;
- com o mesmo ID de `technique.skillId`;
- com `status = "resolved"`;
- com `basis.kind = "trained"`.

Uma Skill conhecida somente por default não alimenta Technique nesta etapa.

## Nível padrão

A técnica começa em:

```text
Skill-base + defaultPenalty
```

Zero pontos mantém esse nível padrão.

## Progressão por pontos

### Técnica Average (`A`)

Cada ponto melhora a técnica em +1 sobre o nível padrão.

### Técnica Hard (`H`)

- zero pontos mantém o nível padrão;
- o primeiro nível de melhoria custa 2 pontos;
- depois disso, cada ponto adicional melhora +1;
- uma alocação isolada de 1 ponto não compra nível e é tratada como entrada mecanicamente inválida.

## Limite máximo

Quando `maximumRelativeLevel` estiver declarado, ele representa o maior nível permitido relativo à Skill-base.

O resultado relativo é:

```text
min(defaultPenalty + melhoria, maximumRelativeLevel)
```

Se a progressão ultrapassar o limite, o motor aplica o teto e emite diagnóstico informativo.

`maximumRelativeLevel` menor que `defaultPenalty` é contraditório e bloqueia a resolução.

## Resultado

A função produz `SkillMechanicsResult` com:

- `entityType = "technique"`;
- `basis.kind = "technique"`;
- `basis.sourceId = technique.skillId`;
- `level` absoluto da Technique;
- `relativeLevel` relativo à Skill-base.

## Valores importados

`importedLevel` e `importedRelativeLevel` continuam sendo evidência externa.

Divergências geram avisos, sem substituir o cálculo soberano.

## Bloqueios

A resolução bloqueia quando:

- não existe `skillId` explícito;
- dificuldade está ausente ou não é `A`/`H`;
- pontos são fracionários, não finitos ou incompatíveis com a progressão Hard;
- `defaultPenalty` está ausente, não é inteiro ou não é finito;
- `maximumRelativeLevel` está presente mas não é inteiro/finito;
- o limite máximo está abaixo do nível padrão;
- a Skill-base está ausente, bloqueada, aponta para outra entidade ou não foi resolvida por treinamento.

Estruturas já inválidas para `validateTechnique` permanecem erros estruturais.

## Fora de escopo

- Techniques com defaults especiais ou múltiplas Skills-base;
- Techniques baseadas diretamente em atributo, defesa ativa ou outra grandeza;
- modificadores externos;
- interpretação de payloads opacos do GCS;
- associação por nome;
- aplicação, Point Ledger, read model e UI;
- política de compra de Technique a partir de Skill melhorada por default.

## Invariantes

1. O motor é a única autoridade de NH da Technique.
2. A estrutura persistente apenas declara entradas.
3. A Skill-base precisa ser explícita e treinada.
4. Zero pontos preserva o nível padrão.
5. A dificuldade aceita apenas `A` e `H`.
6. O teto é aplicado de forma determinística.
7. Valores importados nunca substituem o cálculo.
8. Nenhum NH calculado é persistido no `Character`.
