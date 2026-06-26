# ADR-0066 — Comandos de aplicação para Equipment

**Status:** Proposto  
**Data:** 2026-06-26  
**Decisão:** APP-EQUIPMENT-1.0

## Decisão

Criar handlers isolados em `src/application/equipment/EquipmentCommandHandlers.js` para adicionar, renomear, alterar quantidade e estado, remover e mover itens ou conteúdos de recipientes.

Os handlers usam exclusivamente `EquipmentOperations`, reidratam o `Character` canônico e são compostos externamente com o `CommandRegistry` e o `CommandExecutor` existentes.

## Autoridades

- Equipment declara e valida o inventário;
- EquipmentOperations altera a árvore;
- Character permanece o Aggregate Root;
- CommandExecutor controla revisão, histórico e atomicidade;
- totais continuam sob autoridade do motor de Equipment;
- UI, bootstrap e persistência concreta permanecem fora desta decisão.

## Ausência de cálculo

A aplicação não soma quantidade, peso, custo ou carga. Estados e hierarquia são apenas intenções estruturais delegadas ao domínio.

## Fora de escopo

Projeção de totais, `ApplicationReadModel`, UI, catálogo, comércio, munição detalhada, ataques derivados e regras completas de carga.
