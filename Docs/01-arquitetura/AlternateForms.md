# AlternateForms

**Código:** DOM-FORM-1.0
**Status:** Aprovado
**Camada:** Domain
**Tipo:** Agregado e operações

AlternateForms controla transformações reversíveis entre formas vinculadas a templates.

A arquitetura segue ADR-0011.

---

## Objetivo

Separar três conceitos distintos:

```text
Template importado
Template permanentemente incorporado
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

## Operações

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

## Proveniência

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

DOM-FORM-1.0 apenas preserva esse objeto. Ele ainda não sincroniza automaticamente HP, FP, recursos, ferimentos ou equipamentos entre formas.

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
