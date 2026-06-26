# GATE-APP-CORE-1.1 — Application Read Model v2

**Status:** Fechamento proposto para revisão  
**Data:** 2026-06-26  
**Escopo:** APP-SKILL-1.5 e APP-CORE-1.1

## Objetivo

Certificar que a mecânica global de Skills e Techniques pode ser entregue aos consumidores pelo único `ApplicationReadModel` canônico, sem recalcular regras, interpretar defaults externos, depender de nomes ou persistir resultados derivados no Character.

## Autoridades preservadas

### Character

O Character continua sendo a fonte persistente de:

- identidade;
- atributos declarados;
- Skills e Techniques estruturais;
- dados editoriais e importados;
- demais agregados do personagem.

O Character não recebe NH calculado, relatório global ou projeção de leitura.

### Point Ledger

O Point Ledger continua sendo a única fonte contábil no read model.

A mecânica de Skills não altera totais, entradas ou diagnósticos contábeis.

### Motores de Skills e Techniques

Os motores continuam sendo as únicas autoridades de:

- nível efetivo de atributos;
- progressão treinada;
- defaults;
- seleção do resultado final;
- progressão e teto de Techniques;
- diagnósticos mecânicos.

### Aplicação

A aplicação:

- constrói planos com identidades canônicas;
- coordena os motores;
- valida relatórios;
- projeta resultados para leitura;
- verifica a pertença ao mesmo Character;
- compõe o read model central.

Ela não contém fórmulas de GURPS.

### UI

A UI recebe projeções prontas. Ela não interpreta `basis`, não escolhe entre treinado e default e não recalcula NH.

## Entrega APP-SKILL-1.5

`SkillMechanicsReadProjection` consome somente um relatório global validado e produz:

```js
{
  schemaVersion: 1,
  characterId,
  attributes: {
    ST,
    DX,
    IQ,
    HT,
  },
  skills: [],
  techniques: [],
  diagnostics: []
}
```

A projeção:

- usa IDs canônicos;
- preserva ordem;
- preserva `status`, `level`, `relativeLevel` e `basis`;
- preserva `appliedModifierIds`;
- preserva diagnósticos completos;
- distingue resultado final, treinado e avaliações de defaults;
- rejeita identidades duplicadas;
- rejeita bases incompatíveis;
- rejeita propriedades editoriais inesperadas;
- não contém nomes, especializações, pontos ou dificuldades;
- é destacada das entradas e profundamente imutável.

## Entrega APP-CORE-1.1

`ApplicationReadModel` evolui para schema version 2:

```js
{
  schemaVersion: 2,
  session,
  character,
  pointLedger,
  skillMechanics,
}
```

Criação:

```js
createApplicationReadModel(session, {
  skillMechanics,
})
```

Regras:

- a opção pode ser omitida;
- o campo serializado sempre existe;
- ausência produz `skillMechanics: null`;
- presença exige `SkillMechanicsReadProjection` válida;
- `skillMechanics.characterId` precisa corresponder ao Character atual;
- opções extras são rejeitadas;
- snapshots v1 são rejeitados;
- serialização é destacada;
- o modelo inteiro é profundamente imutável.

## Significado de ausência

`skillMechanics: null` significa apenas que a aplicação não recebeu uma projeção canônica.

Não significa:

- usar `importedLevel`;
- resolver por nome;
- interpretar `Skill.defaults`;
- calcular na UI;
- produzir resultados parciais por heurística.

## Evidências

- PR #100, `APP-SKILL 1.5: projetar mecânica para leitura`;
- merge `6e29756`;
- Tests #834 concluída com sucesso sobre a `main` que já continha UI-MOBILE 0.1;
- PR #100 sem comentários ou threads bloqueantes no momento da integração;
- PR #101, `APP-CORE 1.1: anexar mecânica de Skills ao read model`;
- merge `de4ca57`;
- Tests #839 concluída com sucesso sobre a `main` que já continha UI mobile e contrato Equipment MVP;
- PR #101 sem comentários ou threads bloqueantes no momento da integração.

## Cobertura de regressão

A suíte protege:

- projeção resolvida completa;
- ausência de nomes e dados editoriais;
- atributos bloqueados;
- defaults bloqueados;
- Techniques bloqueadas;
- preservação de proveniência;
- ordem de Skills, candidatos e Techniques;
- projeção vazia;
- ausência de mutação;
- congelamento profundo;
- serialização destacada;
- identidades duplicadas;
- consistência entre status e valores;
- bases permitidas por tipo de resultado;
- modificadores duplicados;
- propriedades extras;
- reconstrução independente da ordem de chaves;
- read model sem mecânica;
- read model com mecânica válida;
- projeção pertencente a outro Character;
- opções ocultas de cálculo;
- snapshots v1 incompletos;
- preservação das capacidades de undo/redo e do Point Ledger.

## Regressões proibidas

- criar segundo `ApplicationReadModel`;
- fazer o read model construir candidatos de default;
- fazer o read model executar o plano global;
- usar o Character como fallback dentro de `SkillMechanicsReadProjection`;
- incluir nomes editoriais na projeção mecânica;
- resolver entidades por nome;
- usar valores importados como autoridade;
- persistir a projeção dentro do Character ou sessão;
- alterar Point Ledger por meio da projeção;
- calcular NH na UI;
- tratar `null` como permissão para heurística.

## Limites deste gate

Não estão certificados:

- adapter de defaults externos;
- construção automática de `SkillMechanicsResolutionPlan` a partir da sessão;
- atualização incremental da projeção após comandos;
- modificadores externos;
- integração visual da seção mobile de Skills e Techniques;
- persistência concreta do read model;
- mecânica de outros domínios no read model.

## Próxima etapa segura

Definir o adapter canônico de defaults de Skills.

O adapter deve:

1. receber payload externo explícito e contexto de identidade;
2. produzir `SkillDefaultCandidate` ou diagnóstico portátil;
3. nunca calcular NH;
4. nunca resolver por nome sem uma política de identidade separada;
5. preservar o payload original para auditoria;
6. permanecer fora do motor mecânico;
7. permitir que uma futura orquestração gere `skillMechanics` automaticamente para o read model.

## Resultado

O único `ApplicationReadModel` canônico agora pode transportar a mecânica soberana de Skills e Techniques sem assumir responsabilidade de cálculo. A lacuna restante é transformar defaults externos em candidatos canônicos, não recalcular ou redesenhar a mecânica já fechada.
