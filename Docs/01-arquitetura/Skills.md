# Skills

**Código:** DOM-SKILL-1.0 a 1.2  
**Status:** Estrutura canônica e cobertura de regressão reconciliadas  
**Camada:** Domain  
**Tipo:** Agregado

Skills representa a lista de perícias do personagem em GURPS 4e.

Na interface em português, Skills será exibido como Perícias.

## Estado estrutural observado

`Character.skills` é a coleção canônica de perícias do personagem.

`src/domain/character/Skills.js` é o normalizador estrutural de perícias. Ele preserva dados declarados ou importados, mas não é autoridade mecânica de NH, defaults, bônus ou custo final.

`src/domain/character/SkillsOperations.js` contém transformações imutáveis sobre a coleção canônica. Essas operações não criam pipeline paralelo nem substituem o futuro contrato soberano do motor.

Estrutura atual de cada perícia:

```js
{
  id: "skill-id",
  externalIds: {},
  name: "Stealth",
  specialization: "",
  techLevel: null,
  attribute: "DX",
  difficulty: "A",
  points: 2,
  importedLevel: 12,
  importedRelativeLevel: 1,
  defaults: [],
  features: [],
  weapons: [],
  prereqs: null,
  notes: "",
  tags: [],
  importMeta: null,
  raw: null
}
```

`points` armazena os pontos investidos na perícia.

`importedLevel` e `importedRelativeLevel` preservam valores recebidos de fontes externas, como GCS. Eles não são tratados como resultados calculados pela SINGULAR.

`defaults`, `features`, `weapons`, `prereqs`, `importMeta` e `raw` preservam estrutura e proveniência sem interpretação mecânica local.

O motor da SINGULAR calculará o NH final. Skills não calcula NH, não aplica bônus, não resolve defaults e não interpreta regras GURPS.

Identificadores externos seguem ADR-0004.  
Dados importados do GCS seguem ADR-0003.

## Cobertura de regressão

`Skills.test.js` protege:

- valores neutros da estrutura;
- preservação integral de payload estrutural importado;
- roundtrip por `serializeSkills` sem cálculo de NH;
- rejeição de tipos inválidos em campos escalares, coleções e metadados.

`SkillsOperations.test.js` protege as transformações imutáveis já existentes sobre a coleção.

## Limite deste documento

Este documento registra somente o contrato estrutural observado. Ele não define fórmula de NH, resolução de defaults, limite de técnica, integração com Point Ledger nem qualquer cálculo mecânico novo.

Checklist:

- [x] Criar Skills.md
- [x] Criar Skills.js
- [x] Criar Skills.test.js
- [x] Criar SkillsOperations.js
- [x] Criar SkillsOperations.test.js
- [x] Integrar com Character
- [x] Cobrir preservação estrutural importada
