# ADR-0069 - SpellReadProjection

## Status

Aprovada para APP-SPELL 1.1.

## Contexto

A Alpha precisa consumir Magias em forma portatil de leitura, sem UI e sem calculo. APP-SPELL 1.0 entregou comandos estruturais minimos; esta etapa expoe os campos canonicos declarados de Spells para consumo de aplicacao.

## Decisao

Criar `SpellReadProjection` em `src/application/projections/SpellReadProjection.js` como projecao isolada de aplicacao.

A projecao contem somente:

- `schemaVersion`;
- `characterId`;
- `spells` serializado por `serializeSpells`.

## Ausencia de calculo

A projecao nao calcula NH, nivel relativo, custo, duracao, resistencia, pre-requisitos, ataques ou efeitos. Ela apenas transporta os valores ja declarados e validados pelo dominio.

## Consequencias

- consumidores da Alpha recebem uma estrutura congelada, serializavel e destacada do Character vivo;
- nao ha alteracao de UI mobile, bootstrap, persistencia concreta ou `ApplicationReadModel` compartilhado;
- a integracao opcional ao `ApplicationReadModel` deve ser pequena e posterior, apenas quando nao houver concorrencia em arquivos compartilhados;
- valores importados e estruturas ricas permanecem dados declarados, nao resultados recalculados.