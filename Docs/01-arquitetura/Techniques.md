# Techniques

**Código:** DOM-TECH-1.0  
**Status:** Estrutura canônica integrada ao Character  
**Camada:** Domain  
**Tipo:** Agregado

Techniques representa a lista de técnicas do personagem em GURPS 4e.

Na interface em português, Techniques será exibido como Técnicas.

## Estado estrutural observado

`Character.techniques` é a coleção canônica de técnicas do personagem.

`src/domain/character/Techniques.js` normaliza, valida e serializa a estrutura persistida. `src/domain/character/TechniquesOperations.js` contém transformações imutáveis sobre essa coleção.

Estrutura atual de cada técnica:

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

`skillName` e `skillSpecialization` preservam referências textuais, especialmente em importações. Esses campos não autorizam nova associação mecânica automática por nome.

`points` armazena os pontos investidos na técnica.

`importedLevel`, `importedRelativeLevel`, `defaultPenalty` e `maximumRelativeLevel` preservam dados estruturais importados ou declarados para auditoria e futura resolução pelo motor.

`defaults`, `features` e `prereqs` preservam estruturas externas sem interpretação local.

Techniques não calcula NH, não resolve defaults, não aplica limites de técnica e não interpreta regras GURPS.

Identificadores externos seguem ADR-0004.  
Dados importados do GCS seguem ADR-0003.

## Cobertura de regressão

`Techniques.test.js` protege os valores neutros, a preservação estrutural importada, a serialização sem cálculo e a rejeição de tipos inválidos.

`TechniquesOperations.test.js` protege as transformações imutáveis já existentes, inclusive a atualização explícita da referência de perícia.

## Limite deste documento

A integração estrutural com `Character` não estabelece autoridade soberana de NH, resolução de defaults, limites de técnica ou vínculo automático entre técnica e perícia.

Checklist:

- [x] Criar Techniques.md
- [x] Criar Techniques.js
- [x] Criar Techniques.test.js
- [x] Criar TechniquesOperations.js
- [x] Criar TechniquesOperations.test.js
- [x] Integrar com Character
