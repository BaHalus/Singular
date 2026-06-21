# Importação soberana de Templates

**Código:** DOM-TEMPLATE-1.5  
**Status:** Implementado  
**Camada:** Domain / Import boundary  
**Decisão:** ADR-0034

## Fluxo

```text
fonte GCT
→ parser existente
→ análise canônica
→ plano efêmero
→ revalidação
→ catálogo de Templates
→ aplicação explícita posterior
```

A nova camada não duplica o parsing de GCT. Ela transforma o resultado do `TemplatesImporter` em agregados soberanos, diagnósticos e recibos.

## APIs

```js
analyzeTemplateImport(source, options)
planTemplateImport(source, options)
executeTemplateImportPlan(source, plan, options)
importTemplateCatalog(source, options)
mergeImportedTemplateCatalog(existing, imported, options)
```

Estados:

```text
ready
ready-with-warnings
blocked
```

## Identidade

Pacotes com ID externo preservam esse ID. Pacotes sem identidade externa recebem ID determinístico calculado sobre o documento canônico.

```text
mesmo conteúdo anônimo → mesmo Template.id
```

Nome, posição e ordem não definem identidade.

## Proveniência

Cada pacote reconhecido recebe:

```js
source: {
  kind: "imported",
  provider: "gcs",
  format: "gct",
  reference,
  version,
}
```

`importMeta` preserva `importFingerprint`, estratégia de identidade e metadados anteriores. O documento integral permanece em `raw`.

## Nós desconhecidos

Nós ainda não reconhecidos continuam em `unknownNodes`. Também recebem uma representação canônica opaca em `opaqueTemplates`:

```js
{
  templateType: "unknown",
  entries: [{
    domain: "unknown",
    entryType: "unknown",
    raw,
  }],
}
```

Pacotes opacos não entram automaticamente em `Character.templates`. Sua inclusão exige `includeOpaqueTemplates: true` na mesclagem de catálogo.

## Versões

O padrão atual é:

```js
supportedVersions: [2]
```

Versão ausente ou não suportada produz aviso e é preservada. Versão estruturalmente inválida continua bloqueada pelo parser.

## Duplicatas e conflitos

- definições equivalentes com o mesmo ID são colapsadas;
- definições divergentes com o mesmo ID bloqueiam;
- uma identidade externa ligada a IDs soberanos diferentes bloqueia;
- nenhuma ambiguidade é resolvida por nome.

## Plano e recibo

O plano conserva fingerprints da fonte, análise e operação. A execução analisa novamente a fonte. Divergência produz `TEMPLATE_IMPORT_PLAN_STALE`.

O recibo registra status, fingerprints, IDs reconhecidos e opacos, quantidades e diagnósticos.

## Mesclagem

Políticas para conflito do mesmo ID:

```text
reject
keep-existing
replace
```

O padrão é `reject`. Conflito de identidade externa entre IDs diferentes nunca é mesclado.

## CharacterImporter

`CharacterImporter` passa a expor `templateImportReport`.

Um GCT standalone continua isolado: o pacote entra em `Character.templates`, mas seus componentes não são aplicados às coleções do personagem. A aplicação permanece responsabilidade explícita do DOM-TEMPLATE-1.3.

## Não responsabilidades

Este bloco não aplica pacotes, não calcula pontos, não interpreta regras desconhecidas, não vincula por nome e não altera Forma Alternativa ou Morfose.

## Fechamento

DOM-TEMPLATE-1.0 a 1.5 formam o domínio completo. Após o gate de encerramento, DOM-TEMPLATE entra em manutenção fechada.
