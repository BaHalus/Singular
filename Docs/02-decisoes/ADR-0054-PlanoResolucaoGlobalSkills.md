# ADR-0054 — Plano global de resolução de Skills e Techniques

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** APP-SKILL-1.1

## Contexto

A fundação local já resolve:

- níveis efetivos de ST, DX, IQ e HT;
- Skills treinadas;
- defaults canônicos por atributo ou Skill;
- seleção do melhor resultado de uma Skill;
- Techniques baseadas em uma Skill treinada.

Falta compor essas autoridades para todas as Skills e Techniques de um personagem sem persistir resultados derivados nem criar resolução por nome.

## Decisão

A composição global será conduzida por um plano portátil e efêmero chamado conceitualmente `SkillMechanicsResolutionPlan`.

O plano recebe snapshots canônicos já validados:

```js
{
  schemaVersion: 1,
  characterId,
  attributeLevels,
  skills,
  techniques,
  defaultCandidates
}
```

O plano não é salvo dentro do `Character`.

## Entradas

### `attributeLevels`

Relatório produzido por `resolveAttributeLevels`.

Skills não leem diretamente `base` ou `override`.

### `skills`

Coleção canônica de Skills, preservada na ordem do Character.

### `techniques`

Coleção canônica de Techniques, preservada na ordem do Character.

### `defaultCandidates`

Lista de `SkillDefaultCandidate` já transformados por uma fronteira explícita.

Todo candidato precisa:

- apontar para uma Skill-alvo existente;
- possuir ID único no plano;
- usar atributo básico conhecido ou Skill-fonte existente;
- manter a ordem declarada para desempates determinísticos.

Nomes e especializações não resolvem identidade.

## Ordem obrigatória de execução

1. validar integralmente o plano;
2. calcular o resultado treinado de todas as Skills;
3. avaliar defaults por atributo usando somente níveis efetivos resolvidos;
4. avaliar defaults por Skill usando somente o resultado treinado da fonte;
5. selecionar o resultado final de cada Skill;
6. resolver Techniques usando somente o resultado treinado de sua Skill-base;
7. produzir relatório global portátil e imutável.

## Consequência sobre grafos

Defaults não consomem o resultado final de outra Skill. Eles consomem apenas:

- atributo explícito; ou
- resultado treinado explícito de outra Skill.

Assim, defaults não formam cadeias mecânicas e não exigem propagação recursiva. Referências ausentes ou fontes não treinadas produzem diagnóstico local.

## Resultado global

```js
{
  schemaVersion: 1,
  characterId,
  attributeLevels,
  skillReports: [],
  techniqueResults: [],
  diagnostics: []
}
```

Cada `skillReport` preserva:

- resultado treinado;
- avaliações de defaults;
- resultado final.

Cada Technique preserva seu `SkillMechanicsResult`.

O relatório global é derivado, não autoritativo para persistência e reconstruível a partir das entradas canônicas.

## Resultados parciais

Um atributo, Skill, candidato ou Technique bloqueado não impede a produção dos demais resultados independentes.

Erros estruturais do plano rejeitam a execução integral. Bloqueios mecânicos válidos permanecem no relatório como resultados `blocked`.

## Fronteiras

A criação do plano pertence à aplicação. O cálculo de cada resultado permanece no motor.

A aplicação pode:

- reunir entradas canônicas;
- validar identidades;
- coordenar a ordem;
- publicar o relatório derivado.

A aplicação não pode:

- calcular NH;
- interpretar payload opaco do GCS;
- resolver por nome;
- aplicar fórmulas de atributo, Skill ou Technique;
- persistir resultados no Character.

## Fora de escopo

- transformação de todos os formatos externos de defaults;
- modificadores de Traits, Talentos, equipamentos ou condições;
- Skills compradas a partir de defaults melhores;
- Techniques especiais, múltiplas bases ou defesa ativa;
- custo de atributos e demais contabilidade nova;
- incorporação ao Application Read Model;
- UI.

## Invariantes

1. O Character permanece a fonte persistente.
2. O plano e o relatório são efêmeros.
3. O motor continua sendo a única autoridade de cálculo.
4. A aplicação coordena, mas não calcula.
5. Defaults nunca usam outro default como fonte.
6. Techniques usam somente Skill-base treinada.
7. Identidades são explícitas.
8. A ordem declarada é preservada.
9. Bloqueios mecânicos permitem resultados parciais.
10. Entradas iguais produzem relatório global igual.

## Implementação incremental

A implementação deverá ocorrer em blocos:

1. contrato portátil e validação do plano;
2. executor global de Skills;
3. resolução global de Techniques;
4. relatório e diagnósticos agregados;
5. integração posterior ao Application Read Model.

Nenhum bloco deve alterar `Character.js` para armazenar NH derivado.
