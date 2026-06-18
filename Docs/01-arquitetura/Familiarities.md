# Familiarities

**Código:** DOM-FAM-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Familiarities representa as familiaridades culturais do personagem em GURPS 4e.

Na interface em português, Familiarities será exibido como Familiaridades Culturais.

Estrutura inicial:

```js
{
  id: "fam-id",
  externalIds: {},
  name: "Western",
  importedCost: 0,
  notes: "",
  tags: []
}
```

O domínio preserva o nome, custo importado e metadados mínimos.

Familiarities não calcula custo, não valida cultura de campanha e não aplica regras.

Identificadores externos seguem ADR-0004.
Dados importados do GCS seguem ADR-0003.
