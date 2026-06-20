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

A criação ou importação de um pacote não altera atributos, não injeta componentes no personagem, não soma pontos, não calcula NH, não cria ataques derivados, não resolve pré-requisitos, não ativa formas e não liga referências por nome.

## Estrutura canônica

```js
{
  id: "template-001",
  externalIds: { gcs: "external-template-id" },
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

## Identidade

`id` é a identidade soberana da SINGULAR. Precisa ser uma string não vazia, é única em `Character.templates`, não é substituída por ID externo, não é derivada do nome e não muda quando o nome visível muda.

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

`source` registra a origem declarada:

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

Para payloads legados importados, `importMeta.source` e `importMeta.format` podem alimentar a normalização inicial. Depois da criação, `source` é persistido explicitamente.

## Entradas

`entries` é a coleção canônica de contribuições declaradas.

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
- a posição não define identidade;
- entradas desconhecidas permanecem preservadas.

### Domínio e tipo

`domain` identifica quem deverá interpretar a contribuição:

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

`entryType` é aberto. Tipos desconhecidos não são descartados nem convertidos por aproximação.

### Payload

`payload` conserva os dados da contribuição. DOM-TEMPLATE-1.0 só normaliza payloads pertencentes aos domínios já representados no Character. Ele não calcula o resultado mecânico da entrada.

`raw` e `importMeta` preservam dados necessários à auditoria e a importadores futuros.

## Entradas conhecidas atualmente

A fundação reconhece envelopes para traits, containers de traits, perícias, técnicas, nós auxiliares, mágicas, idiomas, familiaridades culturais, equipamentos e nós desconhecidos de cada seção.

DOM-TEMPLATE-1.1 ampliará a composição declarativa para atributos, características secundárias, outros templates e regras especiais.

## Compatibilidade estrutural

O código anterior armazenava contribuições em coleções como `traits.advantages`, `skills`, `spells` e `equipment`.

Durante a transição:

- entradas legadas são convertidas em `entries`;
- as coleções antigas permanecem como projeções somente leitura;
- as projeções são reconstruídas a partir de `entries`;
- `entries` é a única autoridade;
- save/load persiste a forma canônica e o payload de compatibilidade necessário às integrações atuais;
- quando a mesma contribuição aparece nas duas representações, definições equivalentes são unificadas e definições divergentes são rejeitadas.

Isso mantém Forma Alternativa, Morfose, importadores e operações de incorporação operantes enquanto os próximos blocos migram para a composição declarativa.

## Pontos

```text
importedPoints   → valor declarado pela fonte
calculatedPoints → valor declarado por um calculador soberano futuro
```

DOM-TEMPLATE-1.0 não calcula nenhum dos dois. Divergências são preservadas para reconciliação no DOM-TEMPLATE-1.4. Valores negativos são válidos.

## Imutabilidade

Templates e entradas são profundamente imutáveis depois de criados.

- a entrada original é clonada;
- dados aninhados não compartilham referências mutáveis com o chamador;
- operações não modificam o pacote existente;
- atualizações futuras produzirão outro valor;
- incorporação clona componentes sem alterar o template.

## Dados desconhecidos

```text
não reconhecido ≠ inválido
não resolvido ≠ ausente
```

Entradas desconhecidas preservam identidade, domínio, tipo, IDs externos, payload, metadados e dados brutos.

## Relação com Character

```text
Character
├── templates
│   └── Template imutável
└── templateApplications
    └── histórico de incorporações
```

Armazenar um template não significa aplicá-lo.

## Incorporação atual

As operações atuais continuam disponíveis:

```js
incorporateTemplate(character, templateId)
removeTemplateApplication(character, applicationId)
removeTemplatePackage(character, templateId)
```

Elas usam as projeções conhecidas. O fluxo soberano de análise, plano, revalidação e aplicação será implementado no DOM-TEMPLATE-1.3.

## Save/load

A serialização preserva identidade, IDs externos, tipo, origem, entradas conhecidas e desconhecidas, valores importado e calculado, notas, tags, metadados, documento bruto e projeções temporárias de compatibilidade.

```text
createTemplate
→ serializeTemplates
→ createTemplates
```

O round trip não perde informação nem cria vínculos.

## Não responsabilidades

DOM-TEMPLATE-1.0 não compõe templates, não resolve ciclos, não aplica pacotes por plano, não calcula ou reconcilia pontos, não interpreta contribuições dos outros domínios, não satisfaz pré-requisitos, não cria ataques, não ativa formas, não resolve referência por nome e não calcula na UI.

## Próximos blocos

```text
DOM-TEMPLATE-1.1 — composição declarativa
DOM-TEMPLATE-1.2 — dependências e composição
DOM-TEMPLATE-1.3 — aplicação ao Character
DOM-TEMPLATE-1.4 — custo e reconciliação
DOM-TEMPLATE-1.5 — importação e fechamento
```
