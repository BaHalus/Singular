# Templates — Fundação soberana

**Código:** DOM-TEMPLATE-1.0  
**Status:** Implementado  
**Camada:** Domain  
**Tipo:** Agregado, identidade, proveniência e preservação declarativa  
**Decisão:** ADR-0029

Templates representa pacotes de personagem preservados pela SINGULAR. O domínio não se limita a arquivos GCS: ele é a base para raças, modelos raciais, metacaracterísticas, profissões, arquétipos, corpos, formas e pacotes de campanha.

## Regra central

```text
Template declara.
Cada domínio interpreta sua própria contribuição.
O motor calcula.
A UI apenas apresenta e despacha intenção.
```

Um template não é uma alteração já aplicada ao personagem.

A criação ou importação de um pacote:

- não altera atributos;
- não injeta traits no personagem;
- não soma pontos;
- não calcula NH;
- não cria ataques derivados;
- não resolve pré-requisitos;
- não ativa formas;
- não liga referências por nome.

## Estrutura canônica

```js
{
  id: "template-001",
  externalIds: {
    gcs: "external-template-id",
  },
  name: "Anão",
  templateType: "race",
  source: {
    kind: "imported",
    provider: "gcs",
    format: "gct",
    reference: "B261",
    version: 2,
  },
  entries: [],
  importedPoints: 35,
  calculatedPoints: null,
  notes: "",
  tags: [],
  importMeta: {},
  raw: {},
}
```

Esses campos formam a autoridade do pacote em DOM-TEMPLATE-1.0.

## Identidade

`id` é a identidade soberana da SINGULAR.

Regras:

- precisa ser uma string não vazia;
- é única em `Character.templates`;
- não é substituída por ID externo;
- não é derivada do nome;
- não muda quando o nome visível muda.

`externalIds` preserva identidades de GCS, bibliotecas, campanhas e outros fornecedores. IDs externos nunca provocam ligação automática por nome.

## Tipos

`templateType` aceita:

```text
template
race
metaTrait
profession
archetype
body
form
campaignPackage
unknown
```

O tipo `unknown` preserva pacotes cuja classificação ainda não pode ser determinada com segurança.

## Origem

`source` registra a origem declarada do pacote:

```js
{
  kind: "singular" | "imported" | "embedded" | "external" | "unknown",
  provider: string | null,
  format: string | null,
  reference: string | null,
  version: string | number | null,
}
```

Campos adicionais de origem são preservados. A fundação não inventa fornecedor, referência ou versão ausente.

Para payloads legados importados, `importMeta.source` e `importMeta.format` podem alimentar a normalização inicial da origem. Depois da criação, `source` é persistido explicitamente.

## Entradas

`entries` é a coleção canônica de contribuições declaradas.

Cada entrada possui um envelope estável:

```js
{
  id: "template-001:advantage:adv-001",
  domain: "trait",
  entryType: "advantage",
  externalIds: {},
  referenceId: null,
  payload: {
    id: "adv-001",
    name: "Visão Noturna",
    points: 5,
  },
  notes: "",
  tags: [],
  importMeta: null,
  raw: null,
}
```

### Identidade da entrada

- `id` é único dentro do template;
- `referenceId` só existe quando declarado explicitamente;
- nomes iguais não geram vínculo;
- a posição da entrada não é sua identidade;
- entradas desconhecidas permanecem preservadas.

### Domínio e tipo

`domain` identifica quem deverá interpretar a contribuição. Exemplos atuais:

```text
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

`entryType` é aberto. Tipos desconhecidos não são descartados nem convertidos para um tipo conhecido por aproximação.

### Payload opaco

`payload` conserva os dados da contribuição. DOM-TEMPLATE-1.0 só normaliza payloads pertencentes aos domínios já representados no Character. Ele não calcula o resultado mecânico da entrada.

`raw` e `importMeta` preservam dados necessários à auditoria e a importadores futuros.

## Entradas conhecidas atualmente

A fundação reconhece envelopes para:

- vantagens;
- qualidades;
- desvantagens;
- peculiaridades;
- containers de traits;
- perícias;
- técnicas;
- containers e nós auxiliares de perícias;
- mágicas;
- idiomas;
- familiaridades culturais;
- equipamentos;
- nós desconhecidos de cada seção.

DOM-TEMPLATE-1.1 ampliará a composição declarativa para atributos, características secundárias, outros templates e regras especiais. Essa interpretação não pertence ao bloco 1.0.

## Compatibilidade estrutural

O código anterior armazenava contribuições em coleções como:

```text
traits.advantages
traits.disadvantages
skills
techniques
spells
languages
familiarities
equipment
```

Durante a transição arquitetural:

- entradas legadas são convertidas em `entries`;
- as coleções antigas continuam disponíveis como projeções somente leitura;
- as projeções são sempre reconstruídas a partir de `entries`;
- `entries` é a única autoridade;
- save/load persiste tanto a forma canônica quanto o payload de compatibilidade necessário às integrações atuais;
- quando a mesma contribuição aparece em ambas as representações, definições equivalentes são unificadas e definições divergentes são rejeitadas.

Isso permite que Forma Alternativa, Morfose, importadores e operações de incorporação continuem funcionando enquanto os próximos blocos migram para a composição declarativa.

## Pontos

```text
importedPoints   → valor declarado pela fonte
calculatedPoints → valor declarado por um calculador soberano futuro
```

DOM-TEMPLATE-1.0 não calcula nenhum dos dois.

Os valores permanecem separados. Uma divergência não é corrigida nem escondida. Reconciliação e diagnóstico pertencem ao DOM-TEMPLATE-1.4.

Valores negativos são válidos, inclusive em metacaracterísticas.

## Imutabilidade

Templates e suas entradas são profundamente imutáveis depois de criados.

Consequências:

- a entrada original do chamador é clonada;
- `raw`, `externalIds`, `source`, `entries` e payloads não compartilham referências mutáveis com o chamador;
- operações de domínio não modificam o pacote existente;
- uma atualização futura deverá produzir outro template e substituir a referência explicitamente;
- operações de incorporação clonam componentes para o Character sem alterar o pacote.

## Dados desconhecidos

A regra de preservação é:

```text
não reconhecido ≠ inválido
não resolvido ≠ ausente
```

Uma entrada desconhecida continua em `entries` com:

- identidade;
- domínio declarado ou `unknown`;
- `entryType` original;
- IDs externos;
- payload;
- metadados de importação;
- dados brutos.

Nenhum dado é descartado apenas porque o motor ainda não sabe interpretá-lo.

## Relação com Character

```text
Character
├── templates
│   └── Template imutável
└── templateApplications
    └── histórico de incorporações
```

Armazenar um template em `Character.templates` não significa aplicá-lo.

## Incorporação atual

As operações existentes continuam disponíveis:

```js
incorporateTemplate(character, templateId)
removeTemplateApplication(character, applicationId)
removeTemplatePackage(character, templateId)
```

`incorporateTemplate` usa as projeções conhecidas para clonar componentes e registrar proveniência. Essa operação será substituída pelo fluxo soberano de análise, plano, revalidação e aplicação no DOM-TEMPLATE-1.3.

Até lá:

- o pacote original permanece imutável;
- componentes aplicados recebem novos IDs;
- proveniência é registrada;
- técnicas são remapeadas para perícias clonadas;
- equipamentos são clonados recursivamente;
- uma aplicação ativa impede remoção do pacote.

## Save/load

A serialização preserva:

- identidade SINGULAR;
- IDs externos;
- tipo;
- origem;
- entradas conhecidas e desconhecidas;
- valores importado e calculado;
- notas e tags;
- metadados de importação;
- documento bruto;
- projeções temporárias de compatibilidade.

O round trip:

```text
createTemplate
→ serializeTemplates
→ createTemplates
```

não deve perder informação nem criar novos vínculos.

## Não responsabilidades

DOM-TEMPLATE-1.0 não:

- compõe templates dentro de templates;
- resolve ciclos;
- aplica pacotes ao Character por plano;
- calcula pontos;
- reconcilia custos;
- interpreta atributos ou secundárias;
- resolve traits, perícias, mágicas ou equipamentos;
- satisfaz pré-requisitos;
- cria ataques;
- ativa Forma Alternativa ou Morfose;
- resolve referência externa por nome;
- calcula na UI.

## Próximos blocos

```text
DOM-TEMPLATE-1.1 — composição declarativa
DOM-TEMPLATE-1.2 — dependências e composição
DOM-TEMPLATE-1.3 — aplicação ao Character
DOM-TEMPLATE-1.4 — custo e reconciliação
DOM-TEMPLATE-1.5 — importação e fechamento
```
