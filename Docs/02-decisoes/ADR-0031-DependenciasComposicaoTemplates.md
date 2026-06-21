# ADR-0031 — Dependências e composição explicável de Templates

**Status:** Aprovado  
**Data:** 2026-06-20  
**Bloco:** DOM-TEMPLATE-1.2

## Contexto

DOM-TEMPLATE-1.0 tornou `entries` a autoridade soberana. DOM-TEMPLATE-1.1 passou a permitir declarações entre domínios e referências entre templates. Falta resolver o grafo formado por essas referências sem:

- aplicar templates ao personagem;
- interpretar payloads de atributos, traits, perícias ou equipamentos;
- criar ligação por nome;
- esconder dependências ausentes;
- escolher silenciosamente entre identidades externas ambíguas;
- quebrar ciclos arbitrariamente;
- perder a origem de contribuições compartilhadas.

## Decisão

### Grafo derivado

O grafo é reconstruído a partir de:

```text
Template.entries[entryType = templateReference]
```

Nenhuma lista de dependências paralela será persistida.

### Referências internas

`referenceScope: internal` usa correspondência exata com `Template.id`.

Ausência do ID produz:

```text
status: missing
severity: blocked
```

### Referências externas

`referenceScope: external` exige `externalKey` e compara:

```text
Template.externalIds[externalKey] === referenceId
```

Resultados:

```text
nenhum candidato → pending
um candidato     → resolved
vários candidatos → blocked
```

O resolver não usa nome, tipo, posição ou heurística para desempatar.

### Ordem

A composição usa travessia determinística, com dependências antes dos dependentes.

A ordem é governada por:

1. raízes declaradas;
2. ordem das referências em `entries`;
3. primeira visita de cada identidade.

Não existe ordenação por nome.

### Ciclos

Ciclos são preservados como caminhos fechados e bloqueiam a composição. Nenhum nó é removido ou promovido automaticamente.

### Proveniência

Cada contribuição composta registra:

```text
templateId
entryId
originPaths
```

Uma contribuição compartilhada aparece uma vez, acompanhada de todos os caminhos que a alcançaram.

### Conflitos

O resolver não presume que duas contribuições para o mesmo alvo sejam incompatíveis. Conflito semântico só existe quando as entradas declaram explicitamente o mesmo `payload.conflictKey` e apresentam declarações divergentes.

Ambiguidade de identidade externa é conflito estrutural independentemente de `conflictKey`.

### Estados

```text
ready   → grafo completo, acíclico e sem conflitos
pending → apenas referências externas ainda não resolvidas
blocked → raiz ausente, dependência interna ausente, ambiguidade, ciclo ou conflito
```

### Imutabilidade

A resolução é projeção efêmera e profundamente imutável. Ela não altera templates, aplicações ou personagem.

## Consequências

- templates dentro de templates passam a formar um grafo auditável;
- composição parcial externa pode ser preservada sem mentir que está completa;
- identidades ambíguas não são escolhidas silenciosamente;
- ordem de aplicação futura torna-se reproduzível;
- cada contribuição possui explicação de origem;
- conflitos permanecem estruturais e declarados, não inventados pelo resolver;
- DOM-TEMPLATE-1.3 recebe uma composição pronta para planejamento e revalidação;
- Forma Alternativa e Morfose permanecem inalteradas.

## Invariantes

1. O grafo deriva exclusivamente de `entries`.
2. Referências internas usam somente ID soberano.
3. Referências externas usam somente chave e ID externos explícitos.
4. Nomes nunca participam da resolução.
5. Dependências precedem dependentes na ordem final.
6. Cada template aparece no máximo uma vez na ordem.
7. Ciclos são bloqueantes e explicáveis.
8. Referência externa ausente é pendente, não ilimitada nem ignorada.
9. Ambiguidade externa é bloqueante.
10. Cada contribuição conserva todos os caminhos de origem.
11. Conflito semântico exige `conflictKey` explícito.
12. O resolver não calcula nem aplica regras.

## Alternativas rejeitadas

### Incorporar dependências durante a criação do Template

Rejeitada porque impediria importações parciais e misturaria declaração com resolução.

### Resolver por nome quando o ID falhar

Rejeitada por ambiguidade e instabilidade.

### Ordenar alfabeticamente

Rejeitada porque nomes não são identidade e renomeações alterariam comportamento.

### Somar ou mesclar automaticamente contribuições repetidas

Rejeitada porque a semântica pertence ao domínio proprietário.

### Quebrar ciclos pelo primeiro template

Rejeitada porque produziria resultado arbitrário e esconderia erro estrutural.

## Continuidade

```text
DOM-TEMPLATE-1.3 — Aplicação ao Character
```
