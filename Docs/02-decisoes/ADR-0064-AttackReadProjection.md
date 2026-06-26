# ADR-0064 — Projeção portátil de leitura para Attacks

**Status:** Proposto  
**Data:** 2026-06-26  
**Decisão:** APP-ATTACK-1.1

## Contexto

DOM-ATTACK-1.1 integra a coleção canônica de ataques ao `Character`. APP-ATTACK-1.0 oferece comandos estruturais por meio do App Core. Consumidores de leitura ainda não possuem uma fronteira específica, versionada e destacada para acessar os ataques sem depender do objeto inteiro do agregado.

A Alpha precisa expor os dados declarados de ataques futuramente ao `ApplicationReadModel` e à UI, sem calcular combate e sem permitir que consumidores mutem o `Character`.

## Decisão

Criar `src/application/projections/AttackReadProjection.js` com schema version 1:

```js
{
  schemaVersion: 1,
  characterId,
  attacks
}
```

A criação recebe um `Character` canônico validado. A coleção é obtida exclusivamente por `serializeAttacks` e permanece na ordem declarada.

## Dados preservados

A projeção conserva todos os campos canônicos de cada entrada:

- `id` e `externalIds`;
- `name` e `category`;
- `skillId`;
- `source`;
- `damage` com autoridade `declared`;
- `reach` e `range`;
- `notes`;
- `importMeta`;
- `raw`.

Não são acrescentados resultados mecânicos ou cópias de Skills, Equipment, Traits, Spells ou Powers.

## Portabilidade

A projeção deve:

- ser profundamente congelada;
- ser destacável por serialização própria;
- aceitar somente objetos simples, arrays densos e valores finitos;
- rejeitar ciclos, símbolos, propriedades não enumeráveis e propriedades extras;
- preservar números finitos sem conversão textual, inclusive `-0`;
- validar novamente a coleção por `validateAttacks`.

O helper portátil do Engine não é reutilizado porque ele rejeita `-0`, enquanto o contrato canônico de Attacks admite qualquer número finito dentro de dados portáteis importados.

## Autoridades

- Attacks continua sendo a autoridade do schema da entrada;
- Character continua sendo o Aggregate Root;
- AttackReadProjection apenas projeta e protege um snapshot de leitura;
- ApplicationReadModel não é alterado nesta decisão;
- UI e bootstrap permanecem fora de escopo.

## Consequências

- consumidores podem ler ataques por uma fronteira estável e versionada;
- a ordem e a proveniência importada são preservadas;
- mudanças produzidas pelos comandos APP-ATTACK 1.0 aparecem naturalmente na projeção seguinte;
- a futura integração ao `ApplicationReadModel` pode ocorrer sem redefinir o schema de Attacks;
- nenhum cálculo de combate é antecipado.

## Fora de escopo

- anexar a projeção ao `ApplicationReadModel`;
- registrar projeção global ou singleton;
- resolver `skillId` ou `source.id`;
- calcular NH, dano, alcance, precisão, Aparar ou defesa;
- alterar UI ou persistência;
- criar ataques derivados automaticamente.
