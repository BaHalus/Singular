# Traits — Grupos alternativos e autoridade final

**Código:** DOM-TRAIT-1.5  
**Status:** Implementado, sujeito ao gate final  
**Camada:** Domain  
**Decisão:** ADR-0040

Este documento estende `Traits.md`, cuja descrição detalhada cobre DOM-TRAIT-1.0 a 1.4. Nos pontos em que a especificação anterior declara grupos alternativos ou promoção final como pendentes, este documento é a autoridade posterior.

## Regra central

```text
TraitFinalCost calcula o custo individual.
TraitAlternativeGroups calcula a contribuição entre Traits.
TraitCostAuthority promove somente a contribuição final.
Point Ledger apenas agregará resultados já autorizados.
```

```text
custo individual ≠ contribuição final
contribuição final ≠ total do Character
```

## Política persistente do grupo

A autoridade dos grupos alternativos é:

```text
Character.traitAlternativeGroups
```

Cada política possui:

```js
{
  id,
  externalIds,
  alternativeFactor,
  roundCostDown,
  source,
  importMeta,
  raw,
}
```

Os membros continuam sendo Traits canônicos. A associação é declarada exclusivamente por:

```text
Trait.alternateGroupId → TraitAlternativeGroupPolicy.id
```

Nome, rótulo visual, posição e custo não constituem identidade.

Entradas antigas que já possuam `alternateGroupId` recebem uma política padrão derivada, sem criar outro conjunto de membros.

## Regra de custo do grupo

A avaliação primeiro calcula o custo individual completo de todos os membros mediante `TraitFinalCost`.

Para um grupo válido:

1. o membro de maior custo individual é a habilidade primária;
2. a primária contribui com o custo integral;
3. os demais membros contribuem com `individualPoints × alternativeFactor`;
4. o fator padrão é `0.2`;
5. o arredondamento ocorre após o fator do grupo;
6. `roundCostDown: false` arredonda para cima;
7. `roundCostDown: true` arredonda para baixo.

Um grupo válido exige:

- pelo menos dois membros;
- somente Traits com papel `advantage`;
- custos individuais prontos e não negativos;
- no máximo uma primária explícita;
- primária explícita situada entre os membros de maior custo.

Em empate sem primária explícita, a escolha é determinística pelo ID soberano. Isso não cria vínculo por nome.

Estados propagados:

```text
ready
incomplete
conflict
unsupported
```

## Importação GCS

Containers GCS com:

```text
container_type: alternative_abilities
```

produzem uma política persistente cujo ID é o ID estrutural do container.

Os descendentes recebem o ID do container alternativo mais próximo. Containers aninhados não associam membros por nome nem duplicam o agregado de Traits.

São preservados:

- IDs externos;
- referência;
- `round_down`;
- metadados de importação;
- corpo bruto do container;
- pontos importados individuais de cada Trait.

O importador declara estrutura. Ele não promove custo final.

## Avaliação da autoridade final

`analyzeTraitCostAuthority` compõe:

1. escolhas obrigatórias de cada Trait;
2. custo individual soberano;
3. política dos grupos alternativos;
4. contribuição final de cada Trait;
5. estado já persistido no alvo.

Estados da análise:

```text
ready
no-op
incomplete
conflict
unsupported
```

`no-op` exige que todos os Traits tenham:

- autoridade final vinculada ao mesmo fingerprint de fonte;
- `calculatedPoints` igual à contribuição atual.

## Fingerprints distintos

A operação mantém dois fingerprints independentes.

### Fonte mecânica

Inclui:

- identidade do Character;
- política percentual;
- declarações estruturais de pontos;
- modificadores;
- autocontrole e frequência;
- escolhas;
- associação e primária de grupo;
- políticas persistentes dos grupos.

Exclui o valor que a própria operação irá gravar.

### Alvo persistente

Inclui:

- `pointValue.calculatedPoints` atual;
- `pointValue.finalCostAuthority` atual.

Assim, tanto mudanças nas regras quanto alterações concorrentes no alvo invalidam o plano.

## Plano

`planTraitCostAuthority` produz um artefato efêmero e profundamente imutável contendo:

```js
{
  schemaVersion,
  id,
  operationId,
  plannedAt,
  characterId,
  percentageMode,
  status,
  sourceFingerprint,
  targetFingerprint,
  analysisFingerprint,
  planFingerprint,
  analysis,
}
```

O plano não é autoridade persistente e não altera o Character.

## Execução atômica

`executeTraitCostAuthorityPlan`:

1. valida Character e plano;
2. confirma a identidade do Character;
3. refaz a análise;
4. compara o fingerprint integral;
5. bloqueia planos obsoletos;
6. exige estado `ready` ou aceita `no-op`;
7. constrói todas as autoridades em memória;
8. reconstrói o Character uma única vez;
9. valida o novo agregado;
10. emite recibo imutável.

Nenhum Trait é atualizado isoladamente antes da validação do conjunto.

## Autoridade persistida

Cada Trait promovido recebe:

```js
pointValue: {
  calculatedPoints,
  finalCostAuthority: {
    schemaVersion,
    operationId,
    appliedAt,
    characterId,
    traitId,
    sourceFingerprint,
    analysisFingerprint,
    planFingerprint,
    groupId,
    groupRole,
    individualPoints,
    contributionPoints,
    finalCost,
    choices,
    groupPolicy,
  }
}
```

`calculatedPoints` representa a contribuição final após todas as regras proprietárias de Traits:

- Trait isolado: custo individual;
- primária de grupo: custo individual integral;
- alternativa: custo individual multiplicado e arredondado pela política do grupo.

A autoridade é autovalidável. Ela exige custo individual e escolhas em estado `ready` e verifica novamente a contribuição da primária ou alternativa.

## Reconciliação

A promoção não altera:

```text
declaredPoints
importedPoints
legacyPoints
```

A reconstrução de `pointValue` refaz a reconciliação.

É esperado que uma habilidade alternativa importada apresente:

```text
importedPoints = custo individual externo
calculatedPoints = contribuição descontada do grupo
reconciliation.status = divergent
```

Essa divergência é informação correta e não um erro a ser apagado.

## Recibo

O recibo preserva:

- operação e plano;
- Character;
- horário de execução;
- estado aplicado ou sem efeito;
- fingerprints de fonte, alvo anterior, alvo posterior, análise e plano;
- cópia serializada de cada autoridade promovida.

## Save/load

`serializeCharacter` preserva:

- políticas dos grupos;
- associação dos Traits;
- `calculatedPoints`;
- autoridade final completa;
- evidências declaradas e importadas.

Na reconstrução, `validateCharacter` confere:

- identidade do Character e do Trait na autoridade;
- consistência da contribuição;
- consistência do custo individual e das escolhas;
- coerência entre `calculatedPoints` e a autoridade.

## APIs públicas do bloco

```text
TraitAlternativeGroupPolicies.js
TraitAlternativeGroups.js
TraitCostSourceProjection.js
TraitCostAuthorityAnalysis.js
TraitCostAuthorityPlan.js
TraitCostAuthorityExecutor.js
TraitFinalCostAuthority.js
```

## Relação com Point Ledger

DOM-TRAIT-1.5 encerra a interpretação proprietária de pontos de Traits.

O futuro DOM-POINTS pode consumir:

```text
Trait.pointValue.calculatedPoints
```

somente quando acompanhado de autoridade final válida.

O Point Ledger não deve:

- reinterpretar modificadores;
- repetir autocontrole ou frequência;
- recalcular grupos alternativos;
- escolher entre pontos importados, declarados e calculados;
- criar outra autoridade de custo de Traits.

## Não responsabilidades

DOM-TRAIT-1.5 não:

- soma o total de pontos do Character;
- resolve pré-requisitos;
- aplica features a outros domínios;
- cria ataques;
- altera Templates, Morfose ou Forma Alternativa;
- calcula na UI;
- associa entidades por nome.
