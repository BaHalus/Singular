# ADR-0068 — Comandos de aplicação para Spells

**Status:** Aceito  
**Data:** 2026-06-26  
**Decisão:** APP-SPELL-1.0

## Contexto

A Alpha precisa de entrada manual mínima para Magias sem UI e sem cálculo. O domínio atual já declara e valida `Spells` em `Character`, mas não possui operações dedicadas equivalentes às operações de Equipment.

## Decisão

Criar handlers isolados em `src/application/spells/SpellCommandHandlers.js` para:

- adicionar magia com ID explícito;
- editar campos declarados por patch estrito;
- remover magia por ID;
- reordenar magia por índice.

Os handlers reidratam o `Character` canônico e são compostos externamente com o `CommandRegistry` e o `CommandExecutor` existentes.

## Identidade determinística

Toda magia incluída por comando deve declarar `id` não vazio. A aplicação não usa geração aleatória de IDs do domínio, porque comandos, recibos e histórico precisam preservar identidade estável.

## Ausência de cálculo

A aplicação não calcula NH, nível relativo, custo, duração, resistência, pré-requisitos, ataques ou efeitos. Campos como `castingCost`, `maintenanceCost`, `duration`, `resistance`, `importedLevel` e `calc` são apenas dados declarados quando o comando os fornece.

## Autoridades

- Spells declara e valida a estrutura canônica;
- Character permanece o Aggregate Root;
- CommandExecutor controla revisão, atomicidade, histórico, undo e redo;
- a aplicação apenas aplica intenções estruturais e reidrata o Character;
- UI, bootstrap, persistência concreta e projeções permanecem fora desta decisão.

## Fora de escopo

Projeção portátil de leitura, integração ao `ApplicationReadModel`, UI mobile, importadores de bibliotecas, cálculo de NH, magia ritualística avançada, feitiçaria, poderes, ataques derivados e validação de pré-requisitos.