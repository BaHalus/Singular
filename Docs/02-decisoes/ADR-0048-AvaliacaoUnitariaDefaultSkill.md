# ADR-0048 — Avaliação unitária de default de Skill

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-SKILL-1.7

## Contexto

A ADR-0047 introduziu `SkillDefaultCandidate` como contrato canônico para defaults já resolvidos por identidade. O próximo passo seguro é avaliar um candidato isolado, sem escolher entre múltiplos defaults, sem consultar o `Character` inteiro e sem encadear defaults.

## Decisão

O motor passa a expor uma função pura de avaliação unitária de candidato de default.

A função recebe:

- um `SkillDefaultCandidate` validado estruturalmente;
- o nível explícito da fonte do default;
- o nível explícito do atributo-base da Skill-alvo.

A função produz `SkillMechanicsResult` com `basis.kind = "default"`.

## Regras

- O nível absoluto do default é `sourceLevel + modifier`.
- O `relativeLevel` é calculado contra o atributo-base explícito da Skill-alvo.
- Fonte por atributo usa `basis.attribute` e `basis.sourceId = null`.
- Fonte por Skill usa `basis.sourceId` e `basis.attribute = null`.
- `sourceLevel` e `targetAttributeLevel` são entradas explícitas; o resolvedor não busca valores em `Character`.
- Resultados e diagnósticos permanecem JSON-portáteis.
- `-0` é normalizado para `0` antes de entrar no resultado ou em diagnósticos.
- Overflow aritmético bloqueia a resolução em vez de produzir resultado não portátil.

## Fronteiras

Esta etapa não escolhe o melhor default, não compara default com nível treinado, não resolve dependências por grafo e não decide se uma Skill-fonte é realmente treinada ou conhecida apenas por outro default.

Essas decisões pertencem a uma etapa posterior de resolução de grafo, que deverá ter contrato próprio.

## Fora de escopo

- interpretar payloads externos do GCS;
- resolver candidatos por nome;
- selecionar entre candidatos concorrentes;
- detectar ciclos indiretos;
- encadear defaults;
- comparar nível treinado contra default;
- alterar importadores, aplicação, Point Ledger ou UI.

## Invariantes

1. O motor calcula; o schema declara.
2. O resolvedor recebe identidade e níveis explícitos.
3. A avaliação unitária é determinística para entradas iguais.
4. Nenhum nome editorial possui autoridade mecânica.
5. Nenhum cálculo é deslocado para aplicação ou UI.
6. A próxima etapa de grafo deverá distinguir nível realmente aprendido de nível obtido apenas por default.
