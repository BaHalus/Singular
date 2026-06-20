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

Um template não é uma alteração já aplicada ao personagem. Sua criação ou importação não altera atributos, não injeta componentes, não soma pontos, não calcula NH, não cria ataques, não resolve pré-requisitos, não ativa formas e não liga referências por nome.

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

`id` é a identidade soberana da SINGULAR. É único em `Character.templates`, não é substituído por ID externo, não deriva do nome e permanece estável quando o nome muda.

`externalIds` preserva identidades de GCS, bibliotecas, campanhas e outros fornecedores. IDs externos nunca criam ligação automática por nome.

## Tipos

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

`unknown` preserva pacotes cuja classificação ainda não pode ser determinada com segurança.

## Origem

```js
{
  kind: "singular" | "imported" | "embedded" | "external" | "unknown",
  provider: string | null,
  format: string | null,
  reference: string | null,
  version: string | number | null,
}
```

Campos adicionais são preservados. A fundação não inventa fornecedor, referência ou versão ausente. Para payloads legados, `importMeta.source` e `importMeta.format` podem alimentar a normalização inicial; depois disso, `source` é persistido explicitamente.

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

Regras:

- `id` é único dentro do template;
- `referenceId` só existe quando declarado;
- nomes iguais não geram vínculo;
- posição não define identidade;
- entradas desconhecidas permanecem preservadas.

`domain` indica quem deverá interpretar a contribuição:

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

`payload` conserva os dados da contribuição. DOM-TEMPLATE-1.0 apenas normaliza payloads pertencentes aos domínios já representados no Character; não calcula o resultado mecânico.

## Compatibilidade estrutural

O código anterior armazenava contribuições em coleções como `traits.advantages`, `skills`, `spells` e `equipment`.

Durante a transição:

- entradas legadas são convertidas em `entries`;
- coleções antigas permanecem como projeções somente leitura;
- projeções são reconstruídas a partir de `entries`;
- `entries` é a única autoridade;
- save/load persiste a forma canônica e o payload de compatibilidade necessário às integrações atuais;
- contribuições equivalentes presentes nas duas representações são unificadas;
- definições divergentes são rejeitadas.

Isso mantém Forma Alternativa, Morfose, importadores e operações de incorporação operantes enquanto os próximos blocos migram para a composição declarativa.

## Pontos

```text
importedPoints   → valor declarado pela fonte
calculatedPoints → valor declarado por um calculador soberano futuro
```

DOM-TEMPLATE-1.0 não calcula nenhum dos dois. Divergências são preservadas para reconciliação no DOM-TEMPLATE-1.4. Valores negativos são válidos.

## Imutabilidade

Templates e entradas são profundamente imutáveis. Dados de entrada são clonados; estruturas aninhadas não compartilham referências mutáveis com o chamador; operações não modificam o pacote existente; incorporações clonam componentes sem alterar o template.

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

```js
incorporateTemplate(character, templateId)
removeTemplateApplication(character, applicationId)
removeTemplatePackage(character, templateId)
```

As operações atuais usam as projeções conhecidas. O fluxo soberano de análise, plano, revalidação e aplicação será implementado no DOM-TEMPLATE-1.3.

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
