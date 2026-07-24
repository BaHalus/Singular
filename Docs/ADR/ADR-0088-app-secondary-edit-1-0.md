# ADR-0066 — APP-SECONDARY-EDIT 1.0

## Status
Aceita.

## Contexto
A Alpha mobile já possui edição operacional de PV/PF atuais e leitura de secundários, mas a frente estrutural precisa de contratos de aplicação para declarações editáveis em modo Criação.

A aplicação não deve calcular PV/PF máximos, Vontade, Percepção, Velocidade Básica, Deslocamento, Esquiva ou qualquer derivado GURPS. Quando houver autoridade declarativa no domínio, a aplicação pode transportar o valor. Quando não houver autoridade canônica, a lacuna deve ser registrada em vez de inventar fórmula.

## Decisão
Criar operações puras para `secondaryCharacteristics`:

- `setSecondaryCharacteristicBase`;
- `setSecondaryCharacteristicOverride`;
- `clearSecondaryCharacteristicOverride`;
- `findSecondaryCharacteristic`.

Criar handlers de aplicação isolados compatíveis com `CommandExecutor`:

- `secondary.base.set`;
- `secondary.override.set`;
- `secondary.override.clear`;
- `pool.maximum.set`.

`pool.maximum.set` cobre somente `HP` e `FP` como declarações estruturais de máximos. Ele preserva o valor atual e não substitui os comandos transitórios de PV/PF atuais.

## Autoridade canônica

- PV máximo: `pools.HP.maximum`.
- PF máximo: `pools.FP.maximum`.
- Vontade: `secondaryCharacteristics.Will`.
- Percepção: `secondaryCharacteristics.Per`.
- Velocidade Básica: `secondaryCharacteristics.BasicSpeed`.
- Deslocamento: `secondaryCharacteristics.BasicMove`.

## Lacuna registrada
Esquiva ainda não possui autoridade declarativa portátil no `Character`. APP-SECONDARY-EDIT 1.0 não cria fórmula, não deriva de Velocidade Básica e não adiciona comando para Esquiva.

## Restrições
A aplicação não calcula:

- PV/PF máximos;
- Vontade;
- Percepção;
- Velocidade Básica;
- Deslocamento;
- Esquiva;
- custo em pontos;
- bônus por vantagem/desvantagem;
- qualquer derivado mecânico de GURPS.

Os handlers validam payloads, aplicam operações puras, recriam o `Character` pelo contrato canônico e devolvem recibos e diagnósticos.

## Consequências
A UI poderá consumir os comandos depois que o catálogo/composição da Alpha registrar os handlers. Até lá, os contratos permanecem isolados e testados.

APP-SECONDARY-EDIT 1.0 não altera UI mobile, bootstrap, persistência concreta, `CommandRegistry` ou composition roots.