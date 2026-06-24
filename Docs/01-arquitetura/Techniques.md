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
  skillSpecialization: "",
  difficulty: "H",
  points: 2,
  importedLevel: 14,
  importedRelativeLevel: 1,
  defaultPenalty: -4,
  maximumRelativeLevel: 0,
  defaults: [],
  features: [],
  prereqs: null,
  notes: "",
  tags: [],
  importMeta: null,
  raw: null
}
```

`skillId` referencia uma perícia da SINGULAR quando conhecida.

`skillName` preserva o nome textual da perícia base, especialmente em importações GCS.

`skillSpecialization` preserva a especialização textual da perícia base quando conhecida ou importada.

`points` armazena os pontos investidos na técnica.

`importedLevel` preserva o NH importado de fontes externas.

`importedRelativeLevel`, `defaultPenalty` e `maximumRelativeLevel` preservam dados estruturais importados ou declarados para auditoria e futura resolução pelo motor.

`defaults`, `features` e `prereqs` preservam estruturas externas sem interpretação local.

Techniques não calcula NH, não resolve defaults, não aplica limites de técnica e não interpreta regras.

Identificadores externos seguem ADR-0004.
Dados importados do GCS seguem ADR-0003.

Operações de Techniques são transformações imutáveis de coleção/campos. Elas não calculam NH e não resolvem regras GURPS.

Checklist:

- [x] Criar Techniques.md
- [x] Criar Techniques.js
- [x] Criar Techniques.test.js
- [x] Criar TechniquesOperations.js
- [x] Criar TechniquesOperations.test.js
- [ ] Integrar com Character
