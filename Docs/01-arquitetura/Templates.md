# Templates — Fundação soberana

**Código:** DOM-TEMPLATE-1.0  
**Status:** Implementado  
**Camada:** Domain  
**Tipo:** Agregado, identidade, proveniência e preservação declarativa  
**Decisão:** ADR-0029

Templates representa pacotes de personagem preservados pela SINGULAR. O domínio sustenta raças, modelos raciais, metacaracterísticas, profissões, arquétipos, corpos, formas e pacotes de campanha.

## Regra central

```text
Template declara.
Cada domínio interpreta sua própria contribuição.
O motor calcula.
A UI apenas apresenta e despacha intenção.
```

Criar ou importar um template não altera o personagem, não soma pontos, não calcula NH, não cria ataques, não resolve pré-requisitos, não ativa formas e não liga referências por nome.

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

## Identidade

`id` é a identidade soberana, única em `Character.templates`. `externalIds` preserva identidades externas sem substituir `id`. Nome e posição nunca definem vínculos.

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

Campos adicionais são preservados. Ausências não são preenchidas por suposição.

## Entradas

`entries` é a autoridade única das contribuições declaradas.

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

- IDs são únicos no template;
- `referenceId` exige referência explícita;
- `entryType` é aberto;
- entradas desconhecidas são preservadas;
- `payload` declara dados, não resultados calculados.

Domínios atuais incluem `trait`, `skill`, `magic`, `language`, `culture`, `equipment`, `template`, `rule` e `unknown`.

## Compatibilidade estrutural

Coleções anteriores permanecem como projeções somente leitura reconstruídas a partir de `entries`.

- `entries` é a única autoridade;
- entrada legada é convertida em entrada canônica;
- definição equivalente nas duas representações é unificada;
- definição divergente é rejeitada;
- save/load preserva forma canônica e compatibilidade temporária.

Isso mantém Forma Alternativa, Morfose, importadores e operações atuais de incorporação operantes durante a migração.

## Pontos

```text
importedPoints   → valor declarado pela fonte
calculatedPoints → valor declarado por autoridade calculadora futura
```

Os valores permanecem separados. DOM-TEMPLATE-1.0 não calcula nem reconcilia. Valores negativos são válidos.

## Imutabilidade

Templates e entradas são profundamente imutáveis. Dados recebidos são clonados e operações não modificam o pacote existente.

## Dados desconhecidos

```text
não reconhecido ≠ inválido
não resolvido ≠ ausente
```

Identidade, domínio, tipo, IDs externos, payload, metadados e dados brutos são preservados.

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

As operações atuais usam projeções conhecidas. O fluxo soberano de análise, plano, revalidação e aplicação pertence ao DOM-TEMPLATE-1.3.

## Save/load

```text
createTemplate
→ serializeTemplates
→ createTemplates
```

O round trip preserva identidade, origem, entradas, pontos declarados, metadados, dados brutos e compatibilidade sem criar vínculos.

## Não responsabilidades

DOM-TEMPLATE-1.0 não compõe templates, não resolve ciclos, não aplica pacotes por plano, não calcula ou reconcilia pontos, não interpreta contribuições de outros domínios, não satisfaz pré-requisitos, não cria ataques, não ativa formas, não resolve referência por nome e não calcula na UI.

## Próximos blocos

```text
DOM-TEMPLATE-1.1 — composição declarativa
DOM-TEMPLATE-1.2 — dependências e composição
DOM-TEMPLATE-1.3 — aplicação ao Character
DOM-TEMPLATE-1.4 — custo e reconciliação
DOM-TEMPLATE-1.5 — importação e fechamento
```
