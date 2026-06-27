# ADR-0071 - PowerReadProjection

## Status

Aprovada para APP-POWER 1.1.

## Contexto

A Alpha precisa consumir Powers em forma portatil de leitura, sem UI e sem calculo. APP-POWER 1.0 entregou comandos estruturais reutilizando `PowersOperations`; esta etapa expoe os campos canonicos declarados de Powers para consumo de aplicacao.

## Decisao

Criar `PowerReadProjection` em `src/application/projections/PowerReadProjection.js` como projecao isolada de aplicacao.

A projecao contem somente:

- `schemaVersion`;
- `characterId`;
- `powers` serializado por `serializePowers`;
- `references`, com `talentTraitId` e `memberTraitIds` por `powerId`;
- `diagnostics`, com avisos portateis sobre dados declarativos incompletos relevantes para a Alpha.

## Ausencia de calculo

A projecao nao calcula custo, habilidades, efeitos, talento, modificador, origem mecanica, ataques ou relacionamento por nome. Ela apenas transporta valores ja declarados e validados pelo dominio e emite diagnosticos de leitura sem alterar o Character.

## Fronteiras

- `Character` permanece o Aggregate Root;
- Powers declara e valida a estrutura canonica;
- referencias entre Powers e Traits permanecem por IDs;
- `ApplicationReadModel` compartilhado nao e alterado nesta PR;
- UI mobile, bootstrap, persistencia concreta, bibliotecas e importadores ficam fora do escopo.

## Consequencias

Consumidores da Alpha recebem uma estrutura congelada, serializavel e destacada do Character vivo. A integracao opcional ao `ApplicationReadModel` deve ser posterior, pequena e serializada com a frente UI mobile.
