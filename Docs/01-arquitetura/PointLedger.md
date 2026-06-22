# Point Ledger — Agregação soberana de pontos

**Código:** DOM-POINTS-1.0  
**Status:** Implementado mediante CI canônica verde  
**Camada:** Domain  
**Tipo:** Projeção derivada e explicável  
**Decisão:** ADR-0041

## Regra central

```text
Cada domínio proprietário calcula suas próprias contribuições.
O Point Ledger valida, agrega, reconcilia e explica.
A UI apenas apresenta o resultado e coleta intenções.
```

O Point Ledger não recalcula Traits, atributos, perícias ou qualquer outra regra mecânica. Ele consome autoridades produzidas pelos respectivos domínios.

## Autoridades

### Persistente

```text
Character.pointBudget
```

é a autoridade persistente do orçamento de pontos.

Ela preserva separadamente:

```js
{
  declaredPoints,
  importedPoints,
  importedUnspentPoints,
  source,
  importMeta,
  notes,
  raw,
}
```

### Derivada

```js
evaluateCharacterPointLedger(character)
```

produz o ledger atual. O ledger não é persistido no Character e deve ser recalculado a partir das autoridades presentes.

```text
persistência ≠ projeção
orçamento ≠ gasto
valor importado ≠ valor calculado
```

## Estrutura do ledger

```js
{
  schemaVersion,
  characterId,
  status,
  complete,
  spendingComplete,
  pointBudget,
  budget,
  domainReports,
  contributions,
  discrepancies,
  totals,
  diagnostics,
}
```

### Estados

```text
ready
partial
blocked
conflict
```

- `ready`: todos os domínios obrigatórios estão completos e o orçamento possui autoridade reconciliada;
- `partial`: há dados pendentes ou orçamento desconhecido, sem impossibilidade mecânica;
- `blocked`: ao menos um domínio obrigatório contém contribuição não suportada;
- `conflict`: o orçamento declarado/importado diverge ou a importação possui conflito.

## Orçamento de pontos

Estados de reconciliação:

```text
unknown
declared-only
imported-only
reconciled
divergent
conflict
```

`effectivePoints` só existe quando há uma autoridade única ou quando declaração e importação coincidem.

Em `divergent` ou `conflict`, o domínio preserva ambas as autoridades e não escolhe vencedor.

Campos textuais vazios ou contendo apenas espaços são normalizados para `null`, nunca para zero.

Quando o total gasto está completo:

```text
calculatedUnspentPoints = effectivePoints - totalSpentPoints
```

O valor importado de pontos não gastos permanece separado e gera discrepância quando diverge do calculado.

## Contribuições

Cada contribuição possui identidade e proveniência:

```js
{
  id,
  characterId,
  domain,
  category,
  sourceId,
  sourceType,
  status,
  points,
  authorityFingerprint,
  declaredPoints,
  importedPoints,
  reconciliation,
  provenance,
  diagnostics,
}
```

Estados conhecidos:

```text
ready
pending
unsupported
```

Somente contribuições `ready` entram em `knownSpentPoints`.

Uma contribuição `unsupported` em domínio obrigatório bloqueia o ledger, mesmo quando o mesmo domínio também possui contribuições prontas.

## Relatórios por domínio

Cada domínio entrega um `PointDomainReport` com:

- identidade do domínio;
- categorias de pontos;
- completude;
- contribuições;
- total conhecido;
- total final quando completo;
- fingerprint da fonte;
- diagnósticos.

O ledger não lê campos arbitrários do Character para calcular custos. Toda entrada deve vir de um relatório de domínio.

## Integração atual dos domínios

### Traits

O domínio de Traits está integrado de forma soberana.

Cada Trait com `pointValue.finalCostAuthority` gera uma contribuição pronta usando:

```text
pointValue.calculatedPoints
```

O fingerprint preserva operação, fonte, análise, plano e contribuição final. Pontos importados continuam como trilha independente e podem gerar discrepância.

### Atributos e características secundárias

Produzem contribuições pendentes até que seus domínios possuam autoridades próprias de custo.

### Perícias, técnicas, magia, idiomas e familiaridades culturais

Coleções vazias são completas com custo zero. Itens existentes permanecem pendentes até que cada domínio forneça sua autoridade mecânica.

### Poderes

Permanecem pendentes enquanto DOM-POWER não estiver aberto.

### Templates

O custo direto de Templates é excluído do total para evitar dupla contagem, pois aplicações materializam componentes nos domínios proprietários.

Valores importados e calculados de catálogo continuam visíveis como discrepâncias informativas.

### Equipamento

É explicitamente excluído do custo de personagem.

## Discrepâncias

Discrepância não é correção automática.

Ela registra diferenças como:

```text
importado × calculado
orçamento declarado × importado
pontos não gastos importados × calculados
catálogo de Template × cálculo do Template
```

Estados divergentes permanecem observáveis. O ledger nunca sobrescreve a fonte externa nem altera o Character.

## Totais

```js
{
  knownSpentPoints,
  totalSpentPoints,
  byDomain,
  byCategory,
}
```

- `knownSpentPoints`: soma apenas contribuições prontas;
- `totalSpentPoints`: existe somente quando todos os domínios obrigatórios estão completos;
- `byDomain`: visão por autoridade proprietária;
- `byCategory`: visão por categoria de ficha.

```text
total conhecido ≠ total completo
```

## Importação GCS

O importador procura as variantes conhecidas de:

```text
total_points
totalPoints
total_points_raw
totalPointsRaw
unspent_points
unspentPoints
unspent_points_raw
unspentPointsRaw
```

As variantes podem existir na raiz ou em `profile`.

- um único valor coerente é preservado;
- valores divergentes geram conflito;
- valores inválidos geram diagnóstico;
- todas as candidatas e valores brutos permanecem em `importMeta` e `raw`;
- a importação não calcula gastos nem escolhe entre fontes divergentes.

## Imutabilidade e validação

Budgets, contribuições, relatórios, discrepâncias e ledgers são profundamente imutáveis.

O ledger valida:

- identidade única das contribuições;
- identidade única dos domínios;
- identidade única das discrepâncias;
- pertencimento ao mesmo Character;
- consistência entre relatórios e lista achatada;
- totais conhecidos e completos;
- estados e flags de completude;
- reconciliação do orçamento.

## Não responsabilidades

DOM-POINTS-1.0 não:

- calcula custo de Traits;
- calcula atributos ou características secundárias;
- calcula perícias, técnicas ou magia;
- calcula Poderes;
- soma diretamente valores de Templates;
- altera valores do Character;
- resolve divergências escolhendo uma fonte;
- persiste o ledger derivado;
- calcula na UI.

## API pública

```text
PointBudget.js
PointContribution.js
PointDomainReport.js
PointDiscrepancy.js
PointFingerprint.js
PointLedger.js
TraitPointDomain.js
CharacterPointDomains.js
CharacterPointLedger.js
```

Novos domínios devem integrar-se produzindo relatórios e contribuições, sem modificar o agregador central para reproduzir suas regras.
