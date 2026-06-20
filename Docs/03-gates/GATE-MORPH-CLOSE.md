# GATE-MORPH-CLOSE — Certificação de encerramento da Morfose

**Status:** Aprovado mediante CI canônica verde  
**Domínios:** Forma Alternativa e Morfose  
**Decisão final:** ADR-0028

## Objetivo

Certificar que DOM-MORPH-1.5 encerra o domínio de Morfose sem criar pipeline paralelo e que o subsistema permanece íntegro de análise até save/load.

## Resultado

```text
Forma Alternativa — fechado
Morfose — fechado
APIs públicas de Morfose — estáveis
Próxima frente — DOM-TEMPLATE-1.0
```

## Matriz de certificação

### Limite geral

**Certificado por:**

- `MorphPointLimit.test.js`;
- `MorphClosureGate.test.js`;
- `MorfosePointLimit.md`;
- ADR-0027.

Casos:

- igualdade com o teto;
- abaixo do teto;
- acima do teto;
- valor negativo de template preservado pela comparação;
- teto finito;
- teto ilimitado;
- teto não declarado.

### Limite específico de improvisação

**Certificado por:**

- `MorphPointLimit.test.js`;
- `MorphPointLimitPartial.test.js`;
- `MorphImprovisationOperations.test.js`;
- `MorphClosureGate.test.js`.

Casos:

- teto geral e específico simultâneos;
- escolha do menor teto;
- política parcial;
- pontos desconhecidos sob teto parcial;
- `Ilimitada` sem apagar teto específico declarado.

### Formas conhecidas

**Certificado por:**

- `MorphKnownFormMaterialization.test.js`;
- `MorphKnownFormSelection.test.js`;
- `FormTransitionExecutorMorphReceipt.test.js`;
- `MorphClosureGate.test.js`.

Casos:

- identidade por `knownFormId` e `templateId`;
- materialização idempotente;
- template ausente ou não resolvido;
- forma indisponível ou esquecida;
- fingerprint obsoleto;
- atualização explícita;
- ativação pelo planner e executor existentes.

### Formas improvisadas

**Certificado por:**

- `MorphImprovisationOperations.test.js`;
- `MorphPointLimitPartial.test.js`;
- `MorphClosureGate.test.js`.

Casos:

- política padrão;
- evidência desconhecida;
- Cósmica;
- Ilimitada;
- projeção transitória;
- idempotência;
- refresh e descarte apenas quando inativa;
- persistência do snapshot e da proveniência;
- ativação pelo pipeline de Forma Alternativa.

### Limite ausente, desconhecido, parcial, limitado e ilimitado

**Certificado por:**

- `MorphProfile.test.js`;
- `MorphPointLimit.test.js`;
- `MorphPointLimitPartial.test.js`;
- `MorphClosureGate.test.js`.

Semântica:

```text
undeclared → não verificado
partial    → uma política conhecida, outra ausente
limited    → teto finito
unlimited  → sem teto geral
unknown template points + finite cap → pending
```

### Análise

As análises de forma conhecida e de improvisação agora expõem a avaliação canônica de `MorphPointLimit`.

A análise estrutural e a materialização permanecem distintas da autorização de ativação. Uma projeção inativa pode existir acima do teto; o planner bloqueia a transformação.

**Certificado por:**

- `MorphKnownFormMaterialization.test.js`;
- `MorphImprovisationOperations.test.js`;
- `MorphClosureGate.test.js`.

### Planejamento

`FormTransitionPlanner`:

- recebe a seleção conhecida ou improvisada;
- aplica `MorphPointLimit`;
- agrega razões;
- produz `ready`, `pending` ou `blocked`;
- inclui a avaliação e a identidade da improvisação no fingerprint.

**Certificado por:**

- `MorphPointLimit.test.js`;
- `MorphPointLimitPartial.test.js`;
- `MorphKnownFormSelection.test.js`;
- `MorphClosureGate.test.js`.

### Execução e atomicidade

`FormTransitionExecutor`:

- replaneja com o estado atual;
- rejeita plano não executável;
- compara fingerprints;
- consome recursos e ativa atomicamente;
- não expõe mutação parcial em falha.

**Certificado por:**

- `FormTransitionExecutor.test.js`;
- `MorphKnownFormSelection.test.js`;
- `MorphClosureGate.test.js`.

### Planos obsoletos

Mudanças em forma ativa, catálogo, template, política, limite, pontos ou regras efetivas invalidam o plano ou fazem a revalidação falhar.

**Certificado por:**

- `FormTransitionExecutor.test.js`;
- `MorphKnownFormSelection.test.js`;
- `MorphImprovisationOperations.test.js`;
- `MorphClosureGate.test.js`.

### Recibos e histórico

Recibos e eventos `transition-executed` preservam:

```text
morphKnownFormId
morphImprovisationId
morphPointLimitEvaluation
```

**Certificado por:**

- `FormTransitionExecutorMorphReceipt.test.js`;
- `FormTransitionHistoryOperations.test.js`;
- `MorphClosureGate.test.js`.

### Save/load e proveniência

Sobrevivem à serialização:

- perfil e resolução;
- catálogo e histórico;
- forma materializada;
- `morphMaterialization`;
- `morphImprovisation`;
- forma ativa;
- runtime;
- recibo registrado no histórico;
- avaliação de limite executada.

**Certificado por:**

- `MorphKnownFormMaterialization.test.js`;
- `MorphImprovisationOperations.test.js`;
- `MorphClosureGate.test.js`;
- testes de serialização de Character e AlternateForms.

### Regressão de Forma Alternativa

Morfose continua usando:

```text
AlternateFormSet
FormTransitionPlanner
FormTransitionExecutor
FormTransitionRuntime
FormTransitionHistory
```

Nenhum planner, executor, runtime ou histórico paralelo foi criado.

**Certificado por:**

- suíte completa `npm test`;
- `FormTransitionPlanner.test.js`;
- `FormTransitionExecutor.test.js`;
- `AlternateFormOperations.test.js`;
- `MorphClosureGate.test.js`.

### Regressão DOM-MORPH-1.0 a 1.5

A CI canônica executa descoberta integral por:

```text
npm test
→ node --test
```

O gate não reduz a suíte a arquivos específicos.

## Lacunas encontradas e fechadas pelo gate

1. análises antigas ainda carregavam `deferred-to-dom-morph-1.5`;
2. o fingerprint não declarava explicitamente `improvisationId`;
3. recibos não preservavam a identidade da improvisação;
4. recibos não registravam a avaliação de limite usada na execução;
5. faltava uma regressão vertical única cobrindo análise, plano, execução, histórico e save/load.

Correções:

- análise conhecida e improvisada usa `MorphPointLimit`;
- `improvisationId` participa da projeção de fingerprint;
- recibos incluem `morphImprovisationId`;
- recibos incluem `morphPointLimitEvaluation`;
- `MorphClosureGate.test.js` certifica a fatia vertical completa.

## Política após o fechamento

Morfose entra em manutenção fechada.

Não abrir:

```text
DOM-MORPH-1.6
```

Uma demanda nova deve ser classificada primeiro como:

- DOM-TEMPLATE;
- DOM-TRAIT;
- DOM-POINTS;
- importação;
- aplicação;
- UI.

Reabertura de Morfose exige ADR próprio e repetição integral deste gate.
