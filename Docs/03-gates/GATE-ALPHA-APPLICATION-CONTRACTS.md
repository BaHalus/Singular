# Gate - ALPHA APPLICATION CONTRACTS

**Status:** Em validacao  
**Data:** 2026-06-27  
**Branch:** `feature/gate-alpha-application-contracts`

## Objetivo

Consolidar os contratos de aplicacao necessarios para a Alpha sem alterar UI mobile, persistencia concreta, bootstrap, composition roots ou dominios ja fechados.

## Etapas consolidadas

- APP-EQUIPMENT 1.0: comandos canonicos de Equipamentos;
- APP-EQUIPMENT 1.1: projecao portatil de Equipamentos com totais canonicos;
- APP-SPELL 1.0: comandos minimos de entrada manual de Magias;
- APP-SPELL 1.1: projecao portatil de Magias;
- APP-POWER 1.0: comandos estruturais de Powers reutilizando `PowersOperations`;
- APP-POWER 1.1: projecao portatil de Powers com referencias por ID e diagnosticos.

## Fronteiras confirmadas

- o motor calcula;
- o schema declara;
- a aplicacao orquestra;
- a UI apresenta e coleta entrada;
- a persistencia armazena snapshots;
- `ApplicationSession` permanece a sessao autoritativa;
- `CommandExecutor` controla revisao, atomicidade, historico, undo e redo;
- referencias entre agregados usam IDs, nunca nomes.

## Arquivos desta consolidacao

- `src/application/projections/AlphaApplicationContracts.test.js`
- `Docs/03-gates/GATE-ALPHA-APPLICATION-CONTRACTS.md`

## Criterios

- [x] uma unica PR propria aberta por vez;
- [x] APP-EQUIPMENT 1.0 e APP-EQUIPMENT 1.1 integradas antes de Magias;
- [x] APP-SPELL 1.0 e APP-SPELL 1.1 integradas antes de Powers;
- [x] APP-POWER 1.0 e APP-POWER 1.1 integradas antes deste gate;
- [x] teste consolidado cobre roundtrip JSON das projecoes de Attacks, Equipment, Spells e Powers;
- [x] teste consolidado confirma destacamento de snapshots e referencias por ID;
- [x] sem UI mobile;
- [x] sem `ApplicationReadModel` compartilhado;
- [x] sem bootstrap, composition root ou persistencia concreta;
- [x] sem importadores amplos, bibliotecas visuais, temas, impressao ou nuvem;
- [ ] CI integral verde no head da PR;
- [ ] revisao sem bloqueio;
- [ ] merge serializado.

## Coordenacao

Este gate parte da `main` apos a integracao de APP-POWER 1.1. As alteracoes ficam restritas a teste de aplicacao e gate documental, evitando arquivos compartilhados de alto risco e a frente UI mobile.
