# ADR-0043 — Autoridade persistente de Powers

**Status:** Aprovado  
**Data:** 2026-06-24  
**Bloco:** DOM-POWER-1.0  
**Relação:** especializa e atualiza a seção de poderes da ADR-0008

## Contexto

A ADR-0008 determinou que poderes não duplicam vantagens, que o custo permanece nas vantagens e que o `Character` poderia futuramente possuir agrupadores auxiliares de poder.

Desde então, `Traits` tornou-se a autoridade canônica para vantagens, desvantagens, qualidades, peculiaridades, modificadores e valores em pontos. O campo `Character.powers`, porém, permaneceu como array bruto, sem criação, validação ou serialização próprias.

É necessário formalizar poderes sem criar uma segunda autoridade de habilidades, custos ou modificadores.

## Decisão

`Character.powers` será um agregado persistente de agrupamento e qualificação de `Traits`.

Cada Power terá identidade própria, metadados editoriais e referências explícitas por ID para os Traits que representam suas habilidades e, quando aplicável, seu talento.

Estrutura canônica inicial:

```js
{
  id: "power-fire",
  externalIds: {},
  name: "Poder do Fogo",
  source: "Fogo",
  powerModifier: {
    name: "Poder do Fogo",
    valuePercent: -10,
    notes: ""
  },
  talentTraitId: "trait-fire-talent",
  memberTraitIds: [
    "trait-burning-attack",
    "trait-control-fire"
  ],
  notes: "",
  tags: [],
  importMeta: null,
  raw: null
}
```

## Autoridades

### Traits

`Traits` continua sendo a única autoridade para:

- habilidades e vantagens;
- custo-base e custo final;
- níveis;
- modificadores aplicados;
- limitações e ampliações;
- grupos alternativos;
- contribuição ao Point Ledger.

### Powers

`Powers` será autoridade apenas para:

- identidade e nome do agrupamento;
- fonte temática ou mecânica declarada;
- descrição do modificador de poder esperado;
- referência ao Trait de talento;
- ordenação e associação dos Traits membros;
- metadados de importação e apresentação.

## Modificador de poder

`powerModifier` é uma declaração do agrupamento para auditoria, importação e apresentação.

Ele não altera custos diretamente e não substitui os modificadores canônicos registrados em cada Trait membro. Qualquer efeito mecânico deve ser calculado exclusivamente pelo domínio de Traits a partir dos modificadores efetivamente aplicados aos Traits.

Divergências entre o modificador declarado pelo Power e os modificadores dos Traits poderão ser diagnosticadas por serviço posterior, sem correção silenciosa.

## Referências

Todas as associações usam IDs internos exatos:

```text
talentTraitId -> Trait.id
memberTraitIds[] -> Trait.id
```

Associação por nome é proibida.

Na fundação DOM-POWER-1.0, referências ausentes ou duplicadas devem ser rejeitadas pelo `Character` canônico. Referências externas não resolvidas permanecem apenas em `externalIds`, `importMeta` ou `raw` até etapa própria de importação.

## Consequências

- não existe lista paralela de habilidades dentro de Powers;
- remover um Power não remove automaticamente seus Traits;
- remover um Trait referenciado exige antes atualizar ou remover as referências do Power;
- Powers não contribui diretamente para o Point Ledger;
- Powers não calcula custo, NH, dano, ativação, manutenção ou efeitos;
- a UI apresenta agrupamentos e despacha intenções, sem recalcular regras;
- a aplicação coordena operações atômicas, sem manter outro catálogo de poderes.

## Compatibilidade

O antigo `Character.powers` bruto deixa de ser contrato arquitetural. Como o projeto ainda não foi distribuído, não será mantido um normalizador legado paralelo.

Importadores futuros devem produzir o agregado canônico de Powers e referências para Traits já importados.

## Alternativas rejeitadas

### Projeção derivada exclusivamente de Traits

Rejeitada porque não preserva de forma suficiente identidade editorial, ordem, fonte, talento e proveniência do agrupamento.

### Powers contendo cópias completas de habilidades

Rejeitada porque duplicaria autoridade, custo, modificadores e identidade de Traits, permitindo dupla contagem e divergência estrutural.

## Invariantes

1. Cada Power possui ID interno único.
2. `memberTraitIds` não contém duplicatas.
3. Todo `memberTraitId` referencia um Trait existente.
4. `talentTraitId`, quando presente, referencia um Trait existente.
5. Powers não possui custo próprio.
6. Powers não modifica Traits implicitamente.
7. Powers não calcula regras GURPS.
8. Traits permanecem a autoridade mecânica e contábil.
9. A aplicação orquestra alterações atômicas.
10. A UI não calcula.
