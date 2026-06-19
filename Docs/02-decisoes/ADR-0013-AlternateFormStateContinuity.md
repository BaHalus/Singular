# ADR-0013 — Continuidade de estado entre formas

**Status:** Aprovado  
**Data:** 2026-06-19

---

## Contexto

Forma Alternativa não muda apenas traits e equipamentos estruturais.

Durante a mesa, o personagem também possui estado transitório:

- PV atuais;
- PF atuais;
- Reserva de Energia atual;
- ferimentos registrados;
- condições;
- efeitos;
- estado e usos de equipamentos.

Esses dados podem ter comportamentos diferentes conforme a campanha, a vantagem usada e a natureza da transformação.

A camada de domínio não deve inventar uma regra única para todos os casos.

---

## Decisão

Cada `AlternateFormSet` declara uma `statePolicy`.

```js
{
  pools: {
    HP: "shared",
    FP: "shared",
    EnergyReserve: "shared"
  },
  injuries: "shared",
  conditions: "shared",
  effects: "shared",
  equipment: "shared"
}
```

Cada campo aceita:

```text
shared
perForm
```

### shared

O estado atual permanece no Character durante a transformação.

A troca de forma não salva nem restaura valor separado.

### perForm

O estado da forma de saída é capturado.

Quando a forma voltar a ser ativada, seu último estado é restaurado.

---

## Estado próprio da forma

Cada forma possui `runtimeState`:

```js
{
  initialized: false,
  capturedAt: null,

  pools: {},
  injuries: [],
  conditions: [],
  effects: [],
  equipment: []
}
```

O primeiro acesso a uma forma ainda não inicializada não redefine o Character.

Ela recebe o estado atual por continuidade.

Seu estado próprio passa a existir quando a forma é abandonada pela primeira vez.

---

## Pools

Somente o valor `current` é preservado por forma.

```js
pools: {
  HP: 7,
  FP: 4,
  EnergyReserve: 2
}
```

`maximum` não é armazenado no estado da forma porque pertence ao resultado calculado pelo motor para a configuração ativa.

As operações de forma não calculam:

- novo máximo;
- proporção de dano;
- cura;
- perda de recurso;
- limites mínimos ou máximos.

---

## Ferimentos

`State` passa a possuir:

```js
injuries: []
```

Ferimentos são registros descritivos e estruturais.

O domínio não interpreta localização, gravidade, sangramento, incapacidade ou recuperação.

Com política `perForm`, a lista é salva e restaurada junto da forma.

---

## Condições e efeitos

`conditions` e `effects` podem ser compartilhados ou próprios de cada forma.

Isso permite representar campanhas em que:

- veneno acompanha todas as formas;
- uma condição corporal pertence apenas a uma forma;
- um efeito mágico permanece compartilhado;
- um efeito concedido pela forma é isolado.

A política não determina qual dessas interpretações é correta.

---

## Equipamento

Com política `shared`, estados como `equipped`, `carried`, `stored` e `dropped` permanecem globais.

Com política `perForm`, são preservados por forma:

- `state`;
- `uses`;
- `quantity`.

Equipamentos permanentes usam seu ID como chave estável.

Equipamentos gerados pelo template da forma usam:

```text
templateId + templateSourceComponentId
```

Assim, um item temporário pode recuperar seu estado mesmo quando recebe novo ID em uma ativação posterior.

Equipamentos pertencentes a outro conjunto de formas são ignorados durante a captura e restauração.

---

## Transição

A troca segue esta ordem:

```text
capturar estado da forma de saída
↓
remover componentes estruturais da forma anterior
↓
adicionar componentes da nova forma
↓
restaurar estado salvo da forma de entrada, quando inicializado
↓
atualizar forma ativa
```

---

## Conjuntos independentes

Cada conjunto administra apenas seu próprio estado.

Uma transformação corporal não deve remover ou restaurar componentes pertencentes a outro conjunto independente.

---

## Consequências

### Positivas

- suporte a estado compartilhado ou próprio;
- nenhuma regra de campanha imposta;
- retorno fiel a formas usadas anteriormente;
- preservação de recursos e ferimentos;
- equipamentos temporários restauráveis apesar de novos IDs;
- compatibilidade com conjuntos independentes;
- operações puras e reversíveis.

### Negativas

- a política precisa ser declarada corretamente;
- máximos e proporções continuam dependentes do motor;
- estados incompatíveis podem exigir regras adicionais;
- sincronização de efeitos derivados ainda não está implementada.
