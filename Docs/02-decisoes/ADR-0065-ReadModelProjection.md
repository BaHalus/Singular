# ADR-0065 — Projeção opcional de Attacks no ApplicationReadModel

**Status:** Aceito  
**Data:** 2026-06-26  
**Decisão:** APP-ATTACK-1.2

## Decisão

O `ApplicationReadModel` v2 aceita a opção independente `attackProjection`. Modelos novos emitem uma `AttackReadProjection` validada ou `null`. A projeção deve pertencer ao mesmo `Character` e é serializada como cópia destacada.

## Compatibilidade

Snapshots v2 anteriores sem `attackProjection` continuam válidos. O campo novo é aditivo; `skillMechanics` permanece independente e propriedades desconhecidas continuam rejeitadas.

## Autoridades

O read model não cria a projeção automaticamente, não resolve referências e não calcula combate. `AttackReadProjection` continua sendo a autoridade do snapshot específico; `Character` continua sendo o Aggregate Root.

## Fora de escopo

UI, bootstrap, persistência concreta, resolução de Skills, geração de dano, alcance, defesa ou qualquer regra de GURPS.
