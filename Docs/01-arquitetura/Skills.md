# Skills

**Código:** DOM-SKILL-1.0 a 1.9  
**Status:** Estrutura canônica e fundação mecânica local implementadas  
**Camada:** Domain + Engine  
**Tipo:** Agregado estrutural com resolução mecânica derivada

Skills representa a lista de perícias do personagem em GURPS 4e.

Na interface em português, Skills será exibido como Perícias.

## Autoridade estrutural

`Character.skills` é a coleção persistente canônica.

`src/domain/character/Skills.js` cria, valida e serializa a estrutura declarada. `SkillsOperations.js` contém transformações imutáveis sobre essa coleção.

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

Os campos importados preservam evidência externa. Eles não são autoridade mecânica da SINGULAR.

## Autoridade mecânica

A autoridade de NH pertence ao Skill Mechanics Engine.

Componentes implementados:

- `SkillMechanicsResult`: resultado portátil, imutável e diagnosticável;
- `SkillTrainedResolver`: progressão treinada para `E`, `A`, `H` e `VH`;
- `SkillDefaultCandidate`: contrato canônico de default por atributo ou Skill explícita;
- `SkillDefaultResolver`: avaliação unitária de um candidato;
- `SkillDefaultTrainedSourceResolver`: impede default a partir de Skill conhecida somente por default;
- `SkillResultSelector`: escolhe o maior nível resolvido, com desempate treinado antes de default;
- `SkillResolutionOrchestrator`: coordenação local na camada de aplicação, sem fórmulas próprias.

## Regras certificadas

### Progressão treinada

| Dificuldade | 1 ponto | 2 pontos | 4 pontos | 8 pontos |
|---|---:|---:|---:|---:|
| `E` | A+0 | A+1 | A+2 | A+3 |
| `A` | A−1 | A+0 | A+1 | A+2 |
| `H` | A−2 | A−1 | A+0 | A+1 |
| `VH` | A−3 | A−2 | A−1 | A+0 |

Depois de 4 pontos, cada bloco completo adicional de 4 aumenta o NH relativo em +1.

Zero pontos não produz nível treinado.

### Defaults

- candidatos mecânicos exigem identidade explícita;
- nomes e especializações não resolvem identidade;
- default por atributo recebe o nível da fonte explicitamente;
- default por Skill exige resultado-fonte resolvido por treinamento;
- uma Skill conhecida somente por default não alimenta outro default;
- o maior resultado resolvido vence;
- em empate, o resultado treinado vence sobre default;
- em empate entre defaults, a ordem de entrada preserva determinismo.

## Valores importados

`importedLevel` e `importedRelativeLevel` são comparados com o resultado calculado.

Divergências geram diagnósticos de aviso. Valores importados nunca substituem silenciosamente o cálculo soberano.

## Aplicação

`SkillResolutionOrchestrator` coordena, para uma única Skill:

1. resultado treinado;
2. avaliações de defaults já canônicos;
3. seleção do resultado final;
4. relatório efêmero, portátil e imutável.

A aplicação não replica tabelas ou fórmulas.

## Limites ainda abertos

- transformação dos payloads opacos de `Skill.defaults` em candidatos canônicos;
- resolução de IDs externos na fronteira de importação;
- resolução em lote para o `Character` inteiro;
- obtenção soberana dos níveis de atributo;
- política completa de Skills compradas a partir de defaults melhores;
- modificadores provenientes de Traits, equipamentos e outras fontes;
- integração com `ApplicationReadModel`;
- projeção na UI;
- integração contábil adicional além dos pontos já declarados ao Point Ledger.

## Invariantes

1. `Character.skills` permanece a fonte persistente.
2. NH calculado não é persistido como segunda autoridade.
3. O motor calcula e seleciona.
4. A aplicação apenas orquestra.
5. O importador preserva e transforma, mas não calcula.
6. A UI não calcula.
7. Nomes não possuem autoridade mecânica.
8. Resultados são determinísticos, portáteis e diagnosticáveis.

## Cobertura de regressão

A cobertura inclui:

- estrutura e serialização de Skills;
- progressão treinada e patamares intermediários;
- valores altos e entradas bloqueantes;
- candidatos de default e identidade explícita;
- avaliação de defaults por atributo e Skill;
- proibição de encadeamento por fonte não treinada;
- seleção determinística;
- orquestração local e consistência do relatório;
- portabilidade JSON estrita e imutabilidade.

Checklist:

- [x] Estrutura canônica de Skills
- [x] Operações imutáveis
- [x] Integração estrutural com Character
- [x] Contrato portátil de resultado
- [x] Progressão treinada
- [x] Candidato canônico de default
- [x] Avaliação unitária de default
- [x] Seleção de resultado final
- [x] Proibição de default a partir de fonte não treinada
- [x] Orquestração local na aplicação
- [ ] Resolução global do Character
- [ ] Modificadores canônicos externos
- [ ] Projeção no Application Read Model
- [ ] UI
