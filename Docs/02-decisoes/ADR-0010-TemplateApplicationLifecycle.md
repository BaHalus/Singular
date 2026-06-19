# ADR-0010 — Ciclo de vida de aplicação de templates

**Status:** Aprovado
**Data:** 2026-06-19

---

## Contexto

A SINGULAR importa templates GCS `.gct` como pacotes independentes em `Character.templates`.

Esses pacotes podem conter:

- vantagens;
- qualidades;
- desvantagens;
- peculiaridades;
- perícias;
- técnicas;
- mágicas;
- idiomas;
- familiaridades culturais;
- equipamentos;
- containers e dados desconhecidos.

Importar um pacote não significa aplicá-lo ao personagem.

Misturar importação e aplicação produziria:

- duplicação invisível de componentes;
- dificuldade para desfazer a aplicação;
- perda de proveniência;
- colisões de IDs;
- remoções inseguras;
- cálculo prematuro de regras.

---

## Decisão

O ciclo de vida terá três operações distintas:

```text
importar pacote
      ↓
Character.templates
      ↓
incorporar explicitamente
      ↓
componentes clonados + TemplateApplication ativa
      ↓
remover incorporação
      ↓
componentes removidos + histórico preservado
```

### Importar

A importação cria um pacote em `Character.templates`.

Nenhum componente é automaticamente copiado para as listas principais do personagem.

### Incorporar

`incorporateTemplate` copia apenas componentes conhecidos para o personagem.

Cada cópia recebe:

- novo ID da SINGULAR;
- `templateApplicationId`;
- `templateId`;
- nome do template;
- tipo de componente;
- ID do componente de origem.

O pacote original permanece intacto em `Character.templates`.

### Remover incorporação

`removeTemplateApplication` remove componentes pela proveniência da aplicação, não apenas pelos IDs registrados.

A entrada de `TemplateApplication` permanece no histórico com:

```js
status: "removed"
removedAt: "..."
```

### Remover pacote

`removeTemplatePackage` só pode excluir um pacote quando não houver aplicação ativa correspondente.

O histórico de aplicações removidas permanece no Character.

---

## TemplateApplication

Cada incorporação gera um registro:

```js
{
  id: "application-001",
  templateId: "template-001",
  templateName: "Anão",
  templateType: "race",
  importedPoints: 35,

  status: "active",
  appliedAt: "...",
  removedAt: null,

  componentIds: {
    advantages: [],
    perks: [],
    disadvantages: [],
    quirks: [],
    skills: [],
    techniques: [],
    spells: [],
    languages: [],
    familiarities: [],
    equipment: []
  },

  notes: ""
}
```

`componentIds` é um registro de auditoria. A remoção usa também a proveniência gravada nos componentes.

---

## Relações internas

Quando uma técnica do template aponta para uma perícia do mesmo pacote, a incorporação remapeia `skillId` para o novo ID clonado.

Equipamentos hierárquicos recebem novos IDs recursivamente.

---

## Cálculos

A incorporação é estrutural.

Ela não calcula:

- atributos finais;
- secundárias;
- custo total;
- NH;
- RD;
- carga;
- ataques finais;
- habilidades alternativas;
- Forma Alternativa;
- Morfo.

Features importadas permanecem disponíveis para o motor soberano processar posteriormente.

---

## Duplicidade

Um mesmo template não pode possuir duas aplicações ativas simultâneas no mesmo personagem.

Após a remoção da aplicação ativa, o template pode ser incorporado novamente, gerando uma nova aplicação e novos IDs.

---

## Consequências

### Positivas

- aplicação reversível;
- proveniência explícita;
- pacote original preservado;
- IDs internos seguros;
- remoção previsível;
- histórico de aplicação;
- separação entre dados e regras.

### Negativas

- componentes incorporados são cópias estruturais;
- alterações feitas depois da incorporação não sincronizam automaticamente com o pacote original;
- sincronização futura exigirá operação própria.
