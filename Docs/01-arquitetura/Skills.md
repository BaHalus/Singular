# Skills

**Código:** DOM-SKILL-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Skills representa a lista de perícias do personagem em GURPS 4e.

Na interface em português, Skills será exibido como Perícias.

Estrutura inicial de cada perícia:

```js
{
  id: "skill-id",
  externalIds: {},
  name: "Stealth",
  specialization: "",
  attribute: "DX",
  difficulty: "A",
  points: 2,
  importedLevel: 12,
  notes: "",
  tags: []
}
```

`points` armazena os pontos investidos na perícia.

`importedLevel` preserva o NH importado de fontes externas, como GCS.

O motor da SINGULAR calcula o NH final. `importedLevel` não é tratado como verdade calculada.

Skills não calcula NH, não aplica bônus, não resolve defaults e não interpreta regras.

Identificadores externos seguem ADR-0004.
Dados importados do GCS seguem ADR-0003.

Checklist:

- [x] Criar Skills.md
- [ ] Criar Skills.js
- [ ] Criar Skills.test.js
- [ ] Criar SkillsOperations.js
- [ ] Criar SkillsOperations.test.js
- [ ] Integrar com Character
