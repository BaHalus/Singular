# Disadvantages

**Código:** DOM-DISADV-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Disadvantages representa a lista de desvantagens do personagem em GURPS 4e.

Estrutura inicial de cada desvantagem:

```js
{
  id: "disadv-id",
  externalIds: {},
  name: "Bad Temper",
  notes: "",
  tags: []
}
```

Disadvantages não calcula custos, não valida pré-requisitos, não interpreta autocontrole e não aplica regras.

Identificadores externos seguem ADR-0004.
Dados importados do GCS seguem ADR-0003.

Checklist:

- [x] Criar Disadvantages.md
- [ ] Criar Disadvantages.js
- [ ] Criar Disadvantages.test.js
- [ ] Criar DisadvantagesOperations.js
- [ ] Criar DisadvantagesOperations.test.js
- [ ] Integrar com Character junto com Advantages, Perks e Quirks
