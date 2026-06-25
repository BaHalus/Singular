# DOM-PWR 1.0 — ADR inicial de Powers

## Status

Proposto.

## Contexto

O domínio estrutural de `Spells` foi fechado antes desta frente. A próxima etapa arquitetural é registrar a autoridade inicial de `Powers` sem reabrir domínios fechados e sem antecipar cálculo de regras GURPS.

`Powers` representa a organização persistente de poderes, fontes e agrupamentos que conectam habilidades já modeladas como `Traits` canônicos. Ele não substitui `Traits`, não duplica custos e não calcula efeitos.

## Decisão

- `Powers` será um agregado persistente próprio.
- Cada poder poderá referenciar `Traits` canônicos por identificador estável.
- A autoridade de custo, modificadores, pré-requisitos, ataques derivados e efeitos permanece fora de `Powers` nesta etapa.
- `Powers` pode declarar metadados estruturais, como nome, fonte, notas, tags e referências externas.
- A integração com `Character` deve ocorrer em etapa posterior própria.

## Limites

- Não criar pipeline paralelo de vantagens, habilidades ou ataques.
- Não duplicar a estrutura interna de `Traits` dentro de `Powers`.
- Não calcular custo, NH, dano, defesa, ativação, manutenção ou efeitos no domínio estrutural.
- Não alterar `Spells`, `Techniques`, `Skills` ou `Traits` sem ADR específico.

## Arquitetura

- O motor calcula.
- O schema declara.
- A aplicação orquestra.
- A UI não calcula.

## Próximo passo seguro

Implementar uma primeira unidade estrutural pequena para `Powers`, limitada ao agregado e à validação básica da coleção, preservando referências por ID para `Traits` canônicos.
