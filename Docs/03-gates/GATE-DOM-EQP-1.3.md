# Gate — DOM-EQP-1.3

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Frente:** SINGULAR — Equipamentos MVP  
**Branch:** `feature/dom-equipment-mvp-1.0`  
**Base atualizada:** `main` em `46413a8596adc7df7e5fb8b261cab6e0a2c677af`

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
- [x] A branch foi atualizada sobre a `main` vigente observada.
- [ ] A suíte completa passa na CI após esta atualização.
- [ ] Não existe revisão bloqueante.

## Evidência anterior

Antes da atualização final da base, a suíte completa passou no GitHub Actions após a correção de compatibilidade com o contrato legado dos campos ricos.

A atualização para a `main` atual exige nova execução de CI, que é a autoridade para fechar este gate.

## Fora de escopo certificado

Este gate não certifica regras completas de carga, capacidade de recipientes, catálogo, interface, persistência concreta ou integração nova com arquivos compartilhados.

## Condição de fechamento

O gate muda para **Aprovado** somente quando:

1. a branch continuar atualizada sobre a `main` vigente;
2. a CI estiver verde nessa base;
3. não houver revisão bloqueante;
4. a PR estiver pronta para merge único e sequencial.
