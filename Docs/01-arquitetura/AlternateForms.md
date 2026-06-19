# AlternateForms

**Código:** DOM-FORM-1.1
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado, operações e linker

AlternateForms controla transformações reversíveis entre formas vinculadas a templates.

A arquitetura segue ADR-0011 e ADR-0012.

---

## Objetivo

Separar quatro conceitos distintos:

```text
Template importado
Template permanentemente incorporado
Vínculo entre vantagem e template de forma
Forma temporariamente ativa
```

Essa separação permite personagens compostos como:

- elfo vampiro;
- orc lich;
- anão lobisomem;

sem impedir que eles possuam formas corporais alternativas.

---

## Estrutura canônica

```js
{
  id: "set-body",
  name: "Formas Vampíricas",
  mechanism: "alternateForm",
  sourceTraitId: "adv-forma-alternativa",

  baseFormId: "form-humanoid",
  activeFormId: "form-bat",
  activeActivationId: "activation-bat",
  activeSince: "2026-06-19T12:00:00.000Z",

  forms: [
    {
      id: "form-humanoid",
      name: "Elfo Vampiro Humanoide",
      templateId: null,
      sourceTraitId: null,
      notes: "",
      tags: [],
      state: {},
      importMeta: null,
      raw: null
    },
    {
      id: "form-bat",
      name: "Morcego",
      templateId: "template-bat",
      sourceTraitId: "adv-forma-morcego",
      notes: "",
      tags: [],
      state: {},
      importMeta: null,
      raw: null
    }
  ],

  notes: "",
  tags: [],
  importMeta: null,
  raw: null
}
```

---

## Conjunto de formas

Um conjunto representa formas incompatíveis entre si.

Somente um `activeFormId` existe por conjunto.

Ativar uma forma substitui automaticamente a forma anterior daquele conjunto.

Conjuntos independentes podem estar ativos ao mesmo tempo.

Exemplo:

```text
Corpo: Lobo
Revestimento: Blindado
```

---

## Forma-base

`baseFormId` identifica o estado de retorno do conjunto.

A forma-base normalmente não referencia um template:

```js
templateId: null
```

Assim, ela representa o personagem formado por:

- dados próprios;
- raça incorporada;
- condição sobrenatural incorporada;
- demais templates permanentes.

---

## Linker automático

`AlternateFormsLinker` procura vantagens reconhecidas como:

```text
Forma Alternativa
Alternate Form
```

A análise usa apenas relações determinísticas.

Prioridade:

1. ID explícito do template;
2. nome explícito do template;
3. nome entre parênteses;
4. nome após dois-pontos;
5. notas da vantagem;
6. comparação canônica exata.

Exemplo seguro:

```text
Vantagem: Forma Alternativa
Notas: Morcego
Template: Forma de Morcego
```

O nome canônico `Morcego` é único e o vínculo é criado.

O linker não usa aproximação textual nem escolhe o primeiro resultado.

---

## Relatório de vinculação

```js
{
  candidates: [],
  resolved: [],
  ambiguous: [],
  unresolved: [],
  alreadyLinked: [],
  createdSetIds: [],
  updatedSetIds: []
}
```

Motivos importantes incluem:

```text
missing-target-name
template-name-not-found
explicit-template-not-found
ambiguous-template-name
multiple-existing-links
existing-link-conflict
```

Casos ambíguos ou não resolvidos permanecem intactos para revisão manual.

---

## Agrupamento automático

O linker respeita primeiro grupos explícitos declarados pela vantagem:

```text
alternateGroupId
alternate_group_id
formSetId
form_set_id
```

Sem grupo explícito, vantagens `Forma Alternativa` entram no grupo corporal padrão:

```text
body
```

Esse padrão reúne formas corporais mutuamente exclusivas, como humanoide, morcego, lobo e névoa.

Mecanismos independentes devem declarar grupos distintos.

---

## Idempotência

Executar o linker mais de uma vez não duplica conjuntos ou formas.

Vínculos manuais existentes não são sobrescritos.

Se uma nova vantagem for acrescentada posteriormente, o linker pode adicionar a nova forma ao conjunto automático existente.

---

## Operações

### analyzeAlternateFormLinks

```js
analyzeAlternateFormLinks(character)
```

Produz diagnóstico sem modificar o Character.

### linkAlternateForms

```js
linkAlternateForms(character)
```

Retorna:

```js
{
  character,
  report
}
```

### activateAlternateForm

```js
activateAlternateForm(character, formSetId, formId)
```

Ativa uma forma e remove o overlay anterior do mesmo conjunto.

### switchAlternateForm

```js
switchAlternateForm(character, formSetId, formId)
```

É um alias semântico para ativação durante uma troca explícita.

### deactivateAlternateForm

```js
deactivateAlternateForm(character, formSetId)
```

Retorna à forma-base.

---

## Proveniência do vínculo

Conjuntos e formas criados automaticamente recebem:

```js
{
  source: "alternateFormsLinker",
  linkerGroupKey,
  linkerSourceTraitId,
  linkerTemplateId,
  matchMethod
}
```

---

## Proveniência da ativação

Componentes temporários clonados recebem:

```js
{
  alternateFormSetId,
  alternateFormId,
  alternateFormActivationId,
  templateId,
  templateName,
  templateComponentType,
  templateSourceComponentId
}
```

Essa proveniência permite remover apenas os componentes da forma correta.

---

## Relação com TemplateApplication

`TemplateApplication` representa incorporação permanente e histórica.

`AlternateFormSet` representa estado temporário atual.

Trocas de forma:

- não criam `TemplateApplication`;
- não encerram `TemplateApplication`;
- não removem raça, condição ou metacaracterísticas permanentes;
- não acumulam histórico estrutural a cada transformação.

---

## Relações internas

Quando uma técnica da forma aponta para uma perícia do mesmo template, o ID é remapeado para a perícia temporária clonada.

Equipamentos da forma recebem IDs novos recursivamente.

---

## Estado de forma

Cada forma possui um objeto `state` reservado para estado específico futuro.

DOM-FORM-1.1 apenas preserva esse objeto. Ele ainda não sincroniza automaticamente HP, FP, recursos, ferimentos ou equipamentos entre formas.

---

## Morfo

`mechanism` aceita:

- `alternateForm`
- `morph`

O valor `morph` prepara o schema, mas a mecânica completa de Morfo permanece fora de escopo.

---

## Não responsabilidades

AlternateForms não calcula:

- custo da vantagem Forma Alternativa;
- diferença de custo entre formas;
- tempo de transformação;
- testes de ativação;
- efeitos de duração;
- atributos finais;
- secundárias finais;
- NH;
- RD;
- carga;
- ataques finais;
- conflitos mecânicos entre conjuntos distintos;
- limites de Morfo.
