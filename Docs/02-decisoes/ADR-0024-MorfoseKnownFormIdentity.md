# ADR-0024 — Identidade e idempotência de formas conhecidas de Morfose

**Status:** Aprovado  
**Data:** 2026-06-20

## Contexto

DOM-MORPH-1.3 implementou aquisição, observação, memorização, substituição e histórico. O catálogo, porém, ainda tratava uma reaquisição exata como duplicata ou erro e não resolvia identidade por referências externas.

O critério de encerramento exige reutilização de uma entrada inequívoca, atualização de evidências, bloqueio de ambiguidades e ausência de associação por nome.

## Decisão

A identidade de uma forma conhecida será resolvida somente dentro do conjunto de Morfose alvo e na seguinte ordem:

```text
knownFormId explícito
→ templateId exato
→ par externalId exato
→ nova identidade
```

A precedência escolhe o sinal mais forte entre sinais concordantes. Ela não autoriza ignorar contradições. Sinais exatos que apontem para entradas diferentes bloqueiam a operação.

Nome, descrição, tags e semelhança textual não participam da identidade.

## Reutilização

Quando a resolução encontra uma única entrada:

- o ID existente permanece canônico;
- não é criada duplicata;
- external IDs não conflitantes são unidos;
- tags e notas são preservadas e unidas;
- timestamps de observação e memorização são atualizados;
- o método de aquisição original não é sobrescrito;
- a nova ocorrência é registrada em `catalogHistory`.

O histórico preserva o estado anterior, a evidência recebida e o resultado canônico. Não será criado um segundo registro de aquisição fora do histórico existente.

## Conflitos

A análise bloqueia:

- IDs explícitos contraditórios no mesmo comando;
- mais de uma entrada para o mesmo external ID exato;
- `templateId` e external ID apontando para entradas diferentes;
- tentativa de alterar um `templateId` já resolvido;
- tentativa de trocar o valor de uma mesma origem de external ID durante a fusão.

Falhas não alteram o agregado.

## Capacidade

Capacidade mede entradas retidas:

```text
state !== "forgotten"
```

`unavailable` continua ocupando espaço porque representa indisponibilidade transitória, não esquecimento. O método de aquisição não muda a ocupação.

Uma entrada já retida tem delta de ocupação `0`. Uma entrada nova ou esquecida tem delta `1`.

Aquisições manuais e importadas não podem ultrapassar silenciosamente uma capacidade limitada conhecida. Quando o delta excede o repertório, a análise exige `replacementKnownFormId`; a forma escolhida é esquecida e a aquisição é persistida na mesma operação atômica.

## Consequências

- reaquisição torna-se idempotente quanto à identidade do catálogo;
- importações podem enriquecer uma entrada sem duplicá-la;
- referências externas não resolvidas podem ser vinculadas posteriormente por igualdade exata;
- ambiguidades permanecem explícitas;
- nomes iguais continuam podendo representar formas distintas;
- nenhum template, materialização, ativação ou incorporação é criado automaticamente;
- múltiplos conjuntos continuam independentes;
- Forma Alternativa permanece intocada.
