Character

Código: DOM-CHAR-1.0
Status: Aprovado
Camada: Domain
Tipo: Aggregate Root

---

1. Objetivo

O Character é o Aggregate Root da SINGULAR.

Ele representa um personagem completo e constitui a unidade fundamental de persistência, carregamento, serialização e manipulação do domínio.

Todo dado pertencente a um personagem deve estar contido direta ou indiretamente em um Character.

---

2. Responsabilidades

O Character é responsável por:

- manter a identidade do personagem;
- manter a composição estrutural dos agregados;
- preservar dados permanentes;
- preservar estados transitórios;
- garantir invariantes estruturais mínimas;
- fornecer serialização consistente.

---

3. Não Responsabilidades

O Character não é responsável por:

- cálculos de GURPS;
- custos em pontos;
- dano;
- carga;
- movimento;
- NH;
- pré-requisitos;
- aplicação de modificadores;
- renderização;
- persistência;
- importação;
- exportação;
- lógica de interface.

Essas responsabilidades pertencem a outros módulos.

---

4. Composição

Um Character é composto pelos seguintes agregados:

Character
│
├── Identity
├── Attributes
├── SecondaryCharacteristics
├── Pools
├── Advantages
├── Disadvantages
├── Quirks
├── Skills
├── Techniques
├── Spells
├── Powers
├── Equipment
├── Attacks
├── Languages
├── Familiarities
├── Templates
├── State
└── Metadata

---

5. Estrutura Canônica

{
  identity,
  attributes,
  secondaryCharacteristics,
  pools,
  advantages,
  disadvantages,
  quirks,
  skills,
  techniques,
  spells,
  powers,
  equipment,
  attacks,
  languages,
  familiarities,
  templates,
  state,
  metadata
}

---

6. Dados Permanentes

São considerados permanentes:

- identity;
- attributes;
- secondaryCharacteristics;
- advantages;
- disadvantages;
- quirks;
- skills;
- techniques;
- spells;
- powers;
- equipment;
- attacks;
- languages;
- familiarities;
- templates;
- metadata.

---

7. Dados Transitórios

São considerados transitórios:

- HP atual;
- FP atual;
- ER atual;
- condições;
- efeitos temporários;
- buffs;
- debuffs;
- estado de combate;
- recursos consumidos durante a sessão.

Esses dados pertencem ao State ou aos agregados operacionais apropriados.

---

8. GURPS First

A SINGULAR é construída inicialmente para GURPS 4e.

O Character deve utilizar conceitos compatíveis com GURPS sempre que isso produzir um modelo mais claro.

Abstrações genéricas somente devem ser introduzidas quando resolverem um problema real da arquitetura.

---

9. Composição sobre Herança

O domínio deverá privilegiar:

- composição;
- objetos simples;
- serialização direta;
- funções puras.

Hierarquias profundas de herança devem ser evitadas.

---

10. Separação de Responsabilidades

O Character armazena dados.

Ele não contém:

- Schema;
- Rules;
- Presentation.

Esses elementos devem permanecer desacoplados.

---

11. Invariantes Estruturais

O Character deve sempre garantir apenas invariantes estruturais mínimas.

Um Character válido deve possuir:

- Identity;
- Attributes;
- State.

Identity deve conter:

- id;
- name.

Attributes deve conter:

- ST;
- DX;
- IQ;
- HT.

State deve existir mesmo que esteja vazio.

Estas invariantes não executam regras de GURPS.

Elas apenas garantem a integridade estrutural mínima do agregado.

Validações como:

- HP derivado de ST;
- limites de Pools;
- pré-requisitos de perícias;
- consistência de carga;
- cálculos de atributos secundários;

não pertencem ao Character.

Essas validações pertencem ao módulo Rules.

---

12. Serialização

O Character deve ser serializável para JSON sem perda estrutural.

A serialização não deve conter:

- métodos;
- referências circulares;
- estado de UI;
- dependências externas.

---

13. Direção de Implementação

A implementação deve evoluir para:

- composição;
- imutabilidade quando viável;
- funções puras;
- separação clara entre dados e regras.

O Aggregate Root deve permanecer simples e previsível.

---

14. Checklist de Implementação

- [x] Criar Character.md
- [x] Criar Character.js
- [ ] Criar Character.test.js
- [ ] Validar invariantes estruturais
- [ ] Validar serialização
- [ ] Refatorar Character.js para arquitetura funcional
- [ ] Aprovar Character v1.0
