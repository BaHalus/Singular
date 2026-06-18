# Techniques

**Código:** DOM-TECH-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Techniques representa a lista de técnicas do personagem em GURPS 4e.

Na interface em português, Techniques será exibido como Técnicas.

Estrutura inicial de cada técnica:

```js
{
  id: "technique-id",
  externalIds: {},
  name: "Arm Lock",
  specialization: "",
  skillId: "skill-001",
  skillName: "Judo",
  difficulty: "H",
  points: 2,
  importedLevel: 14,
  notes: "",
  tags: []
}
```

`skillId` referencia uma perícia da SINGULAR quando conhecida.

`skillName` preserva o nome textual da perícia base, especialmente em importações GCS.

`points` armazena os pontos investidos na técnica.

`importedLevel` preserva o NH importado de fontes externas. O motor da SINGULAR calcula o NH final.

Techniques não calcula NH, não resolve defaults, não aplica limites de técnica e não interpreta regras.

Identificadores externos seguem ADR-0004.
Dados importados do GCS seguem ADR-0003.

Checklist:

- [x] Criar Techniques.md
- [ ] Criar Techniques.js
- [ ] Criar Techniques.test.js
- [ ] Criar TechniquesOperations.js
- [ ] Criar TechniquesOperations.test.js
- [ ] Integrar com Character
