# Techniques

**Código:** DOM-TECH-1.0 a 1.5 / APP-SKILL-1.4  
**Status:** Estrutura canônica, progressão mecânica e resolução global implementadas  
**Camada:** Domain + Engine + Application  
**Tipo:** Agregado estrutural com resolução mecânica derivada

Techniques representa a lista de técnicas do personagem em GURPS 4e.

Na interface em português, Techniques será exibido como Técnicas.

## Autoridade estrutural

`Character.techniques` é a coleção persistente canônica.

`src/domain/character/Techniques.js` cria, valida e serializa a estrutura. `TechniquesOperations.js` contém transformações imutáveis.

Estrutura atual:

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

`skillId` é a identidade mecânica da Skill-base quando conhecida.

`skillName` e `skillSpecialization` são dados editoriais e de importação. Eles não autorizam vínculo mecânico por nome.

## Autoridade mecânica

`src/engine/skills/TechniqueResolver.js` é a autoridade de NH para Techniques comuns baseadas em uma única Skill treinada.

Entrada:

```js
{
  technique,
  trainedSkillResult
}
```

Saída:

```js
SkillMechanicsResult
```

O resultado usa:

- `entityType = "technique"`;
- `basis.kind = "technique"`;
- `basis.sourceId = technique.skillId`;
- `relativeLevel` relativo à Skill-base.

## Regras certificadas

### Fonte

A Skill-base precisa:

- ter o mesmo ID de `technique.skillId`;
- estar resolvida;
- possuir `basis.kind = "trained"`.

Uma Skill conhecida somente por default não alimenta uma Technique.

### Nível padrão

```text
Skill-base + defaultPenalty
```

Zero pontos mantém o nível padrão.

### Progressão

Technique Average (`A`): cada ponto melhora +1 sobre o default.

Technique Hard (`H`):

- zero pontos mantém o default;
- a primeira melhoria exige 2 pontos;
- depois disso, cada ponto adicional melhora +1;
- uma alocação isolada de 1 ponto é bloqueada como mecanicamente insuficiente.

### Teto

Quando `maximumRelativeLevel` estiver declarado:

```text
relativeLevel = min(defaultPenalty + melhoria, maximumRelativeLevel)
```

Ultrapassar o teto gera diagnóstico informativo. Um teto abaixo do default declarado bloqueia a resolução.

## Valores importados

`importedLevel` e `importedRelativeLevel` continuam sendo evidência externa.

Divergências geram avisos. O valor importado não substitui o cálculo soberano.

## Resolução global

`SkillMechanicsGlobalExecutor` recebe um `SkillMechanicsResolutionPlan` validado.

A execução:

1. resolve todas as Skills treinadas;
2. avalia e seleciona os resultados finais das Skills;
3. cria um mapa somente com `trainedResult`;
4. resolve cada Technique na ordem declarada;
5. produz `techniqueResults` portáteis e imutáveis.

Mesmo quando uma Skill obtém resultado final resolvido por default, sua Technique recebe o resultado treinado bloqueado e também fica bloqueada. Isso impede que defaults sejam promovidos silenciosamente a treinamento.

Uma referência de Skill-base ausente produz diagnóstico local e não impede a resolução das demais Techniques.

## Limites ainda abertos

- Techniques com múltiplas Skills-base;
- defaults especiais;
- Techniques baseadas em atributo, defesa ativa, aparar, bloqueio ou outra grandeza;
- melhoria de Technique quando a Skill-base foi comprada a partir de default melhor;
- modificadores externos;
- projeção dedicada de leitura do relatório global;
- integração com Application Read Model;
- projeção na UI;
- remoção ou confinamento final do fallback legado `resolvedByName` no importador.

## Invariantes

1. `Character.techniques` permanece a fonte persistente.
2. NH calculado não é persistido como segunda autoridade.
3. A Skill-base usa identidade explícita.
4. Nomes não resolvem vínculo mecânico.
5. Techniques usam somente o resultado treinado da Skill-base.
6. O motor calcula.
7. A aplicação orquestra.
8. A UI não calcula.
9. Resultados são portáteis, imutáveis e diagnosticáveis.
10. Bloqueios locais permitem resultados independentes.

## Cobertura de regressão

A cobertura inclui:

- estrutura, serialização e operações;
- progressão Average e Hard;
- zero pontos e patamares de melhoria;
- teto relativo;
- Skill-base ausente, bloqueada, divergente ou não treinada;
- entradas numéricas inválidas;
- divergências importadas;
- resolução global em ordem declarada;
- proibição de usar resultado final por default como fonte;
- resultados parciais;
- imutabilidade e portabilidade dos resultados.

Checklist:

- [x] Estrutura canônica de Techniques
- [x] Operações imutáveis
- [x] Integração estrutural com Character
- [x] Referência explícita à Skill-base
- [x] Progressão Average e Hard
- [x] Aplicação de defaultPenalty
- [x] Aplicação de maximumRelativeLevel
- [x] Exigência de Skill-base treinada
- [x] Resolução global do Character
- [ ] Defaults especiais e múltiplas bases
- [ ] Modificadores canônicos externos
- [ ] Projeção no Application Read Model
- [ ] UI
