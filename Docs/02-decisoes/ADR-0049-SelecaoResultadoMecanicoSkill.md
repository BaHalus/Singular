# ADR-0049 — Seleção de resultado mecânico de Skill

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-SKILL-1.8

## Contexto

As etapas anteriores passaram a produzir `SkillMechanicsResult` para progressão treinada e para avaliação unitária de defaults. Ainda falta uma fronteira explícita para escolher qual resultado mecânico representa o nível efetivo de uma Skill quando existem resultados concorrentes.

A escolha precisa permanecer no motor. A aplicação apenas fornece resultados já calculados; a UI apenas apresenta o resultado escolhido e os diagnósticos.

## Decisão

O motor passa a expor uma função pura de seleção de resultado mecânico de Skill.

A função recebe:

- um resultado treinado opcional;
- uma lista de resultados de default já avaliados.

A função produz um `SkillMechanicsResult` único para a Skill-alvo.

## Regras

- A função não calcula níveis; ela só compara resultados mecânicos já emitidos.
- Somente resultados com `status = "resolved"` participam da escolha de nível.
- O maior `level` vence.
- Em empate de nível, resultado treinado vence sobre default.
- Em empate entre defaults, a ordem de entrada vence para manter determinismo.
- Resultados bloqueados não vencem um resultado resolvido.
- Se todos os resultados estiverem bloqueados, a saída fica bloqueada e agrega diagnósticos dos resultados recebidos.
- A saída preserva `basis`, `level`, `relativeLevel` e `appliedModifierIds` do vencedor.
- Diagnósticos de warning/info do vencedor são preservados.
- Diagnósticos bloqueantes de candidatos perdedores são agregados como contexto quando não houver vencedor.

## Fronteiras

Esta etapa não resolve candidatos por nome, não busca atributos no `Character`, não decide se uma Skill-fonte foi aprendida ou obtida por default e não percorre grafo de dependências.

A resolução de grafo continua pertencendo a etapa posterior própria.

## Fora de escopo

- interpretar payloads externos do GCS;
- encadear defaults;
- detectar ciclos indiretos;
- resolver identidade de Skill-fonte;
- alterar importadores, aplicação, Point Ledger ou UI.

## Invariantes

1. O motor calcula e escolhe.
2. O schema declara contratos.
3. A aplicação orquestra entradas já resolvidas.
4. A UI não calcula nem escolhe nível efetivo.
5. A seleção é determinística para entradas iguais.
6. Nenhum nome editorial possui autoridade mecânica.
