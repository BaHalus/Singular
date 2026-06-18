# Languages

**Código:** DOM-LANG-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Languages representa os idiomas conhecidos pelo personagem.

Estrutura inicial:

```js
{
  id: "lang-id",
  externalIds: {},
  name: "Português",
  spokenLevel: "native",
  writtenLevel: "native",
  importedCost: 0,
  notes: "",
  tags: []
}
```

O domínio preserva os níveis informados e o custo importado. Não calcula custos nem aplica regras de idioma.
