# GATE-DOM-SKILL-1.5 — Progressão treinada de Skills

**Status:** Fechamento proposto para revisão  
**Data:** 2026-06-26  
**ADR:** ADR-0045, ADR-0046

## Objetivo

Certificar a primeira regra mecânica soberana do Skill Mechanics Engine: a progressão de Skills treinadas a partir de dificuldade, pontos e nível explícito do atributo-base.

## Entregas certificadas

- `SkillMechanicsResult` como contrato portátil e imutável de resultado;
- `resolveTrainedSkill` como função pura e determinística;
- dificuldades canônicas `E`, `A`, `H` e `VH`;
- patamares de pontos em 1, 2, 4 e incrementos posteriores de 4;
- NH relativo e NH absoluto calculados sem gravar no `Character`;
- nível do atributo-base recebido como entrada explícita;
- valores importados comparados como evidência não autoritativa;
- diagnósticos portáteis para entradas bloqueantes e divergências;
- preservação integral da Skill recebida.

## Evidências

- PR #80: contrato `SkillMechanicsResult`;
- Tests #780 verde após correção de arrays esparsos;
- PR #80 integrada no merge `df4934d`;
- PR #81: progressão treinada;
- Tests #783 verde no head final `9d2e1b5`;
- P1 sobre `-Infinity` corrigido antes da integração;
- PR #81 integrada no merge `1478170`.

## Regras certificadas

| Dificuldade | 1 ponto | 2 pontos | 4 pontos | 8 pontos |
|---|---:|---:|---:|---:|
| `E` | A+0 | A+1 | A+2 | A+3 |
| `A` | A−1 | A+0 | A+1 | A+2 |
| `H` | A−2 | A−1 | A+0 | A+1 |
| `VH` | A−3 | A−2 | A−1 | A+0 |

Depois de 4 pontos, cada bloco completo adicional de 4 pontos aumenta o NH relativo em +1.

Pontos intermediários permanecem contabilizados, mas não elevam o NH antes do próximo patamar.

## Entradas bloqueadas

- atributo-base não declarado;
- dificuldade ausente ou não suportada;
- zero pontos, pois não existe nível treinado;
- pontos fracionários ou não finitos;
- nível do atributo-base ausente ou não finito.

Estruturas já inválidas para `validateSkill`, como pontos negativos finitos, permanecem erros estruturais.

## Invariantes preservadas

1. O motor calcula; o schema apenas declara.
2. `Character.skills` permanece a fonte persistente.
3. NH calculado não é persistido como segunda autoridade.
4. O Point Ledger permanece a autoridade contábil dos pontos declarados.
5. Valores importados não substituem o cálculo.
6. A aplicação não replica fórmulas.
7. A UI não calcula nem converte rótulos em códigos mecânicos.
8. Defaults, Techniques e modificadores continuam fechados.
9. O resolvedor não lê o `Character` inteiro.
10. A resolução é determinística para entradas iguais.

## Fora de escopo

- defaults por atributo ou Skill;
- escolha entre nível treinado e default;
- ciclos de defaults;
- Techniques e limites;
- modificadores externos;
- read model da aplicação;
- contribuição ao Point Ledger;
- eliminação do fallback legado `resolvedByName` do importador.

## Próximo passo

Introduzir um contrato canônico e portátil de candidato de default já resolvido por identidade. O contrato não interpretará diretamente os arrays opacos preservados pelo importador e não aceitará associação por nome.
