# ADR-0057 — Operações transitórias de Pools

**Status:** Aceito  
**Data:** 2026-06-26  
**Decisão:** DOM-POOL-1.1

## Contexto

A ficha mobile precisa permitir alterações diretas nos valores atuais de PV, PF e reservas opcionais. O agregado `Pools` já armazena `current` e `maximum`, e `PoolsOperations` já oferece operações imutáveis básicas, mas ainda não possui um contrato explícito para ajustes incrementais e restauração do valor atual.

A interface não pode interpretar dano, cura, fadiga, recuperação ou limites mecânicos. Essas regras pertencem a módulos de regras futuros.

## Decisão

`PoolsOperations` permanece a autoridade de domínio para alterações estruturais e transitórias de pools.

São certificados os seguintes comportamentos:

- `setPoolCurrent`: define diretamente o valor atual;
- `adjustPoolCurrent`: soma um delta ao valor atual conhecido;
- `setPoolMaximum`: define diretamente a capacidade máxima;
- `resetPoolCurrentToMaximum`: copia a capacidade máxima conhecida para o valor atual;
- `addPool`: acrescenta um pool opcional ou importado;
- `removePool`: remove somente pools não obrigatórios;
- `validateOperationalPools`: valida a estrutura operacional antes de qualquer alteração.

Todas as operações são puras e não modificam o objeto recebido.

## Valores permitidos

`current` e `maximum` aceitam:

- número finito;
- `null`, representando valor ainda desconhecido.

`NaN`, `Infinity`, `-Infinity` e valores não numéricos são rejeitados. `-0` é normalizado para `0` nas alterações.

## Ausência de regras mecânicas

As operações não:

- limitam `current` a `maximum`;
- impedem valores atuais negativos;
- calculam morte, inconsciência ou exaustão;
- distinguem dano de cura;
- distinguem gasto de recuperação;
- recalculam máximos.

Um valor atual pode ficar abaixo de zero ou acima do máximo. A interpretação mecânica pertence a módulos de regras e projeções posteriores.

## Ajustes incrementais

`adjustPoolCurrent` exige:

1. pool existente;
2. valor atual conhecido e finito;
3. delta finito;
4. resultado finito.

A operação falha explicitamente quando o valor atual é `null` ou quando a soma ultrapassa a faixa numérica finita.

## Pools obrigatórios e opcionais

`HP` e `FP` são obrigatórios e não podem ser removidos.

`EnergyReserve` e pools importados adicionais podem ser acrescentados, alterados e removidos. Todo pool operacional deve possuir os campos `current` e `maximum`.

## Consequências

- A UI mobile pode implementar controles `+` e `−` sem calcular regras.
- A camada de aplicação pode futuramente encapsular essas operações em comandos sem duplicar lógica.
- Estados importados continuam preserváveis.
- Regras de dano, cura, fadiga e recuperação permanecem desacopladas.

## Fora de escopo

- comandos de aplicação;
- integração com `Character` além do agregado já existente;
- histórico, desfazer e refazer;
- regras de GURPS para PV e PF;
- persistência concreta;
- componentes visuais.
