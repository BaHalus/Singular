# ADR-0067 — EquipmentReadProjection

## Status

Aprovada para APP-EQUIPMENT 1.1.

## Contexto

A Alpha precisa consumir Equipment em uma forma portátil de leitura, sem UI e sem cálculo paralelo. O domínio já possui o contrato canônico de Equipment, serialização portátil e totais determinísticos em `calculateEquipmentTotals`.

## Decisão

Criar `EquipmentReadProjection` em `src/application/projections/EquipmentReadProjection.js` como projeção isolada de aplicação.

A projeção contém somente:

- `schemaVersion`;
- `characterId`;
- `equipment` serializado por `serializeEquipment`;
- `totals` produzidos por `calculateEquipmentTotals`.

A aplicação apenas orquestra a projeção. A soma de quantidade, peso e custo continua sob autoridade do domínio de Equipment.

## Consequências

- consumidores da Alpha recebem uma estrutura congelada, serializável e destacada do Character vivo;
- não há alteração de UI mobile, bootstrap, persistência concreta ou `ApplicationReadModel` compartilhado nesta PR;
- a integração opcional ao `ApplicationReadModel` deve ser pequena e posterior, apenas quando não houver concorrência em arquivos compartilhados;
- a projeção não calcula carga, deslocamento, esquiva, combate, moeda ou efeitos de equipamento.
