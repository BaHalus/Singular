Pools

Código: DOM-POOL-1.0
Status: Aprovado
Camada: Domain
Tipo: Agregado

---

1. Objetivo

Pools representa recursos consumíveis do personagem durante o jogo.

Diferentemente de Attributes e SecondaryCharacteristics, Pools representa estado operacional.

---

2. Escopo Inicial

A implementação inicial considera:

- HP
- FP

E opcionalmente:

- EnergyReserve

---

3. Responsabilidades

Pools é responsável por:

- armazenar valores atuais;
- armazenar capacidades máximas;
- fornecer serialização consistente;
- garantir integridade estrutural mínima.

---

4. Não Responsabilidades

Pools não é responsável por:

- calcular HP máximo;
- calcular FP máximo;
- calcular Energy Reserve máxima;
- validar morte;
- validar inconsciência;
- validar exaustão;
- aplicar dano;
- aplicar cura;
- aplicar fadiga.

Essas responsabilidades pertencem ao módulo Rules.

---

5. Estrutura

A estrutura canônica é:

{
  HP: {
    current: null,
    maximum: null
  },

  FP: {
    current: null,
    maximum: null
  }
}

Energy Reserve é opcional.

Exemplo:

{
  HP: {
    current: 10,
    maximum: 10
  },

  FP: {
    current: 12,
    maximum: 12
  },

  EnergyReserve: {
    current: 20,
    maximum: 20
  }
}

---

6. HP

Representa os Pontos de Vida atuais.

O significado mecânico pertence às Rules.

---

7. FP

Representa os Pontos de Fadiga atuais.

O significado mecânico pertence às Rules.

---

8. EnergyReserve

Representa reservas de energia inerentes ao personagem.

É opcional.

Pode ser criada por:

- vantagens;
- poderes;
- magias;
- templates;
- importação GCS.

---

9. Relação com Equipment

Pools não representa fontes externas de energia.

Exemplos:

- gemas de energia;
- cristais;
- baterias mágicas;
- itens carregáveis.

Esses elementos pertencem ao agregado Equipment.

A camada Presentation pode agrupá-los visualmente.

---

10. Invariantes Estruturais

Todo pool deve possuir:

- current
- maximum

Ambos devem ser:

- null
- ou numéricos

Essas invariantes representam apenas integridade estrutural.

---

11. Compatibilidade GCS

Dados adicionais de pools encontrados em arquivos GCS devem ser preservados conforme ADR-0003.

A implementação inicial da SINGULAR não precisa compreender todos os tipos possíveis de pool.

---

12. Serialização

Pools deve ser serializável para JSON sem perda estrutural.

Não deve conter:

- métodos;
- referências circulares;
- dependências externas.

---

13. Relação com Character

Pools pertence ao Character.

Exemplo:

Character
└── Pools
├── HP
├── FP
└── EnergyReserve (opcional)

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

- [x] Criar Pools.md
- [ ] Criar Pools.js
- [ ] Criar Pools.test.js
- [ ] Criar PoolsOperations.js
- [ ] Criar PoolsOperations.test.js
- [ ] Integrar com Character
- [ ] Aprovar Pools v1.0
