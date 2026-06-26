# GATE-APP-SKILL-1.4 — Resolução global de Skills e Techniques

**Status:** Fechamento proposto para revisão  
**Data:** 2026-06-26  
**Escopo:** APP-SKILL-1.1 a 1.4

## Objetivo

Certificar a composição global das autoridades mecânicas de atributos, Skills, defaults e Techniques sem persistir NH derivado no Character e sem introduzir resolução por nome, cálculo na aplicação ou encadeamento de defaults.

## Autoridades preservadas

### Character

`Character.skills` e `Character.techniques` continuam sendo as fontes persistentes canônicas.

O Character não recebe:

- NH calculado;
- relatórios de resolução;
- caches mecânicos;
- candidatos externos transformados;
- resultados de Techniques.

### Motor

O motor permanece autoridade exclusiva para:

- nível efetivo de atributos;
- progressão treinada de Skills;
- avaliação de defaults;
- seleção do melhor resultado;
- exigência de fonte treinada;
- progressão e teto de Techniques;
- diagnósticos mecânicos.

### Aplicação

A aplicação:

- valida identidades e portabilidade;
- preserva a ordem declarada;
- coordena chamadas do motor;
- publica relatórios derivados.

A aplicação não contém tabelas, progressões ou fórmulas próprias.

### Importadores e adapters

Dados externos continuam fora do motor até serem convertidos em `SkillDefaultCandidate` com identidade canônica explícita.

Nomes e especializações não possuem autoridade mecânica.

### UI

A UI permanece fora deste gate e não calcula NH, defaults ou Techniques.

## Entregas certificadas

### `SkillMechanicsResolutionPlan`

O plano global:

- possui schema versionado;
- exige `characterId`;
- recebe níveis efetivos de atributos;
- recebe Skills e Techniques canônicas;
- recebe candidatos canônicos de default;
- exige IDs string únicos;
- valida candidatos apontando para Skills existentes;
- aceita defaults por ST, DX, IQ e HT;
- preserva a ordem declarada;
- rejeita arrays esparsos;
- rejeita dados não JSON portáteis;
- é destacado das entradas e profundamente imutável.

### `SkillBatchResolutionExecutor`

A execução de Skills ocorre em duas passagens:

1. todos os resultados treinados são calculados;
2. todos os defaults são avaliados.

Consequências:

- um resultado final obtido por default não alimenta outro default;
- defaults por Skill usam somente `trainedResult`;
- defaults por atributo usam somente nível efetivo resolvido;
- empates preservam a prioridade definida pelo motor;
- a ordem de candidatos permanece determinística;
- bloqueios locais não interrompem Skills independentes.

### `SkillMechanicsGlobalExecutor`

A execução global:

- reutiliza o lote de Skills;
- resolve Techniques na ordem declarada;
- entrega a cada Technique somente o `trainedResult` da Skill-base;
- bloqueia referências ausentes ou fontes não treinadas localmente;
- preserva resultados independentes;
- produz relatório global portátil e imutável.

## Relatório global

```js
{
  schemaVersion: 1,
  characterId,
  attributeLevels,
  skillReports: [],
  techniqueResults: [],
  diagnostics: []
}
```

Cada `skillReport` preserva:

- resultado treinado;
- avaliações de defaults;
- resultado final.

Cada `techniqueResult` é um `SkillMechanicsResult` de `entityType = "technique"`.

## Resultados parciais

São preservados como bloqueios mecânicos, sem rejeitar o relatório inteiro:

- atributo efetivo indisponível;
- Skill não treinada;
- fonte de default bloqueada;
- Technique sem Skill-base conhecida;
- Technique cuja Skill-base não está treinada;
- dados mecânicos de Technique incompatíveis.

Erros estruturais do plano continuam rejeitando a execução integral.

## Evidências

- ADR-0054 integrada pela PR #91, merge `707d0af`;
- contrato do plano integrado pela PR #95, merge `2328931`;
- Tests #820 concluída com sucesso;
- executor em lote integrado pela PR #96, merge `3a7898a`;
- Tests #822 concluída com sucesso;
- executor global integrado pela PR #97, merge `f8e63cf`;
- Tests #824 concluída com sucesso;
- PRs #95, #96 e #97 sem comentários ou threads bloqueantes no momento da integração.

## Cobertura de regressão

A suíte protege:

- plano vazio e plano completo;
- ordem de Skills, Techniques e candidatos;
- IDs duplicados;
- referências inexistentes de candidatos;
- defaults por atributo não suportado;
- arrays esparsos;
- dados importados não portáteis;
- imutabilidade e serialização destacada;
- prioridade do resultado treinado em empate;
- proibição de default de default;
- atributos bloqueados com resultados independentes;
- Technique usando apenas Skill-base treinada;
- Skill-base ausente;
- resultados parciais de Techniques;
- adulteração de relatórios locais;
- tipos, identidades e bases de Techniques;
- schema e propriedades extras.

## Regressões proibidas

- persistir NH calculado no Character;
- usar `importedLevel` como autoridade;
- interpretar `Skill.defaults` diretamente no motor;
- resolver Skill ou Technique por nome;
- usar `finalResult` como fonte de outro default;
- usar `finalResult` como fonte de Technique;
- calcular progressões na aplicação ou UI;
- criar cache persistente sem ADR própria;
- alterar Point Ledger por meio do relatório mecânico;
- misturar esta frente com Equipment, Magic, Power ou Combat;
- modificar arquivos de UI como atalho para projeção.

## Limites deste gate

Não estão certificados:

- adapter completo de defaults externos;
- resolução de IDs externos;
- política de Skill comprada a partir de default melhor;
- modificadores de Traits, Talentos, equipamentos ou condições;
- Techniques especiais, múltiplas bases ou defesa ativa;
- projeção de leitura dedicada;
- incorporação ao `ApplicationReadModel`;
- UI.

## Próxima etapa segura

Criar `SkillMechanicsReadProjection` na camada de aplicação.

A projeção deve:

1. consumir apenas um relatório global já validado;
2. não receber o Character como fonte alternativa;
3. preservar diagnósticos e proveniência;
4. expor listas compactas de Skills e Techniques para consumidores;
5. não recalcular NH;
6. permanecer separada dos arquivos da UI mobile;
7. somente depois ser incorporada ao `ApplicationReadModel` por contrato explícito.

## Resultado

A resolução global de Skills e Techniques está pronta para consumo por uma projeção de leitura. O risco arquitetural seguinte não é cálculo, mas impedir que a projeção ou a UI recriem regras, descartem diagnósticos ou passem a depender de nomes editoriais.
