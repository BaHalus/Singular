# Aplicação soberana de Templates

**Código:** DOM-TEMPLATE-1.3  
**Status:** Implementado  
**Camada:** Domain / Application boundary  
**Decisão:** ADR-0032

## Fluxo

```text
analisar pacote
→ gerar plano efêmero
→ revalidar
→ executar atomicamente
→ registrar recibo
```

APIs:

```js
analyzeTemplateApplicationOperation(character, input)
planTemplateApplicationOperation(character, input, options)
executeTemplateApplicationPlan(character, plan, options)
compareTemplatePackageVersions(templates, rootTemplateId, replacement)
```

Operações suportadas:

```text
apply
remove
update
```

## Aplicação

`apply` resolve o grafo pelo `TemplateDependencyResolver`, exige composição pronta, aplica dependências antes dos dependentes e agrega os componentes numa única aplicação-raiz.

Aplicações ativas não podem possuir composições sobrepostas. Isso impede duplicação silenciosa de contribuições compartilhadas.

## Remoção

`remove` elimina somente componentes cuja proveniência aponta para a aplicação. O registro permanece como histórico com estado `removed`.

A remoção é bloqueada quando outra aplicação ativa depende da raiz ou quando uma forma ativa utiliza um template da composição.

## Atualização

`update` exige que o template substituto preserve o mesmo ID soberano da raiz. O domínio compara os pacotes, revalida o novo grafo, remove os componentes anteriores e cria uma nova aplicação ligada à antiga.

```text
anterior.replacedByApplicationId
nova.replacesApplicationId
```

Sem mudança de pacote ou escolhas, o resultado é `no-op`.

## Escolhas

`choices` é um snapshot opaco. Templates não interpreta decisões pertencentes a outros domínios.

Na atualização:

- ausência de novas escolhas preserva o snapshot anterior;
- escolhas explícitas substituem o snapshot;
- o recibo registra o snapshot utilizado.

## Registro persistente

`TemplateApplication` passa a conter:

```js
{
  id,
  templateId,
  rootTemplateId,
  templateName,
  templateType,
  importedPoints,
  resolvedTemplateIds,
  compositionFingerprint,
  choices,
  replacesApplicationId,
  replacedByApplicationId,
  status,
  appliedAt,
  removedAt,
  componentIds,
  history,
  notes,
}
```

Saves anteriores recebem defaults compatíveis: raiz igual ao template, composição com a própria raiz, escolhas vazias e histórico vazio.

## Histórico e recibo

Cada aplicação possui eventos append-only:

```js
{
  id,
  type: "applied" | "removed" | "updated",
  occurredAt,
  operationId,
  planFingerprint,
  receipt,
}
```

O recibo preserva operação, aplicação anterior e atual, composição resolvida, componentes, escolhas, comparação de versão e fingerprint.

Não existe histórico global paralelo; o ciclo de vida pertence a `templateApplications`.

## Revalidação e atomicidade

O plano guarda snapshots da composição, pacote, aplicação, escolhas e dependências ativas. A análise é refeita antes da execução. Divergência produz `PLAN_STALE`.

A alteração final é validada por `createCharacter` de uma vez. Falhas não modificam o objeto recebido.

## Proveniência

Componentes aplicados preservam:

```text
templateApplicationId
templateRootId
templateCompositionFingerprint
templateId
templateSourceComponentId
templateComponentType
```

## Compatibilidade

```js
incorporateTemplate(...)
removeTemplateApplication(...)
updateTemplateApplication(...)
```

Essas APIs são wrappers do fluxo soberano, não um pipeline paralelo.

`removeTemplatePackage` continua separado da aplicação e bloqueia referências por aplicações ou formas ativas.

## Não responsabilidades

DOM-TEMPLATE-1.3 não calcula pontos, não interpreta contribuições de outros domínios, não resolve escolhas, não vincula por nome e não altera Forma Alternativa ou Morfose.

## Continuidade

```text
DOM-TEMPLATE-1.4 — Custo e reconciliação
```
