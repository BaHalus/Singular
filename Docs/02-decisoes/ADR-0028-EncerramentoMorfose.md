# ADR-0028 — Encerramento e congelamento do domínio de Morfose

**Status:** Aprovado  
**Data:** 2026-06-20  
**Gate:** GATE-MORPH-CLOSE

## Contexto

Os blocos DOM-MORPH-1.0 a DOM-MORPH-1.5 construíram, em sequência:

- a fundação do perfil de Morfose;
- a resolução da vantagem e de seus modificadores;
- o catálogo e a identidade de formas conhecidas;
- observação, memorização, esquecimento e substituição;
- materialização idempotente;
- formas improvisadas;
- limite geral e limite específico de improvisação;
- integração com o pipeline existente de Forma Alternativa.

O domínio já reutiliza `FormTransitionPlanner`, `FormTransitionExecutor`, runtime, recibos e histórico. Criar DOM-MORPH-1.6 tenderia a duplicar responsabilidades que pertencem a Templates, Traits, Pontos ou UI.

## Decisão

### Encerramento

```text
Forma Alternativa — fechado
Morfose — fechado
```

Não será aberto DOM-MORPH-1.6.

Morfose entra em **manutenção fechada**. Alterações futuras são admitidas apenas para:

- correções de regressão;
- preservação de compatibilidade;
- atualização de integrações quando outro domínio soberano amadurecer;
- esclarecimentos documentais sem expansão funcional disfarçada.

### Autoridades finais

```text
MorphProfile
→ declaração do perfil, políticas e catálogo

MorphProfileResolver
→ resolução da vantagem, modifiers, campanha e overrides

MorphCatalogOperations
→ aquisição, observação, memorização e manutenção do catálogo

MorphKnownFormMaterialization
→ projeção transitória de formas conhecidas

MorphImprovisation / MorphImprovisationOperations
→ análise e projeção transitória de formas improvisadas

MorphPointLimit
→ autoridade única do limite geral e do limite de improvisação

FormTransitionPlanner / FormTransitionExecutor
→ planejamento, revalidação e execução da transformação
```

Nenhuma nova autoridade paralela pode ser introduzida.

### APIs públicas estáveis

As seguintes famílias passam a ser consideradas estáveis:

```text
perfil e serialização
resolução da vantagem
operações do catálogo
seleção e materialização de forma conhecida
análise e materialização de improvisação
avaliação do limite em pontos
integração com planner e executor de Forma Alternativa
```

Estabilidade significa:

- IDs e referências permanecem por identidade, nunca por posição ou nome;
- estados e razões existentes não mudam de significado silenciosamente;
- campos persistidos não são removidos sem migração explícita;
- planos continuam efêmeros e revalidados;
- recibos e histórico continuam append-only;
- materialização permanece distinta de ativação;
- a UI não calcula regras.

### Análise, planejamento e execução

A avaliação canônica de pontos deve estar visível desde a análise:

```text
pointLimitEvaluation
```

A análise pode permitir que uma projeção inativa seja criada mesmo quando seu teto é excedido. A fronteira mecânica de ativação continua sendo o planner.

Na execução, o recibo e o histórico preservam:

```text
morphKnownFormId
morphImprovisationId
morphPointLimitEvaluation
```

### Dados desconhecidos

```text
undeclared ≠ unlimited
```

Valor desconhecido permanece desconhecido. Sob teto finito, pontos desconhecidos mantêm o plano pendente. Nenhuma camada inventa zero, infinito, raça-base ou custo calculado localmente.

### Próximo domínio

O próximo domínio principal é:

```text
DOM-TEMPLATE-1.0 — Fundação de modelos e pacotes
```

Qualquer requisito novo apresentado como “Morfose” deve primeiro ser classificado entre:

- Templates;
- Traits;
- Point Ledger;
- importação;
- aplicação;
- UI.

Somente uma regra intrínseca e ausente de Morfose poderia justificar a reabertura formal deste ADR.

## Consequências

- o roadmap deixa de prever DOM-MORPH-1.6;
- Forma Alternativa e Morfose tornam-se infraestrutura estável para Templates;
- regressões passam a ser verificadas pela suíte integral e por `MorphClosureGate.test.js`;
- novas funcionalidades não podem criar outro planner, executor, catálogo ou avaliador de limite;
- recibos passam a preservar a identidade de improvisações e a avaliação aplicada;
- documentos anteriores que marcavam o limite como adiado são superados pelo DOM-MORPH-1.5 e por este ADR.

## Critério de reabertura

A reabertura exige simultaneamente:

1. demonstração de que o requisito é intrínseco à Morfose;
2. demonstração de que não pertence a Templates, Traits, Pontos, importação ou UI;
3. ADR específico;
4. regressão integral de Forma Alternativa e DOM-MORPH-1.0 a 1.5;
5. preservação das APIs estáveis ou plano explícito de migração.
