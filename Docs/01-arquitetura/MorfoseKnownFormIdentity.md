# Identidade e idempotência do catálogo de Morfose

**Código:** DOM-MORPH-1.3.1  
**Status:** Implementado  
**Camada:** Domain  
**Decisão:** ADR-0024

Este bloco fecha os critérios de identidade e idempotência do catálogo criado em DOM-MORPH-1.3. Ele não cria outro catálogo, outro resolver de vantagem, outro planner ou outro executor.

## Autoridade de estado

```text
AlternateFormSet.morphProfile.knownForms
```

continua sendo a única autoridade persistente do repertório.

`catalogHistory` continua sendo uma trilha append-only de evidências e operações, sem event sourcing.

## Precedência de identidade

A resolução usa somente evidências exatas:

```text
knownFormId explícito
→ templateId exato
→ externalId exato
→ nenhuma associação
```

Nome não participa da identidade.

Um `knownFormId` que não existe não impede a queda controlada para `templateId` ou `externalId`. Quando sinais exatos apontam para entradas diferentes, a operação é bloqueada como conflito. Quando um mesmo external ID aparece em mais de uma entrada, a operação é bloqueada como ambígua.

## Resultado da resolução

```js
{
  status: "new" | "matched" | "ambiguous" | "conflict",
  matchedKnownFormId,
  matchedBy: "knownFormId" | "templateId" | "externalIds" | null,
  signals,
  reasons
}
```

A resolução integra a análise e o plano da operação. Ela é reavaliada antes da execução e protegida pelo fingerprint do catálogo.

## Reaquisição idempotente

Adquirir, importar, observar ou memorizar novamente uma identidade inequívoca:

- reutiliza o ID canônico existente;
- não cria uma segunda entrada;
- acrescenta external IDs não conflitantes;
- une tags e notas;
- atualiza instantes de observação e memorização;
- preserva o método de aquisição original;
- registra a nova evidência no histórico;
- não materializa, ativa ou incorpora nada automaticamente.

O histórico preserva:

```js
{
  reused,
  identityResolution,
  previousKnownForm,
  incomingKnownForm,
  knownForm
}
```

Assim, dados novos e anteriores continuam auditáveis mesmo quando o registro canônico mantém uma representação compacta.

## Conflitos de evidência

Uma entrada já vinculada não aceita silenciosamente:

- outro `templateId` não nulo;
- outro valor para a mesma origem em `externalIds`;
- sinais exatos que apontem para entradas diferentes;
- IDs explícitos contraditórios no mesmo comando.

A falha ocorre na análise e não altera o `Character`.

## Capacidade

Sob política limitada, a ocupação é do repertório retido, não do método de aquisição:

```text
available   → ocupa
unavailable → ocupa
forgotten   → não ocupa
```

Entradas manuais, importadas, observadas e memorizadas ocupam igualmente enquanto retidas.

Reaquisição de uma entrada já retida exige `0` espaços adicionais. Reaquisição de uma entrada `forgotten` exige `1` espaço e pode exigir substituição explícita quando a capacidade estiver cheia.

`acquire-form` obedece à capacidade limitada conhecida. Quando uma aquisição manual ou importada acrescenta ocupação e excederia o repertório, o plano permanece pendente até receber `replacementKnownFormId`. A substituição ocorre atomicamente e é registrada como `form-replaced`. Uma substituição também é recusada quando há espaço livre ou quando a aquisição reutiliza uma entrada já retida.

## Isolamento

A operação afeta apenas o conjunto de Morfose identificado por `formSetId`.

Ela não altera:

- outros conjuntos de Morfose;
- conjuntos de Forma Alternativa;
- `Character.templates`;
- `AlternateFormSet.forms`;
- `activeFormId`;
- o estado atual do personagem.

## APIs

```js
resolveMorphKnownFormIdentity(set, candidate, hints)
mergeMorphKnownFormEvidence(existing, incoming, context)
findMorphKnownFormsByExternalId(set, source, value)
morphKnownFormOccupancyDelta(set, identityResolution)
```

As operações públicas de DOM-MORPH-1.3 consomem essas funções sem mudar seus nomes ou sua responsabilidade externa.

## Não responsabilidades

DOM-MORPH-1.3.1 não:

- vincula por nome;
- cria template vazio;
- improvisa forma;
- aplica limite de pontos;
- materializa ou ativa forma;
- incorpora template;
- escolhe substituição automaticamente;
- altera o subsistema de Forma Alternativa.
