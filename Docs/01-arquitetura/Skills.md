# Skills

**Código:** DOM-SKILL-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado

Skills representa a lista de perícias do personagem em GURPS 4e.

Na interface em português, Skills será exibido como Perícias.

## Estado estrutural observado

`Character.skills` já é a coleção canônica de perícias do personagem.

`src/domain/character/Skills.js` já existe como normalizador estrutural de perícias. Ele preserva dados declarados ou importados, mas não é autoridade mecânica de NH, defaults, bônus ou custo final.

`src/domain/character/SkillsOperations.js` já existe como conjunto de operações estruturais sobre a coleção canônica. Essas operações não criam pipeline paralelo e não substituem o contrato futuro do motor soberano.

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

## Limite deste documento

Este documento registra o estado estrutural observado após o gate DOM-SKILL-1.0. Ele não define fórmula de NH, resolução de defaults, limite de técnica, integração com Point Ledger nem qualquer cálculo mecânico novo.

Checklist:

- [x] Criar Skills.md
- [x] Criar Skills.js
- [ ] Criar Skills.test.js
- [x] Criar SkillsOperations.js
- [ ] Criar SkillsOperations.test.js
- [x] Integrar com Character
