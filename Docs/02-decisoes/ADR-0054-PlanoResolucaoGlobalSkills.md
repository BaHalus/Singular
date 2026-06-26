# ADR-0054 — Plano global de resolução de Skills e Techniques

**Status:** Aprovado e implementado  
**Data:** 2026-06-26  
**Bloco:** APP-SKILL-1.1 a 1.4

## Contexto

A fundação local já resolvia:

- níveis efetivos de ST, DX, IQ e HT;
- Skills treinadas;
- defaults canônicos por atributo ou Skill;
- seleção do melhor resultado de uma Skill;
- Techniques baseadas em uma Skill treinada.

Faltava compor essas autoridades para todas as Skills e Techniques de um personagem sem persistir resultados derivados, resolver entidades por nome ou criar um grafo recursivo de defaults.

## Decisão

A composição global usa um plano portátil e efêmero chamado `SkillMechanicsResolutionPlan`.

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

Coleção canônica de Skills, preservada na ordem declarada.

### `techniques`

Coleção canônica de Techniques, preservada na ordem declarada.

### `defaultCandidates`

Lista de `SkillDefaultCandidate` já transformados por uma fronteira explícita.

Todo candidato precisa:

- apontar para uma Skill-alvo existente;
- possuir ID único no plano;
- usar ST, DX, IQ ou HT, ou uma Skill-fonte existente;
- manter a ordem declarada para desempates determinísticos.

Nomes e especializações não resolvem identidade.

## Implementação

### Contrato do plano

`src/application/skills/SkillMechanicsResolutionPlan.js`:

- valida snapshots canônicos;
- exige IDs string únicos;
- valida referências de candidatos;
- rejeita arrays esparsos e evidência não portátil;
- preserva a ordem declarada;
- produz snapshot destacado e profundamente imutável.

### Execução em lote de Skills

`src/application/skills/SkillBatchResolutionExecutor.js` executa duas passagens:

1. calcula o resultado treinado de todas as Skills;
2. avalia defaults por atributo ou pelo resultado treinado da Skill-fonte.

O resultado final de uma Skill nunca alimenta outro default.

Cada Skill produz um `SkillResolutionReport` com:

- resultado treinado;
- avaliações de defaults;
- resultado final.

### Execução global

`src/application/skills/SkillMechanicsGlobalExecutor.js`:

1. executa o lote de Skills;
2. resolve Techniques usando somente o `trainedResult` da Skill-base;
3. produz relatório global portátil e imutável.

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

O relatório é derivado, reconstruível e não autoritativo para persistência.

## Resultados parciais

Um atributo, Skill, candidato ou Technique bloqueado não impede a produção dos demais resultados independentes.

Erros estruturais do plano rejeitam a execução integral. Bloqueios mecânicos válidos permanecem no relatório como resultados `blocked`.

## Fronteiras

A criação e coordenação do plano pertencem à aplicação. O cálculo de cada resultado permanece no motor.

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
- resolução de IDs externos;
- modificadores de Traits, Talentos, equipamentos ou condições;
- Skills compradas a partir de defaults melhores;
- Techniques especiais, múltiplas bases ou defesa ativa;
- custo de atributos e demais contabilidade nova;
- incorporação ao `ApplicationReadModel`;
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

## Evidências

- PR #91: decisão arquitetural, merge `707d0af`;
- PR #95: contrato do plano, merge `2328931`, Tests #820 verde;
- PR #96: execução em lote de Skills, merge `3a7898a`, Tests #822 verde;
- PR #97: execução global de Skills e Techniques, merge `f8e63cf`, Tests #824 verde.

## Próxima etapa

Criar uma projeção de leitura dedicada que consuma o relatório global sem recalcular regras. A incorporação ao `ApplicationReadModel` exige contrato explícito para obtenção de `defaultCandidates` e não deve interpretar diretamente `Skill.defaults`.
