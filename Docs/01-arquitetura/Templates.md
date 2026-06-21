# Templates — Domínio soberano

**Código:** DOM-TEMPLATE-1.0 a 1.5  
**Status:** Fechado mediante gate e CI canônica verde  
**Camada:** Domain  
**Decisões:** ADR-0029 a ADR-0034

Templates representa pacotes de personagem preservados pela SINGULAR: raças, modelos raciais, metacaracterísticas, profissões, arquétipos, corpos, formas e pacotes de campanha.

## Regra central

```text
Template declara.
O domínio proprietário interpreta.
O motor calcula.
A UI apresenta e despacha intenção.
```

Armazenar ou importar um Template não o aplica ao Character.

## Estrutura canônica

```js
{
  id,
  externalIds,
  name,
  templateType,
  source,
  entries,
  importedPoints,
  calculatedPoints,
  notes,
  tags,
  importMeta,
  raw,
}
```

`id` é a identidade soberana. Nome, posição e ordem nunca criam vínculos.

## Entries

`entries` é a única autoridade persistente das contribuições:

```js
{
  id,
  domain,
  entryType,
  externalIds,
  referenceId,
  payload,
  notes,
  tags,
  importMeta,
  raw,
}
```

Coleções históricas continuam como projeções de compatibilidade reconstruídas a partir de `entries`.

## DOM-TEMPLATE-1.0 — Fundação

Estabelece:

- identidade soberana;
- origem e IDs externos;
- entries abertas;
- imutabilidade;
- preservação de dados desconhecidos;
- save/load canônico;
- compatibilidade estrutural temporária.

Documento: `Templates.md`.  
Decisão: ADR-0029.

## DOM-TEMPLATE-1.1 — Composição declarativa

Permite contribuições declarativas para:

```text
attribute
secondaryCharacteristic
trait
skill
magic
language
culture
equipment
template
rule
unknown
```

A projeção classifica referências, snapshots inline, regras e entradas opacas, sem interpretar payloads.

Documento: `TemplateComposition.md`.  
Decisão: ADR-0030.

## DOM-TEMPLATE-1.2 — Dependências

`templateReference` forma um grafo explícito. O resolver produz:

- referências internas e externas;
- ordem determinística;
- ciclos;
- dependências ausentes;
- conflitos explícitos;
- trilhas completas de proveniência;
- estados `ready`, `pending` e `blocked`.

Documento: `TemplateDependencyResolver.md`.  
Decisão: ADR-0031.

## DOM-TEMPLATE-1.3 — Aplicação

Fluxo soberano:

```text
análise
→ plano
→ revalidação
→ execução atômica
→ recibo
```

Suporta aplicação, remoção e atualização de versão. `templateApplications` preserva escolhas, composição resolvida, proveniência, linhagem e histórico append-only.

Documento: `TemplateApplicationOperations.md`.  
Decisão: ADR-0032.

## DOM-TEMPLATE-1.4 — Pontos

Mantém autoridades separadas:

```text
importedPoints
calculatedPoints
difference
reconciliation status
```

A reconciliação nunca sobrescreve valores. Composições só são totalizadas quando a resolução está `ready`.

Documento: `TemplatePointReconciliation.md`.  
Decisão: ADR-0033.

## DOM-TEMPLATE-1.5 — Importação

O parser GCT existente permanece único. A camada soberana acrescenta:

- identidade determinística para pacotes anônimos;
- análise, plano e revalidação;
- relatório e recibo;
- representação opaca de nós desconhecidos;
- conflitos de identidade explícitos;
- políticas de mesclagem de catálogo;
- integração diagnóstica com `CharacterImporter`.

Documento: `TemplateImportOperations.md`.  
Decisão: ADR-0034.

## Save/load e proveniência

Sobrevivem ao round trip:

```text
Template e entries
origem e IDs externos
pontos importados e calculados
dependências declaradas
aplicações e escolhas
linhagem de atualização
histórico e recibos
proveniência dos componentes
```

## Relação com Forma Alternativa e Morfose

Templates fornece identidade, armazenamento, composição e aplicação de pacotes. Forma Alternativa e Morfose continuam usando seus próprios planners, executores, runtimes e históricos congelados.

Nenhuma API desses domínios foi substituída.

## Relação com DOM-POINTS

DOM-TEMPLATE reconcilia valores declarados por pacote. O orçamento total do Character continua pertencendo ao futuro DOM-POINTS.

## Não responsabilidades

DOM-TEMPLATE não:

- calcula NH;
- interpreta regras de outros domínios;
- resolve pré-requisitos;
- cria ataques derivados finais;
- agrega o orçamento global do personagem;
- aplica pacote durante a importação;
- vincula identidades por nome;
- calcula na UI.

## Política após fechamento

Não abrir `DOM-TEMPLATE-1.6` sem ADR próprio.

Uma demanda nova deve ser classificada primeiro como:

```text
DOM-TRAIT
DOM-SKILL
DOM-EQUIPMENT
DOM-POINTS
importação de outro formato
aplicação
UI
```

Reabertura exige repetição integral do `GATE-TEMPLATE-CLOSE`.
