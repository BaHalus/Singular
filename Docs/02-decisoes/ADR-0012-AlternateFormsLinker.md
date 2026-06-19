# ADR-0012 — Vinculação segura entre Forma Alternativa e templates

**Status:** Aprovado
**Data:** 2026-06-19

---

## Contexto

O GCS pode preservar a vantagem `Forma Alternativa` e os templates das formas sem fornecer uma relação estrutural direta entre ambos.

Exemplos observados incluem vantagens com:

```text
Forma Alternativa
Notas: Morcego
```

ou:

```text
Forma Alternativa: Lobo
```

junto de templates como:

```text
Forma de Morcego
Forma de Lobo
```

A SINGULAR precisa estabelecer essas relações quando houver informação suficiente, mas não pode escolher arbitrariamente entre templates semelhantes.

---

## Decisão

A vinculação será executada por `AlternateFormsLinker` após a importação do Character.

O linker produz:

- personagem com conjuntos vinculados com segurança;
- relatório de candidatos;
- vínculos resolvidos;
- vínculos já existentes;
- casos ambíguos;
- casos não resolvidos.

---

## Prioridade de resolução

A ordem de resolução é:

1. ID explícito do template de destino;
2. nome explícito do template de destino;
3. nome declarado entre parênteses ou após dois-pontos;
4. notas da vantagem;
5. comparação canônica exata com o nome dos templates.

Exemplos de nomes canonicamente equivalentes:

```text
Morcego
Forma de Morcego
```

```text
Lobo
Forma do Lobo
```

Não há comparação aproximada, distância textual ou escolha pelo primeiro resultado.

---

## IDs explícitos

Campos específicos reconhecidos incluem variantes como:

```text
alternate_form_template_id
form_template_id
target_template_id
```

Um ID explícito inválido não é substituído silenciosamente por uma tentativa de nome. O caso fica não resolvido com diagnóstico.

O campo genérico `importMeta.templateId` não é usado como destino, pois pode representar o template que originou a própria vantagem.

---

## Ambiguidade

Quando mais de um template corresponde ao mesmo nome canônico, nenhum vínculo é criado.

O relatório registra:

```js
{
  reason: "ambiguous-template-name",
  candidateTemplateIds: []
}
```

Conflitos com vínculos manuais existentes também não são sobrescritos.

---

## Agrupamento

O linker usa primeiro um grupo explícito informado pela vantagem:

```text
alternateGroupId
alternate_group_id
formSetId
form_set_id
```

Na ausência de grupo explícito, vantagens reconhecidas como `Forma Alternativa` entram no grupo corporal padrão:

```text
body
```

Essa política representa a incompatibilidade corporal normal entre formas como humanoide, lobo, morcego e névoa.

Mecanismos independentes devem declarar grupos distintos, por exemplo:

```text
body
armor
```

---

## Forma-base

Cada conjunto criado pelo linker recebe uma forma-base sem template:

```js
{
  templateId: null,
  tags: ["linker:auto", "form:base"]
}
```

O nome padrão é `Forma-base`, podendo ser substituído pelo chamador.

---

## Idempotência

Executar o linker repetidamente não duplica conjuntos ou formas.

Vínculos existentes com o mesmo `sourceTraitId` e `templateId` são classificados como `alreadyLinked`.

Novas vantagens compatíveis podem acrescentar formas a um conjunto criado anteriormente.

---

## Importação

`CharacterImporter.importCharacter` executa o linker automaticamente depois de criar o Character.

`importCharacterWithDiagnostics` retorna:

```js
{
  character,
  snapshot,
  alternateFormLinkReport
}
```

Casos não resolvidos permanecem preservados no Character e no snapshot, sem perda dos dados originais.

---

## Consequências

### Positivas

- relações seguras e reproduzíveis;
- nenhum template escolhido arbitrariamente;
- diagnóstico completo;
- agrupamento corporal coerente;
- respeito a grupos explícitos;
- idempotência;
- preservação de vínculos manuais.

### Negativas

- nomes vagos continuam exigindo intervenção manual;
- templates com nomes canônicos iguais são deliberadamente ambíguos;
- o linker não interpreta texto livre complexo;
- a existência do vínculo não calcula custo ou regras de transformação.
