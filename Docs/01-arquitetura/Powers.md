# Powers

**Código:** DOM-POWER-1.0  
**Status:** Em implementação  
**Camada:** Domain  
**Tipo:** Agregado de agrupamento  
**Decisão:** ADR-0043

Powers representa agrupamentos persistentes de Traits que compõem poderes em GURPS 4e.

## Regra central

```text
Powers agrupa e qualifica.
Traits armazena habilidades, modificadores e custos.
O motor calcula.
A aplicação orquestra.
A UI não calcula.
```

Powers não contém cópias de Traits e não contribui diretamente ao Point Ledger.

## Estrutura canônica inicial

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

## Autoridade

Powers é responsável por:

- identidade do agrupamento;
- nome e fonte declarada;
- descrição do modificador de poder;
- referência ao Trait de talento;
- associação e ordem dos Traits membros;
- metadados editoriais e de importação.

Powers não é responsável por:

- custo-base ou custo final;
- níveis;
- modificadores aplicados aos Traits;
- grupos alternativos;
- dano, ativação ou manutenção;
- contribuição em pontos;
- resolução de referências externas.

## Referências

`talentTraitId` e `memberTraitIds` usam somente `Trait.id` interno exato.

Associação por nome é proibida.

## Modificador de poder

`powerModifier` é declaração estrutural para auditoria, importação e apresentação. Não altera custos e não substitui os modificadores canônicos dos Traits membros.

## Checklist

- [x] Aprovar ADR-0043
- [ ] Criar Powers.js
- [ ] Criar Powers.test.js
- [ ] Integrar com Character
- [ ] Criar PowersOperations.js
- [ ] Criar PowersOperations.test.js
- [ ] Registrar gate de fechamento estrutural
