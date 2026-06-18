State

Código: DOM-STATE-1.0
Status: Aprovado
Camada: Domain
Tipo: Agregado

---

1. Objetivo

State representa o estado temporário atual do personagem.

Diferentemente de Attributes, SecondaryCharacteristics e grande parte dos demais agregados, State representa informações transitórias que mudam constantemente durante o jogo.

---

2. Escopo Inicial

A implementação inicial considera apenas:

- Conditions
- Effects
- Combat

---

3. Responsabilidades

State é responsável por:

- armazenar condições ativas;
- armazenar efeitos temporários;
- armazenar estado básico de combate;
- fornecer serialização consistente;
- garantir integridade estrutural mínima.

---

4. Não Responsabilidades

State não é responsável por:

- calcular modificadores;
- aplicar bônus;
- aplicar penalidades;
- aplicar dano;
- aplicar cura;
- determinar morte;
- determinar inconsciência;
- validar regras de combate;
- validar regras de condições.

Essas responsabilidades pertencem ao módulo Rules.

---

5. Estrutura

A estrutura canônica é:

{
  conditions: [],

  effects: [],

  combat: {
    engaged: false
  }
}

---

6. Conditions

Representa estados ativos do personagem.

Exemplos:

- Stunned
- Prone
- Grappled
- Unconscious
- Frightened

Estrutura sugerida:

{
  id: "condition-id",
  name: "Stunned"
}

State não interpreta o significado da condição.

---

7. Effects

Representa efeitos temporários ativos.

Exemplos:

- Bless
- Haste
- Curse
- Poison

Estrutura sugerida:

{
  id: "effect-id",
  source: "Bless",
  description: "+1 DX"
}

State não interpreta o efeito.

---

8. Combat

Representa apenas o estado mais básico de participação em combate.

Estrutura inicial:

{
  engaged: false
}

Não inclui:

- postura;
- manobra atual;
- alvo;
- iniciativa;
- defesa escolhida.

Esses conceitos poderão ser modelados futuramente.

---

9. Invariantes Estruturais

State válido deve possuir:

- conditions
- effects
- combat

conditions deve ser um array.

effects deve ser um array.

combat deve ser um objeto.

combat.engaged deve ser booleano.

---

10. Compatibilidade GCS

Informações adicionais de estado encontradas em arquivos GCS devem ser preservadas conforme ADR-0003.

A implementação inicial da SINGULAR não precisa compreender todos os estados possíveis.

---

11. Serialização

State deve ser serializável para JSON sem perda estrutural.

Não deve conter:

- métodos;
- referências circulares;
- dependências externas.

---

12. Relação com Pools

State não representa recursos atuais.

Exemplos:

- HP atual
- FP atual
- Energy Reserve atual

pertencem ao agregado Pools.

---

13. Relação com Character

State pertence ao Character.

Exemplo:

Character
└── State
├── Conditions
├── Effects
└── Combat

Character continua sendo o Aggregate Root.

---

14. Direção de Implementação

A implementação deverá utilizar:

- objetos simples;
- composição;
- funções puras;
- serialização direta.

A implementação não deverá utilizar classes.

---

15. Checklist de Implementação

- [x] Criar State.md
- [ ] Criar State.js
- [ ] Criar State.test.js
- [ ] Criar StateOperations.js
- [ ] Criar StateOperations.test.js
- [ ] Integrar com Character
- [ ] Aprovar State v1.0
