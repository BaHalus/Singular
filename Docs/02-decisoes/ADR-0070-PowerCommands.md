# ADR-0070 - Comandos de aplicacao para Powers

## Status

Aprovada para APP-POWER 1.0.

## Contexto

A Alpha precisa de comandos estruturais para Powers sem UI e sem recalculo. O dominio ja possui `PowersOperations`, que deve permanecer a autoridade das alteracoes estruturais do agregado.

## Decisao

Criar `PowerCommandHandlers` em `src/application/powers/PowerCommandHandlers.js` reutilizando `PowersOperations` para adicionar, remover, renomear, alterar fonte, modificador, talento, notas, membros e tags.

## Autoridades

- Powers declara e valida a estrutura canonica;
- PowersOperations altera Powers;
- Character permanece o Aggregate Root;
- CommandExecutor controla revisao, atomicidade, historico, undo e redo;
- referencias usam IDs de Trait, nunca nomes.

## Fora de escopo

Projecao portatil, UI mobile, bootstrap, persistencia concreta, calculo de custo, calculo de habilidades, efeitos, bibliotecas e importadores.