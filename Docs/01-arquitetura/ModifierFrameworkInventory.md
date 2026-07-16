# Inventário MF1 — cálculos e consumidores de modificadores

## Escopo

Este inventário descreve a `main` em
`2ff9316f4b9f417cff04bb0cd567174df8da1676`. MF1 declara o contrato
canônico; não substitui os cálculos existentes e não implementa Construction
Engine nem Pricing Engine completos.

## Traços

| Responsabilidade atual | Arquivo primário | Observação |
|---|---|---|
| Campos e persistência do traço | `src/domain/character/TraitFields.js` | Guarda modificadores e vínculos de Habilidades Alternativas. |
| Normalização de modificadores percentuais | `src/domain/character/TraitModifiers.js` | Aceita o contrato percentual canônico e preserva payloads portáteis legados. |
| Custo base e níveis | `src/domain/character/TraitBaseCost.js` | Produz a base usada pelo cálculo de modificadores. |
| Construção do custo | `src/domain/character/TraitModifierCost.js` | Já executa adição, multiplicador/divisor próprio e percentual em estágios separados. |
| Multiplicadores de autocontrole/frequência e arredondamento final | `src/domain/character/TraitFinalCost.js` | Mistura hoje o término da construção com regras posteriores ao cálculo de modificadores. |
| Habilidades Alternativas | `src/domain/character/TraitAlternativeGroups.js` | Seleciona principal, aplica fator 1/5 às alternativas e arredonda no grupo. |
| Modificador global de Poder | `src/domain/character/PowerTraitModifierIntegration.js` | Projeta modificador externo percentual para o custo do traço. |
| Autoridade e projeção do custo | `TraitCostAuthorityAnalysis.js`, `TraitCostSourceProjection.js` | Consumidores de leitura do resultado vigente. |
| Biblioteca portátil | `src/library/TraitModifierLibraryAdapter.js` | Roundtrip de modificadores sem recalcular custo. |
| Aplicação/UI | `src/application/traits`, `src/application/projections`, `src/ui/mobile` | Orquestra e apresenta; não deve calcular. |
| Persistência | `src/infrastructure/persistence/browser` | Guarda snapshots e deve permanecer compatível/versionado. |

### Divergências e lacunas de Traços

- O pipeline intrínseco já possui a ordem aditivo → fator próprio →
  percentual, mas os nomes públicos ainda são específicos de Traços.
- `TraitFinalCost` e `TraitAlternativeGroups` expõem resultados diferentes;
  não há um breakdown único que preserve `normalCost`, bases intermediárias
  de pricing e `paidCost`.
- Habilidades Alternativas possuem arredondamento local, mas Uso Único e
  Ativação por Ponto de Personagem ainda não possuem um contrato canônico
  comum.
- A seleção da principal precisa consumir explicitamente a base já reduzida
  por Uso Único/Ativação por CP quando esses mecanismos existirem.
- O arredondamento atual de custo final não pode virar um arredondador
  estrutural global.

## Equipamentos

| Responsabilidade atual | Arquivo primário | Observação |
|---|---|---|
| Schema de modificadores | `src/domain/character/EquipmentModifiers.js` | Declara adição, multiplicador e percentual para custo monetário/peso. |
| Vínculo de modificadores ao item | `src/domain/character/Equipment.js`, `EquipmentOperations.js` | Mantém árvore e estado do item. |
| Cálculo de custo/peso | `src/engine/equipment/EquipmentTotalsResolver.js` | Aplica ajustes e produz breakdown por item. |
| Comandos | `src/domain/character/EquipmentModifierCommands.js` | Muta intenção no domínio. |
| Aplicação/UI | `src/application/equipment`, `src/application/projections`, `src/ui/mobile` | Orquestra e apresenta. |
| Persistência | `src/infrastructure/persistence/browser/EquipmentModifierSnapshotRoundtrip.test.js` | Prova roundtrip do contrato atual. |

### Divergências e limites de Equipamentos

- O resolver aplica ajustes na ordem linear armazenada. A futura migração deve
  provar paridade ao agrupá-los nas fases canônicas de construção.
- Os alvos são `baseCost` e `baseWeight`, não pontos de personagem.
- Habilidades Alternativas, Uso Único e Ativação por Ponto de Personagem são
  inválidos para Equipamentos.
- A reutilização permitida é o modelo de construção e breakdown; dimensões de
  dinheiro, peso, árvore e features permanecem próprias.

## Duplicações a remover somente após migração comprovada

1. enums e validações semelhantes de adição, fator e percentual;
2. implementações distintas de breakdown e diagnóstico;
3. políticas locais de portabilidade, congelamento e versão;
4. nomenclatura específica que impede consumidores futuros de usar uma API
   pública única.

Nenhuma dessas implementações deve ser apagada em MF1. MF2/MF3 implementam os
motores, MF6 publica o entrypoint único e apenas MF4/MF5 migram consumidores e
removem duplicação após regressões de paridade.

## Contrato MF1

`src/domain/modifiers/ModifierFrameworkModel.js` declara:

- versão 1 e política de rejeição de versões desconhecidas;
- fases canônicas de Construction e Pricing;
- modificadores intrínsecos separados de regras estruturais de pagamento;
- pricing limitado a Traços;
- breakdown determinístico com sequência densa, origem, entrada, saída e
  mecanismo responsável pelo arredondamento;
- proibição de arredondamento estrutural no estágio de Construction;
- proibição de arredondador global.

## Consumidores futuros e ordem de migração

`MF1 → (MF2, MF3) → MF6 → (MF4, MF5) → MF7 → MF-FINAL`.

Modelos, Biblioteca 2.0 e Magia 2.0 permanecem bloqueados até
`MF-FINAL=DONE` e deverão consumir exclusivamente a API pública de MF6.
