# AlternateForms

**Código:** DOM-FORM-1.2  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado, operações, linker e continuidade de estado

AlternateForms controla transformações reversíveis entre formas vinculadas a templates.

A arquitetura segue ADR-0011, ADR-0012 e ADR-0013.

---

## Objetivo

Separar cinco conceitos:

```text
Template importado
Template permanentemente incorporado
Vínculo entre vantagem e template de forma
Forma temporariamente ativa
Estado próprio ou compartilhado de cada forma
```

Essa separação permite personagens como:

- elfo vampiro;
- orc lich;
- anão lobisomem;

com múltiplos templates permanentes e formas corporais reversíveis.

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

  statePolicy: {
    pools: {
      HP: "shared",
      FP: "shared",
      EnergyReserve: "shared"
    },
    injuries: "shared",
    conditions: "shared",
    effects: "shared",
    equipment: "shared"
  },

  forms: [
    {
      id: "form-humanoid",
      name: "Elfo Vampiro Humanoide",
      templateId: null,
      sourceTraitId: null,
      notes: "",
      tags: [],
      state: {},
      runtimeState: {
        initialized: false,
        capturedAt: null,
        pools: {},
        injuries: [],
        conditions: [],
        effects: [],
        equipment: []
      },
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
      runtimeState: {
        initialized: false,
        capturedAt: null,
        pools: {},
        injuries: [],
        conditions: [],
        effects: [],
        equipment: []
      },
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

Conjuntos independentes podem estar ativos ao mesmo tempo:

```text
Corpo: Lobo
Revestimento: Blindado
```

---

## Forma-base

`baseFormId` identifica o estado de retorno.

A forma-base normalmente usa:

```js
templateId: null
```

Ela representa o personagem formado por:

- dados próprios;
- raça incorporada;
- condição sobrenatural incorporada;
- outros templates permanentes.

---

## Linker automático

`AlternateFormsLinker` procura vantagens reconhecidas como:

```text
Forma Alternativa
Alternate Form
```

A análise utiliza apenas relações determinísticas.

Prioridade:

1. ID explícito do template;
2. nome explícito do template;
3. nome entre parênteses;
4. nome após dois-pontos;
5. notas da vantagem;
6. comparação canônica exata.

Exemplo:

```text
Vantagem: Forma Alternativa
Notas: Morcego
Template: Forma de Morcego
```

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

Motivos possíveis:

```text
missing-target-name
template-name-not-found
explicit-template-not-found
ambiguous-template-name
multiple-existing-links
existing-link-conflict
```

Casos ambíguos ou não resolvidos permanecem intactos para revisão.

---

## Agrupamento automático

O linker respeita grupos explícitos:

```text
alternateGroupId
alternate_group_id
formSetId
form_set_id
```

Sem grupo explícito, Forma Alternativa entra no grupo corporal padrão:

```text
body
```

Esse grupo reúne formas corporais mutuamente exclusivas, como humanoide, morcego, lobo e névoa.

---

## Idempotência

Executar o linker repetidamente não duplica conjuntos ou formas.

Vínculos manuais não são sobrescritos.

Novas vantagens compatíveis podem acrescentar formas a um conjunto automático já existente.

---

## Política de estado

Cada conjunto possui `statePolicy`.

Cada campo aceita:

```text
shared
perForm
```

### shared

O valor atual permanece no Character durante a transformação.

### perForm

O valor da forma de saída é capturado e restaurado quando essa forma voltar a ser ativada.

A política cobre:

- HP/PV atuais;
- FP/PF atuais;
- Reserva de Energia atual;
- ferimentos;
- condições;
- efeitos;
- estado, usos e quantidade de equipamentos.

A política padrão é totalmente `shared`.

---

## runtimeState

`runtimeState` pertence a cada forma e armazena apenas estado transitório preservável.

```js
{
  initialized: true,
  capturedAt: "2026-06-19T12:00:00.000Z",

  pools: {
    HP: 7,
    FP: 4,
    EnergyReserve: 2
  },

  injuries: [],
  conditions: [],
  effects: [],

  equipment: [
    {
      key: "equipment:eq-001",
      state: "equipped",
      uses: 3,
      quantity: 1
    }
  ]
}
```

A forma ainda não usada começa com:

```js
initialized: false
```

Na primeira entrada, ela mantém o estado atual por continuidade.

Seu snapshot próprio é criado quando a forma é abandonada pela primeira vez.

---

## Pools

Somente `current` é salvo por forma.

`maximum` continua pertencendo ao resultado calculado pelo motor.

AlternateForms não calcula:

- novos máximos;
- proporção de dano;
- cura;
- limites;
- conversão entre máximos diferentes.

---

## Ferimentos, condições e efeitos

`State.injuries`, `State.conditions` e `State.effects` podem ser compartilhados ou próprios da forma.

Isso permite representar campanhas em que:

- um veneno acompanha todas as formas;
- um ferimento corporal pertence a uma forma;
- um efeito mágico é compartilhado;
- uma condição derivada da forma é isolada.

A política apenas declara continuidade. Ela não interpreta regras.

---

## Equipamento

Com política `shared`, o estado de equipamentos permanece global.

Com política `perForm`, cada forma preserva:

- `state`;
- `uses`;
- `quantity`.

Equipamentos permanentes usam seu ID como chave estável.

Equipamentos gerados pelo template da forma usam:

```text
templateId + templateSourceComponentId
```

Assim, recuperam o estado mesmo recebendo novo ID numa ativação posterior.

Equipamentos de outro conjunto independente não são capturados nem restaurados pelo conjunto atual.

---

## Ordem da transição

```text
capturar estado da forma de saída
↓
remover componentes estruturais anteriores
↓
adicionar componentes da nova forma
↓
restaurar o estado salvo da forma de entrada
↓
atualizar forma ativa
```

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

Ativa uma forma, troca seus componentes e processa continuidade de estado.

### switchAlternateForm

```js
switchAlternateForm(character, formSetId, formId)
```

Alias semântico de ativação.

### deactivateAlternateForm

```js
deactivateAlternateForm(character, formSetId)
```

Retorna à forma-base e restaura o estado configurado.

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

Componentes temporários recebem:

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

Essa proveniência permite remover apenas os componentes corretos.

---

## Relação com TemplateApplication

`TemplateApplication` representa incorporação permanente e histórica.

`AlternateFormSet` representa o estado operacional atual.

Trocas de forma:

- não criam TemplateApplication;
- não encerram TemplateApplication;
- não removem raça ou condição permanente;
- não acumulam histórico estrutural a cada transformação.

---

## Morfo

`mechanism` aceita:

- `alternateForm`;
- `morph`.

`morph` prepara o schema, mas a mecânica completa permanece fora de escopo.

---

## Não responsabilidades

AlternateForms não calcula:

- custo da vantagem Forma Alternativa;
- diferença de custo entre formas;
- tempo ou teste de transformação;
- duração;
- atributos finais;
- secundárias finais;
- máximos de pools;
- proporção de dano;
- NH;
- RD;
- carga;
- ataques finais;
- conflitos mecânicos entre conjuntos;
- limites de Morfo.
