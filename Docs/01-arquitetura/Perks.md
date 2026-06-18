# Perks

**Código:** DOM-PERK-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Perks representa a lista de qualidades do personagem em GURPS 4e.

Na interface em português, Perks será exibido como Qualidades.

Estrutura inicial de cada qualidade:

```js
{
  id: "perk-id",
  externalIds: {},
  name: "Accessory",
  notes: "",
  tags: []
}
```

Perks não calcula custos, não valida pré-requisitos e não aplica regras.

Identificadores externos seguem ADR-0004.
Dados importados do GCS seguem ADR-0003.

Checklist:

- [x] Criar Perks.md
- [ ] Criar Perks.js
- [ ] Criar Perks.test.js
- [ ] Criar PerksOperations.js
- [ ] Criar PerksOperations.test.js
- [ ] Integrar com Character junto com Advantages, Disadvantages e Quirks
