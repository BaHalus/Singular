# ADR-0011 — Formas Alternativas como conjuntos mutuamente exclusivos

**Status:** Aprovado
**Data:** 2026-06-19

---

## Contexto

A SINGULAR já distingue:

- templates importados;
- templates permanentemente incorporados;
- histórico de aplicação de templates.

Forma Alternativa exige outro ciclo de vida.

Trocar repetidamente entre formas durante a mesa não deve criar uma nova `TemplateApplication` histórica a cada transformação.

Também é necessário permitir combinações permanentes como:

```text
Elfo + Vampiro
Orc + Lich
Anão + Licantropo
```

Essas combinações não podem ser confundidas com a forma corporal momentaneamente ativa.

---

## Decisão

Formas serão organizadas em `AlternateFormSet`.

Cada conjunto possui:

- uma forma-base;
- uma forma ativa;
- uma ou mais formas disponíveis;
- um mecanismo (`alternateForm` ou `morph`);
- vínculo opcional com a vantagem de origem;
- estado operacional atual da transformação.

Somente uma forma pode estar ativa dentro de cada conjunto.

Conjuntos diferentes podem coexistir quando representam mecanismos independentes.

Exemplo:

```text
Conjunto Corpo
- Humanoide
- Lobo
- Morcego

Conjunto Revestimento
- Sem revestimento
- Blindado
```

Nesse caso, `Lobo + Blindado` pode existir porque são conjuntos independentes.

---

## Templates permanentes

Templates permanentes continuam em `TemplateApplication`.

Exemplo:

```text
TemplateApplication: Elfo
TemplateApplication: Vampiro
AlternateFormSet: Corpo Vampírico
```

A troca para Morcego remove apenas os componentes da forma anterior do mesmo conjunto.

Ela não remove os componentes permanentes de Elfo ou Vampiro.

---

## Ativação

Ao ativar uma forma vinculada a um template:

1. removem-se os componentes temporários do mesmo conjunto;
2. clonam-se os componentes do template da nova forma;
3. grava-se proveniência específica da forma;
4. atualizam-se `activeFormId`, `activeActivationId` e `activeSince`.

A proveniência contém:

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

---

## Forma-base

A forma-base normalmente possui `templateId: null`.

Isso representa o corpo permanente produzido pelos templates incorporados e pelos dados normais do personagem.

Desativar uma Forma Alternativa significa voltar à forma-base do conjunto.

---

## Histórico

Transições de forma não criam novas entradas em `templateApplications`.

O conjunto mantém somente o estado ativo atual.

Histórico detalhado de transformações, caso necessário no futuro, deverá pertencer a um log de sessão separado, não ao agregado estrutural do personagem.

---

## Morfo

O campo `mechanism: "morph"` é reservado desde esta versão.

Ele permite reutilizar a estrutura de conjuntos e formas, mas não implementa ainda:

- aquisição dinâmica de formas;
- limite de pontos de Morfo;
- memorização de formas;
- improvisação;
- custos ou penalidades.

---

## Consequências

### Positivas

- uma forma ativa por conjunto;
- múltiplos templates permanentes simultâneos;
- conjuntos independentes simultâneos;
- troca sem resíduos;
- proveniência explícita;
- nenhuma poluição do histórico de templates;
- preparação para Morfo.

### Negativas

- formas são overlays estruturais sobre o personagem;
- a aplicação mecânica de features ainda depende do motor;
- conflitos entre conjuntos diferentes ainda exigirão regras futuras;
- estado específico de cada forma ainda não é sincronizado automaticamente com componentes clonados.
