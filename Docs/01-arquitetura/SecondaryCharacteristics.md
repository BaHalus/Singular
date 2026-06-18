SecondaryCharacteristics

Código: DOM-SEC-1.0
Status: Aprovado
Camada: Domain
Tipo: Agregado

---

1. Objetivo

SecondaryCharacteristics representa as características secundárias básicas de GURPS 4ª Edição.

Este agregado pertence ao Character e é responsável exclusivamente pelo armazenamento estrutural dessas características.

Não contém cálculos.

Não contém regras de GURPS.

Não contém lógica de interface.

---

2. Escopo Inicial

A implementação inicial considera apenas:

- HP
- FP
- Will
- Per
- BasicSpeed
- BasicMove

Outras estatísticas derivadas ou especializadas não fazem parte da implementação inicial.

---

3. Responsabilidades

SecondaryCharacteristics é responsável por:

- armazenar características secundárias;
- preservar valores base;
- preservar overrides;
- fornecer serialização consistente;
- garantir integridade estrutural mínima.

---

4. Não Responsabilidades

SecondaryCharacteristics não é responsável por:

- calcular HP;
- calcular FP;
- calcular Will;
- calcular Per;
- calcular Basic Speed;
- calcular Basic Move;
- calcular Dodge;
- calcular Basic Lift;
- calcular Damage;
- aplicar modificadores;
- validar pré-requisitos.

Essas responsabilidades pertencem ao módulo Rules.

---

5. Estrutura

A estrutura canônica é:

{
  HP: {
    base: null,
    override: null
  },

  FP: {
    base: null,
    override: null
  },

  Will: {
    base: null,
    override: null
  },

  Per: {
    base: null,
    override: null
  },

  BasicSpeed: {
    base: null,
    override: null
  },

  BasicMove: {
    base: null,
    override: null
  }
}

---

6. HP

Hit Points.

Representa a resistência física do personagem.

O significado mecânico pertence às Rules.

---

7. FP

Fatigue Points.

Representa energia e fadiga.

O significado mecânico pertence às Rules.

---

8. Will

Força de vontade.

O significado mecânico pertence às Rules.

---

9. Per

Percepção.

O significado mecânico pertence às Rules.

---

10. BasicSpeed

Velocidade Básica.

O significado mecânico pertence às Rules.

---

11. BasicMove

Deslocamento Básico.

O significado mecânico pertence às Rules.

---

12. Override

Toda característica secundária pode possuir override.

Exemplo:

{
  HP: {
    base: null,
    override: 14
  }
}

Override substitui apenas o resultado final.

Não altera a fórmula.

Não altera o valor base.

---

13. Invariantes Estruturais

SecondaryCharacteristics válido deve possuir:

- HP
- FP
- Will
- Per
- BasicSpeed
- BasicMove

Cada característica deve possuir:

- base
- override

base deve ser:

- null
- ou numérico

override deve ser:

- null
- ou numérico

Essas invariantes representam apenas integridade estrutural.

Não representam regras de GURPS.

---

14. Relação com Pools

SecondaryCharacteristics não representa recursos atuais.

Exemplo:

HP atual
FP atual

pertencem ao agregado Pools.

SecondaryCharacteristics representa apenas os valores estruturais.

---

15. Relação com Derived Statistics

Não pertencem a este agregado:

- Dodge
- Basic Lift
- Damage
- Vision
- Hearing
- Taste & Smell
- Touch
- Fright Check
- Parry
- Block

Esses elementos serão modelados futuramente em agregados específicos.

---

16. Compatibilidade GCS

Arquivos GCS podem conter características adicionais.

Exemplos:

- Vision
- Hearing
- Touch
- Taste & Smell
- Fright Check
- Force Sight
- Stress
- Threshold

Esses dados não devem ser descartados durante importação.

Eles deverão ser preservados conforme definido na ADR-0003.

---

17. Serialização

SecondaryCharacteristics deve ser serializável para JSON sem perda estrutural.

A serialização não deve conter:

- métodos;
- referências circulares;
- dependências externas.

---

18. Relação com Character

SecondaryCharacteristics pertence ao Character.

Exemplo:

Character
 └── SecondaryCharacteristics
      ├── HP
      ├── FP
      ├── Will
      ├── Per
      ├── BasicSpeed
      └── BasicMove

Character continua sendo o Aggregate Root.

---

19. Direção de Implementação

A implementação deverá utilizar:

- objetos simples;
- composição;
- funções puras;
- serialização direta.

A implementação não deverá utilizar classes.

---

20. Checklist de Implementação

- [x] Criar SecondaryCharacteristics.md
- [ ] Criar SecondaryCharacteristics.js
- [ ] Criar SecondaryCharacteristics.test.js
- [ ] Criar SecondaryCharacteristicsOperations.js
- [ ] Criar SecondaryCharacteristicsOperations.test.js
- [ ] Integrar com Character
- [ ] Aprovar SecondaryCharacteristics v1.0
