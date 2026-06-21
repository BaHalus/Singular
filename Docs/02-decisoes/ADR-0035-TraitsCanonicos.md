# ADR-0035 — Traits canônicos no Character

**Status:** Aprovado para implementação  
**Data:** 2026-06-21  
**Bloco:** DOM-TRAIT-1.0

## Contexto

O Character armazenava vantagens, qualidades, desvantagens e peculiaridades em quatro coleções independentes. Todas usavam o mesmo conjunto de campos, enquanto o importador partia uma única árvore de traits em quatro saídas.

Templates, Forma Alternativa e Morfose já dependem desses registros. Abrir cálculo de pontos sobre quatro autoridades paralelas perpetuaria duplicação, conflitos de identidade e regras divergentes.

## Decisão

### Autoridade única

```text
Character.traits
```

passa a ser a autoridade canônica.

Cada item declara `role`:

```text
advantage
perk
disadvantage
quirk
```

Papéis futuros permanecem preservados.

### Projeções históricas

```text
advantages
perks
disadvantages
quirks
```

continuam disponíveis como projeções derivadas para compatibilidade.

Elas não são novas autoridades.

### Identidade global

`Trait.id` deve ser único em toda a coleção, independentemente do papel.

Nenhuma associação é feita por nome ou posição.

### Migração progressiva

Entradas legadas são convertidas para Traits canônicos.

Quando código antigo reconstrói um Character alterando explicitamente uma das quatro coleções, apenas o papel correspondente substitui sua projeção canônica. Em seguida todas as projeções são novamente derivadas de `traits`.

Essa regra existe somente para compatibilidade durante a migração.

### Origem e preservação

Cada Trait possui `source` estruturado. `externalIds`, `importMeta`, `raw`, modificadores, features, armas e pré-requisitos permanecem preservados sem interpretação prematura.

### Imutabilidade

Traits canônicos são profundamente imutáveis. Operações produzem novos valores.

### Pontos

O campo histórico `points` permanece declarativo neste bloco.

Separação entre custo declarado, custo calculado, reconciliação e agregação global será decidida em blocos posteriores de Traits e Point Ledger.

## Consequências

- quatro pipelines estruturais passam a compartilhar uma autoridade;
- IDs conflitantes entre papéis são rejeitados;
- Traits desconhecidos não são descartados;
- importadores antigos permanecem operantes;
- Templates aplicados entram no agregado canônico ao reconstruir o Character;
- DOM-POINTS não precisa calcular sobre estruturas instáveis;
- a remoção futura das projeções históricas poderá ocorrer por migração explícita.

## Alternativas rejeitadas

### Manter quatro agregados soberanos

Rejeitado porque repetiria identidade, validação, modificadores, custo e importação quatro vezes.

### Unificar somente na UI

Rejeitado porque a autoridade permaneceria fragmentada no domínio.

### Abrir Point Ledger primeiro

Rejeitado porque o total dependeria de custos e identidades ainda ambíguos.

### Classificar por sinal do custo

Rejeitado porque custo zero, custos alterados e papéis importados tornam o sinal insuficiente.

### Classificar por nome ou categoria textual aproximada

Rejeitado por instabilidade e ambiguidade.

## Invariantes

1. Existe uma coleção canônica de Traits.
2. IDs são únicos entre todos os papéis.
3. Projeções históricas são derivadas.
4. Papel desconhecido é preservado.
5. Origem externa não substitui identidade soberana.
6. Dados desconhecidos permanecem intactos.
7. Nenhum custo é calculado neste bloco.
8. Nenhuma regra é movida para a UI.
9. DOM-TEMPLATE, Morfose e Forma Alternativa permanecem fechados.
10. Save/load preserva autoridade e compatibilidade.
