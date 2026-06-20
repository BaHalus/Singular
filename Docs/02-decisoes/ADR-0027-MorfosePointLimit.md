# ADR-0027 — Autoridade única para o limite de pontos da Morfose

**Status:** Aprovado  
**Data:** 2026-06-20

## Contexto

Os blocos DOM-MORPH-1.1 a DOM-MORPH-1.4 passaram a resolver a vantagem Morfose, adquirir formas, materializar formas conhecidas e criar formas improvisadas. Até então, os fluxos carregavam apenas snapshots declarativos de limite:

```text
status: deferred-to-dom-morph-1.5
enforced: false
```

Sem uma autoridade única, formas conhecidas e improvisadas poderiam adotar comparações diferentes, duplicar lógica em materialização e transição ou permitir que a UI calculasse o teto.

Também não existe no agregado atual uma autoridade inequívoca para reconstruir automaticamente a raça nativa a partir de nomes, aplicações de template ou custo textual da vantagem.

## Decisão

### Teto efetivo declarado

`MorphProfile.pointLimit` será tratado como o teto efetivo já resolvido do valor do template racial.

A conversão de representações externas para esse teto pertence ao importador, às regras de campanha, aos modificadores reconhecidos e aos overrides do resolver.

A camada de limite não deriva raça nativa e não recalcula o custo da vantagem.

### Avaliador canônico

Toda comparação será centralizada em:

```text
src/domain/character/MorphPointLimit.js
```

Formas conhecidas e improvisadas usam o mesmo avaliador.

### Fronteira de aplicação

O `FormTransitionPlanner` é a fronteira mecânica de ativação. Uma projeção pode existir inativa, mas um alvo acima de um teto conhecido recebe plano `blocked`.

Isso preserva a separação entre:

```text
materializar
ativar
```

### Teto de improvisação

Quando uma improvisação declara teto próprio, o teto efetivo é o menor entre o geral e o específico.

Um teto específico não é apagado por `Ilimitada` sem declaração explícita que o remova.

### Dados desconhecidos

`undeclared` não significa `unlimited`.

A avaliação permanece incompleta e explicável. Ausência total de teto não é convertida silenciosamente em zero, infinito ou custo da raça-base.

Para não invalidar automaticamente personagens importados antes da resolução do limite, uma política totalmente não declarada não bloqueia sozinha uma seleção estruturalmente válida. O plano recebe `enforced: false` e `complete: false`, de modo que nenhum consumidor possa afirmar que o limite foi verificado.

Uma violação de teto parcial conhecido continua bloqueante.

### Fingerprint

A avaliação completa integra `morphSelection.pointLimitEvaluation`, que já participa do fingerprint do plano. Mudanças de política ou de pontos do template são reavaliadas pelo executor.

## Consequências

- existe uma única fórmula de comparação;
- formas conhecidas e improvisadas recebem o mesmo vocabulário de razões;
- a UI apenas apresenta a avaliação;
- templates sem valor permanecem pendentes sob teto finito;
- igualdade com o teto é válida;
- valores negativos são preservados;
- planos antigos não contornam mudanças posteriores;
- o custo final da vantagem continua fora deste bloco.

## Alternativas rejeitadas

### Recalcular o teto a partir de `Trait.points`

Rejeitado porque modificadores percentuais, pontos extras de capacidade, importações e regras de campanha exigiriam duplicar o resolver da vantagem.

### Inferir a raça nativa pelo nome ou pelo primeiro template

Rejeitado por ambiguidade e por violar a política de referências por ID.

### Bloquear a materialização

Rejeitado porque materialização é uma projeção inativa e separada da ativação. A fronteira mecânica correta é o planner.

### Calcular na UI

Rejeitado por violar o princípio central da SINGULAR.
