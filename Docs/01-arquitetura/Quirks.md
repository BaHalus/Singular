# Quirks

**Código:** DOM-QUIRK-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Quirks representa a lista de peculiaridades do personagem em GURPS 4e.

Na interface em português, Quirks será exibido como Peculiaridades.

Estrutura inicial de cada peculiaridade:

```js
{
  id: "quirk-id",
  externalIds: {},
  name: "Minor Habit",
  notes: "",
  tags: []
}
```

Quirks não calcula custos, não valida pré-requisitos e não aplica regras.

Identificadores externos seguem ADR-0004.
Dados importados do GCS seguem ADR-0003.

Checklist:

- [x] Criar Quirks.md
- [ ] Criar Quirks.js
- [ ] Criar Quirks.test.js
- [ ] Criar QuirksOperations.js
- [ ] Criar QuirksOperations.test.js
- [ ] Integrar com Character junto com Advantages, Perks e Disadvantages
