# ADR-0055 — Mecânica de Skills no Application Read Model

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** APP-CORE-1.1 / APP-SKILL-1.6

## Contexto

A aplicação já possui:

- `ApplicationReadModel`, que reúne sessão, Character e Point Ledger;
- `SkillMechanicsReadProjection`, que projeta um relatório global mecânico já calculado, sem nomes editoriais e sem acesso ao Character.

Falta permitir que consumidores recebam essas duas perspectivas por um único contrato de leitura sem obrigar o `ApplicationReadModel` a interpretar defaults, construir planos ou recalcular regras.

## Decisão

`ApplicationReadModel` evolui para schema version 2 e passa a conter:

```js
{
  schemaVersion: 2,
  session,
  character,
  pointLedger,
  skillMechanics
}
```

`skillMechanics` aceita:

- uma `SkillMechanicsReadProjection` já validada; ou
- `null`, quando a aplicação ainda não possui candidatos canônicos suficientes para produzir a mecânica.

A criação usa contrato explícito:

```js
createApplicationReadModel(session, {
  skillMechanics
})
```

A ausência da opção produz `skillMechanics: null`.

## Responsabilidades

O `ApplicationReadModel`:

- valida a sessão;
- serializa o Character;
- consome o Point Ledger soberano;
- valida e serializa a projeção mecânica recebida;
- exige que `skillMechanics.characterId` corresponda ao Character atual;
- produz snapshot destacado e profundamente imutável.

O `ApplicationReadModel` não:

- cria `SkillDefaultCandidate`;
- interpreta `Skill.defaults`;
- executa o plano global;
- calcula NH;
- combina resultados por nome;
- altera a projeção mobile diretamente.

## Motivo do campo anulável

O Character ainda preserva defaults externos como payloads opacos. Até existir um adapter canônico, a aplicação não pode fabricar candidatos mecânicos por heurística.

`null` representa ausência explícita de projeção mecânica, não falha e não fallback para valores importados.

## Evolução de schema

A versão sobe de 1 para 2 porque o contrato serializado recebe um novo campo obrigatório, mesmo quando seu valor é `null`.

Não haverá compatibilidade automática com snapshots ad hoc de read model v1. O read model é derivado e deve ser reconstruído a partir da sessão e das projeções atuais.

## Fronteiras

- O Character permanece fonte editorial e persistente.
- O Point Ledger permanece fonte contábil.
- `SkillMechanicsReadProjection` permanece fonte mecânica derivada.
- O `ApplicationReadModel` apenas compõe essas fontes.
- A UI apresenta o contrato e não recalcula.

## Invariantes

1. Existe um único `ApplicationReadModel` canônico.
2. `skillMechanics` é `null` ou uma projeção validada.
3. A projeção mecânica precisa pertencer ao mesmo Character.
4. O read model nunca gera candidatos de default.
5. O read model nunca executa fórmulas de Skills ou Techniques.
6. A serialização é destacada das entradas.
7. O resultado é profundamente imutável.
8. A ausência de mecânica não autoriza uso de `importedLevel` como substituto.

## Fora de escopo

- adapter de defaults externos;
- criação automática do plano global a partir de uma sessão;
- integração visual da seção mobile de Skills e Techniques;
- modificadores externos;
- persistência do read model;
- atualização incremental da projeção.
