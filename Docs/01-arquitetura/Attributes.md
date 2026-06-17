Attributes

Código: DOM-ATTR-1.0
Status: Aprovado
Camada: Domain
Tipo: Agregado

---

1. Objetivo

Attributes representa os quatro atributos básicos de GURPS 4ª Edição.

Este agregado pertence ao Character e é responsável apenas pelo armazenamento estrutural dos atributos.

Não contém cálculos.

Não contém custos.

Não contém regras de GURPS.

---

2. Escopo Inicial

A implementação inicial considera apenas:

- ST
- DX
- IQ
- HT

Atributos alternativos, atributos adicionais e sistemas alternativos de custo não fazem parte da implementação inicial.

A arquitetura deverá permitir futura expansão sem exigir alterações estruturais significativas.

---

3. Responsabilidades

Attributes é responsável por:

- armazenar os atributos básicos;
- preservar valores base;
- preservar overrides;
- fornecer serialização consistente;
- garantir integridade estrutural mínima.

---

4. Não Responsabilidades

Attributes não é responsável por:

- calcular custo em pontos;
- calcular dano;
- calcular carga;
- calcular HP;
- calcular FP;
- calcular Will;
- calcular Per;
- calcular Basic Speed;
- calcular Basic Move;
- aplicar modificadores;
- validar pré-requisitos.

Essas responsabilidades pertencem ao módulo Rules.

---

5. Estrutura

A estrutura canônica é:

{
  ST: {
    base: 10,
    override: null
  },

  DX: {
    base: 10,
    override: null
  },

  IQ: {
    base: 10,
    override: null
  },

  HT: {
    base: 10,
    override: null
  }
}

---

6. ST

Strength.

Representa força física.

Attributes apenas armazena o valor.

O significado mecânico pertence às Rules.

---

7. DX

Dexterity.

Representa coordenação, agilidade e capacidade motora.

Attributes apenas armazena o valor.

O significado mecânico pertence às Rules.

---

8. IQ

Intelligence.

Representa capacidade mental geral.

Attributes apenas armazena o valor.

O significado mecânico pertence às Rules.

---

9. HT

Health.

Representa vigor físico e resistência.

Attributes apenas armazena o valor.

O significado mecânico pertence às Rules.

---

10. Override

Todo atributo pode possuir override.

Exemplo:

{
  ST: {
    base: 10,
    override: 12
  }
}

Override substitui apenas o resultado final.

Não altera a fórmula.

Não altera o valor base.

---

11. Invariantes Estruturais

Attributes válido deve possuir:

- ST
- DX
- IQ
- HT

Cada atributo deve possuir:

- base
- override

base deve ser numérico.

override deve ser:

- null
- ou numérico.

Essas invariantes não representam regras de GURPS.

Representam apenas integridade estrutural.

---

12. Extensibilidade

A arquitetura deverá permitir futuramente:

- atributos alternativos;
- atributos adicionais;
- custos alternativos;
- progressões alternativas;
- sistemas derivados de suplementos.

Essas extensões não fazem parte da implementação inicial.

---

13. Serialização

Attributes deve ser serializável para JSON sem perda estrutural.

A serialização não deve conter:

- métodos;
- referências circulares;
- dependências externas.

---

14. Relação com Character

Attributes não existe isoladamente.

Ele pertence ao Character.

Exemplo:

Character
 └── Attributes
      ├── ST
      ├── DX
      ├── IQ
      └── HT

Character continua sendo o Aggregate Root.

---

15. Direção de Implementação

A implementação deverá utilizar:

- objetos simples;
- composição;
- funções puras;
- serialização direta.

A implementação não deverá utilizar classes.

---

16. Checklist de Implementação

- [x] Criar Attributes.md
- [ ] Criar Attributes.js
- [ ] Criar AttributesOperations.js
- [ ] Criar Attributes.test.js
- [ ] Criar AttributesOperations.test.js
- [ ] Integrar com Character
- [ ] Aprovar Attributes v1.0
