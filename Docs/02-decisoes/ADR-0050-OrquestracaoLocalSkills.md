# ADR-0050 — Orquestração local da resolução de Skills

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** APP-SKILL-1.0

## Contexto

O motor já possui três autoridades separadas:

- `resolveTrainedSkill`, para progressão treinada;
- `resolveSkillDefaultCandidate`, para avaliar um default explícito;
- `selectSkillMechanicsResult`, para escolher o melhor resultado mecânico.

A camada de aplicação precisa de um caso de uso que coordene essas funções para uma única Skill sem copiar fórmulas nem acessar o `Character` inteiro.

## Decisão

Será criado `orchestrateSkillResolution` em `src/application/skills`.

A entrada contém:

```js
{
  skill,
  attributeLevel,
  defaultInputs: [
    {
      candidate,
      sourceLevel
    }
  ]
}
```

A saída é um relatório efêmero e imutável:

```js
{
  schemaVersion: 1,
  skillId,
  finalResult,
  trainedResult,
  defaultEvaluations: [
    {
      candidateId,
      result
    }
  ]
}
```

## Fluxo

1. validar a entrada estrutural;
2. calcular o resultado treinado pelo motor;
3. avaliar cada candidato de default pelo motor, na ordem recebida;
4. selecionar o resultado final pelo motor;
5. produzir relatório portátil, validado e imutável.

## Regras

- Cada candidato deve apontar para a mesma `skill.id` da resolução.
- IDs de candidatos não podem se repetir no mesmo relatório.
- A ordem de `defaultInputs` é preservada e participa do desempate já definido pela ADR-0049.
- Um default bloqueado permanece no relatório, mesmo quando o resultado treinado vence.
- O relatório não é persistido no `Character`.
- A validação do relatório recompõe a seleção final usando a autoridade do motor.

## Fronteiras

A aplicação apenas coordena entradas já explícitas. Ela não:

- interpreta payloads do GCS;
- resolve IDs externos;
- procura atributos no `Character`;
- resolve nomes;
- calcula fórmulas de NH;
- percorre grafos de dependência;
- encadeia defaults;
- detecta ciclos;
- aplica modificadores externos;
- altera Point Ledger ou UI.

## Invariantes

1. O motor continua sendo a única autoridade de cálculo e seleção.
2. A aplicação apenas orquestra chamadas do motor.
3. O schema declara o relatório efêmero.
4. A Skill e os candidatos recebidos não são alterados.
5. O relatório é portátil, determinístico e imutável.
6. Nenhum nome editorial possui autoridade mecânica.
7. O `Character` não recebe NH persistido.
