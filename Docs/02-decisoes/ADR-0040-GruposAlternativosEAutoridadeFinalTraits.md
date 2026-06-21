# ADR-0040 — Grupos alternativos e autoridade final de Traits

**Status:** Aceito  
**Data:** 2026-06-21  
**Bloco:** DOM-TRAIT-1.5

## Contexto

DOM-TRAIT-1.0 a 1.4 estabeleceu:

- `Character.traits` como agregado canônico;
- papéis e identidade soberanos;
- autoridades declarada, importada e calculada separadas;
- custo-base;
- modificadores;
- autocontrole;
- frequência;
- escolhas;
- custo individual final.

O custo individual ainda não podia ser promovido para `pointValue.calculatedPoints`, porque habilidades alternativas alteram a contribuição entre Traits. Promover antes dessa regra produziria uma autoridade prematura.

Também era necessário importar o container estrutural correspondente do GCS sem associar membros por nome e sem transformar o Point Ledger em um segundo calculador de Traits.

## Decisão

### Política soberana dos grupos

A coleção persistente é:

```text
Character.traitAlternativeGroups
```

Cada grupo possui ID próprio, política de fator e arredondamento, proveniência, IDs externos e corpo bruto.

A associação de membro é exclusivamente:

```text
Trait.alternateGroupId
```

Não há coleção persistente paralela de membros.

### Regra mecânica

Para cada grupo válido:

- o maior custo individual é cobrado integralmente;
- os demais custos individuais recebem o fator do grupo;
- o fator padrão é `0.2`;
- o arredondamento é aplicado após o fator;
- `roundCostDown` define a direção;
- primária explícita precisa estar entre os maiores custos;
- empate sem primária explícita é resolvido deterministicamente pelo ID soberano.

Grupos unitários, membros que não sejam vantagens, custos negativos, múltiplas primárias ou primária explícita mais barata produzem conflito.

### Importação GCS

Containers `alternative_abilities` originam políticas de grupo pelo ID estrutural do container.

Cada descendente usa o container alternativo ancestral mais próximo. Nome e posição não são identidade.

A importação preserva `round_down`, referência, IDs externos, metadados e `raw`, mas não promove custo.

### Contribuição final

`TraitFinalCost` continua sendo a autoridade do custo individual.

`TraitAlternativeGroups` é a autoridade da contribuição entre Traits.

A contribuição promovida é:

```text
isolado      → custo individual
primária     → custo individual
alternativa  → custo individual × fator, com arredondamento do grupo
```

### Autoridade persistida

A promoção grava:

```text
Trait.pointValue.calculatedPoints
Trait.pointValue.finalCostAuthority
```

A autoridade preserva:

- operação e horário;
- identidade do Character e do Trait;
- fingerprints de fonte, análise e plano;
- papel no grupo;
- custo individual;
- contribuição final;
- avaliação detalhada de custo;
- avaliação das escolhas;
- política de grupo usada.

A autoridade é autovalidável e `validateCharacter` exige coerência entre ela e `calculatedPoints`.

### Evidências externas não são sobrescritas

A promoção não modifica `declaredPoints`, `importedPoints` ou `legacyPoints`.

Uma habilidade alternativa importada pode legitimamente ficar `divergent`, pois o valor externo representa custo individual enquanto o calculado representa contribuição descontada.

### Fluxo operacional

A promoção segue:

```text
analisar → planejar → revalidar → executar atomicamente → emitir recibo
```

O plano é efêmero.

A análise usa dois fingerprints:

- fonte mecânica, excluindo o alvo da própria operação;
- alvo persistente, incluindo `calculatedPoints` e autoridade atual.

Qualquer mudança em uma das duas dimensões invalida o plano.

A execução reconstrói e valida o Character uma única vez. Não existe aplicação parcial.

### Recibo

O recibo registra fingerprints anterior e posterior, plano, análise e cópia das autoridades aplicadas.

Uma segunda execução sobre estado já coerente resulta em `no-op`.

### Encerramento

Com esta decisão, DOM-TRAIT fica fechado para desenvolvimento estrutural e entra em manutenção.

O próximo domínio de pontos é DOM-POINTS-1.0.

## Consequências

- `calculatedPoints` de um Trait representa sua contribuição final, não necessariamente seu custo individual;
- o custo individual permanece disponível dentro da autoridade;
- o Point Ledger poderá agregar sem reinterpretar regras de Traits;
- importação GCS preserva estrutura e proveniência;
- planos obsoletos são rejeitados;
- save/load mantém autoridade e reconciliação;
- nenhuma associação por nome foi introduzida;
- Templates, Morfose e Forma Alternativa permanecem fechados.

## Alternativas rejeitadas

### Promover o custo individual antes do grupo

Rejeitada porque cobraria alternativas integralmente e criaria autoridade final incorreta.

### Calcular grupos no Point Ledger

Rejeitada porque duplicaria a autoridade mecânica do domínio proprietário.

### Persistir o container GCS como segundo agregado de Traits

Rejeitada porque criaria membros e identidades paralelos.

### Associar membros pelo nome do container

Rejeitada porque nome não é identidade e pode mudar ou repetir.

### Sobrescrever pontos importados com a contribuição calculada

Rejeitada porque apagaria evidência externa e esconderia divergência semanticamente correta.

## Critérios de aceitação

- política persistente e identificada por ID;
- regra integral + fator alternativo coberta;
- arredondamento configurável coberto;
- conflitos estruturais explícitos;
- importação GCS por identidade do container;
- análise, plano, revalidação e execução atômica;
- fingerprints distintos de fonte e alvo;
- autoridade final autovalidável;
- recibo completo;
- save/load vertical;
- segunda execução `no-op`;
- suíte integral e CI canônica verdes;
- nenhum cálculo na UI;
- nenhuma agregação total do Character.
