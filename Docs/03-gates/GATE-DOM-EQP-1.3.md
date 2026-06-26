# Gate — DOM-EQP-1.3

**Status:** Aprovado  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Equipamentos MVP  
**Branch:** `feature/dom-equipment-mvp-1.0`  
**Base validada:** `main` em `d111b1ba5c05de64149f68a1feff0a18c2060211`

## Objetivo

Certificar a fatia mínima de Equipamentos da Alpha de julho de 2026, reutilizando o agregado existente e sem criar schema paralelo.

## Arquivos desta frente

- `src/domain/character/Equipment.js`
- `src/domain/character/EquipmentOperations.js`
- `src/domain/character/EquipmentPortableValue.js`
- `src/domain/character/EquipmentTotals.js`
- `src/domain/character/EquipmentMvp.test.js`
- `Docs/01-arquitetura/Equipment.md`
- `Docs/03-gates/GATE-DOM-EQP-1.3.md`

Nenhum arquivo compartilhado da aplicação, schema central ou UI foi alterado.

## Critérios de aceite

- [x] O agregado existente foi reutilizado.
- [x] Não há schema paralelo.
- [x] `Character.js` não foi alterado.
- [x] App Core, UI, persistência e Library core não foram alterados.
- [x] Outros domínios da ficha não foram alterados.
- [x] IDs são não vazios e únicos em toda a árvore.
- [x] Quantidade, peso, custo, usos e máximos rejeitam valores inválidos.
- [x] Arrays portáteis precisam ser densos.
- [x] Snapshots rejeitam valores não JSON portáteis.
- [x] A criação preserva os contratos legados de referência.
- [x] A serialização é profunda e independente.
- [x] Somente recipientes podem possuir filhos.
- [x] Destinos de movimentação são validados.
- [x] Movimentação não pode criar ciclo.
- [x] Totais consideram quantidade e valores unitários.
- [x] Totais percorrem itens aninhados deterministicamente.
- [x] A frente principal foi integrada antes desta atualização.
- [x] A branch foi atualizada sobre a `main` vigente.
- [x] A suíte completa passou na CI após a atualização.
- [x] Não existe revisão ou thread bloqueante.

## Evidência

GitHub Actions, workflow `Tests`, execução `28243473615`:

- job `test` concluído com sucesso;
- suíte completa concluída com sucesso;
- nenhuma falha de infraestrutura ou teste.

## Fora de escopo certificado

Este gate não certifica regras completas de carga, capacidade de recipientes, catálogo, interface, persistência concreta ou integração nova com arquivos compartilhados.

## Resultado

**DOM-EQP-1.3 aprovado para integração sequencial**, condicionado apenas à confirmação final de que a `main` não avançou antes do merge e à CI verde do commit documental de fechamento.
