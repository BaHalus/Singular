# ADR-0016 — Planejamento de transições de forma

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

As regras de transição já declaram tempo, manobras, custos, testes, requisitos, gatilhos, impedimentos, duração e retorno.

Antes de executar uma transformação, a SINGULAR precisa responder de forma segura:

```text
A transição pode ocorrer agora?
O que ainda precisa ser resolvido?
Quais recursos seriam consumidos?
Quais fases e manobras são necessárias?
```

Essa verificação não pode modificar o personagem nem consumir recursos.

## Decisão

`FormTransitionPlanner` cria um plano imutável a partir do Character, do conjunto, da forma de destino e de um contexto externo.

```js
planFormTransition(character, formSetId, targetFormId, context)
```

O planner não executa a transformação.

## Estados do plano

```text
ready
pending
blocked
already-active
```

- `ready`: todas as condições conhecidas estão satisfeitas;
- `pending`: faltam resultados ou informações;
- `blocked`: há uma falha ou impedimento confirmado;
- `already-active`: a forma de destino já está ativa.

`allowed` é verdadeiro somente em `ready`.

## Fases

Uma entrada a partir da forma-base possui uma fase de ativação.

Um retorno à forma-base possui uma fase de desativação.

Uma troca entre duas formas alternativas possui:

```text
desativação da forma atual
+
ativação da forma de destino
```

Custos iguais nas duas fases são agregados antes da verificação de disponibilidade.

## Contexto

O contexto pode informar:

- intenção voluntária, involuntária ou automática;
- resultados de testes;
- requisitos satisfeitos ou não satisfeitos;
- gatilhos ativos ou inativos;
- impedimentos ativos ou inativos;
- valores externos de recursos;
- exigência de tempo conhecido.

Condições ausentes permanecem `unknown`. Testes ausentes permanecem `pending`.

## Recursos

O planner reconhece aliases de:

```text
HP / PV
FP / PF
EnergyReserve / Reserva de Energia / ER
```

A disponibilidade vem do contexto quando fornecida; caso contrário, vem de `Character.pools`.

O planner apenas verifica pagamento possível. Ele não desconta o recurso.

## Tempo

Quando `baseTimeSeconds` existe:

```text
tempo da fase = baseTimeSeconds × 2^timeStepsDelta
```

Sem tempo-base, o tempo permanece desconhecido.

Tempo desconhecido só impede `ready` quando o chamador declara:

```js
requireKnownTime: true
```

## Retorno

`planFormReturn` usa o alvo configurado na forma ativa ou a forma-base.

Regras de retorno são verificadas apenas quando a transição é realmente um retorno aplicável.

Uma troca direta entre formas alternativas não é bloqueada apenas porque a forma atual possui um alvo de retorno diferente.

## Bloqueios confirmados

Motivos que produzem `blocked`:

```text
insufficient-resource
failed-test
unmet-requirement
active-impediment
inactive-trigger
return-locked
invalid-return-target
```

Informações desconhecidas produzem `pending`, não uma decisão arbitrária.

## Consequências

### Positivas

- nenhuma tentativa inválida altera o Character;
- custos são verificados de forma agregada;
- trocas compostas são visíveis por fase;
- contexto incompleto é distinguido de falha real;
- retorno automático e bloqueado são planejáveis;
- o executor futuro recebe um plano explícito.

### Negativas

- o planner depende de contexto externo para fatos do mundo;
- ele não resolve rolagens;
- ele não avança tempo;
- ele não garante que o Character permaneceu inalterado entre planejamento e execução.

Esse último ponto será tratado pelo executor atômico.
