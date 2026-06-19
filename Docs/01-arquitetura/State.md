# State

**Código:** DOM-STATE-1.1  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado

State representa o estado temporário atual do personagem.

---

## Escopo

```js
{
  injuries: [],
  conditions: [],
  effects: [],
  combat: {
    engaged: false
  }
}
```

Recursos consumíveis atuais não pertencem a State. Eles permanecem em `Pools`.

---

## Responsabilidades

State armazena:

- ferimentos registrados;
- condições ativas;
- efeitos temporários;
- estado básico de participação em combate;
- dados transitórios serializáveis.

State garante apenas integridade estrutural.

---

## Não responsabilidades

State não:

- aplica dano;
- aplica cura;
- interpreta ferimentos;
- calcula modificadores;
- aplica bônus ou penalidades;
- determina morte ou inconsciência;
- resolve condições;
- resolve efeitos;
- valida regras de combate.

Essas responsabilidades pertencem ao módulo Rules.

---

## Injuries

`injuries` contém registros descritivos de ferimentos.

Exemplo:

```js
{
  id: "injury-001",
  location: "Braço direito",
  description: "Corte profundo",
  notes: ""
}
```

O agregado não impõe schema mecânico interno nesta fase e não interpreta:

- gravidade;
- localização;
- sangramento;
- incapacidade;
- recuperação;
- relação automática com PV atuais.

---

## Conditions

`conditions` representa estados ativos.

Exemplos:

- Atordoado;
- Caído;
- Agarrado;
- Inconsciente;
- Amedrontado.

```js
{
  id: "condition-001",
  name: "Atordoado"
}
```

---

## Effects

`effects` representa efeitos temporários.

Exemplos:

- bênção;
- aceleração;
- maldição;
- veneno.

```js
{
  id: "effect-001",
  source: "Bênção",
  description: "+1 em testes"
}
```

---

## Combat

O estado inicial de combate contém apenas:

```js
{
  engaged: false
}
```

Postura, manobra, alvo, iniciativa e defesa escolhida permanecem fora do escopo atual.

---

## Relação com Pools

Valores atuais de recursos pertencem a `Pools`:

- HP/PV;
- FP/PF;
- Energy Reserve/Reserva de Energia.

State não duplica esses valores.

---

## Relação com Formas Alternativas

`AlternateFormSet.statePolicy` declara se partes de State são:

```text
shared
perForm
```

Com política `perForm`, a operação de transformação captura e restaura:

- `injuries`;
- `conditions`;
- `effects`.

O State continua sendo o estado atualmente ativo do Character.

Os snapshots das formas inativas ficam em:

```text
AlternateForm.runtimeState
```

---

## Invariantes

Um State válido deve possuir:

- `injuries` como array;
- `conditions` como array;
- `effects` como array;
- `combat` como objeto;
- `combat.engaged` como booleano.

---

## Serialização

State deve ser serializável para JSON sem:

- métodos;
- referências circulares;
- dependências externas;
- estado de interface.

---

## Direção de implementação

A implementação utiliza:

- objetos simples;
- composição;
- funções puras;
- serialização direta.

---

## Checklist

- [x] Criar State.md
- [x] Criar State.js
- [x] Criar State.test.js
- [x] Integrar com Character
- [x] Adicionar injuries
- [x] Integrar continuidade de estado das formas
- [x] Aprovar State v1.1
