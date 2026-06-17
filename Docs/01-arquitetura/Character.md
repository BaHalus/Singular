# Character — SINGULAR

## 1. Definição

Um Character é o **agregado raiz do sistema SINGULAR para GURPS 4e**.

Ele representa uma instância completa e coerente de personagem jogável, contendo identidade, construção, capacidades, estado e equipamentos sob um modelo estritamente composto.

O Character NÃO é um modelo genérico de RPG. Ele é um modelo específico de GURPS com possibilidade futura de extensão modular.

---

## 2. Princípios fundamentais

### 2.1 Composição sobre herança
O Character não herda de uma hierarquia de nós.
Ele é composto por subestruturas independentes.

### 2.2 Separação de responsabilidades
- Schema → estrutura de dados
- Rules → lógica de GURPS
- Presentation → UI/UX

O Character pertence exclusivamente ao domínio estrutural.

### 2.3 Coerência interna
O Character deve sempre existir em estado válido segundo regras estruturais mínimas (invariantes).

---

## 3. Estrutura do Character

O Character é composto pelos seguintes sub-agregados:

### 3.1 Identity
Identificação do personagem e metadados:
- id
- name
- concept
- playerId (opcional)
- campaignId (opcional)

---

### 3.2 Attributes
Atributos base GURPS:
- ST
- DX
- IQ
- HT

---

### 3.3 Secondary Characteristics
Derivados estruturais:
- HP
- FP
- Will
- Perception
- Basic Speed
- Basic Move

---

### 3.4 Pools
Recursos dinâmicos derivados ou independentes:
- Current HP
- Current FP
- Current ER (se aplicável)

---

### 3.5 Advantages
Lista de vantagens compradas.

---

### 3.6 Disadvantages
Lista de desvantagens.

---

### 3.7 Quirks
Traços menores de custo reduzido.

---

### 3.8 Skills
Lista de habilidades com níveis e base attribute links.

---

### 3.9 Techniques
Sub-habilidades derivadas de skills.

---

### 3.10 Spells (opcional)
Magias quando o módulo estiver ativo.

---

### 3.11 Powers (opcional)
Sistema de poderes (módulo extensível).

---

### 3.12 Equipment
Inventário estruturado:
- itens
- containers
- peso
- carga

---

### 3.13 Attacks
Derivação de combate:
- ataques corpo a corpo
- ataques à distância
- armas equipadas

---

### 3.14 Languages
Idiomas conhecidos.

---

### 3.15 Familiarities
Conhecimentos culturais ou técnicos leves.

---

### 3.16 Templates
- racial templates
- character templates

---

### 3.17 State
Estado transitório do personagem:
- conditions (stunned, bleeding etc.)
- modifiers temporários
- buffs/debuffs
- status de combate

---

## 4. Permanente vs Temporário

### Permanente
- Identity
- Attributes
- Advantages
- Disadvantages
- Skills
- Techniques
- Templates
- Languages
- Familiarities
- Equipment base

### Temporário
- Current HP / FP
- Conditions
- Modifiers temporários
- estado de combate
- carga momentânea

---

## 5. Invariantes do Character

O Character deve sempre garantir:

- HP máximo derivado de ST (via Rules)
- Pools nunca excedem máximos definidos por Rules
- Skills sempre referenciam Attributes válidos
- Equipment sempre consistente com carga
- State não pode alterar estrutura permanente

---

## 6. Limites do domínio

O Character NÃO é responsável por:

- cálculos de regras GURPS
- lógica de validação de custo
- renderização ou layout
- decisões de UI
- formatação de dados

Essas responsabilidades pertencem a:

- Rules module
- Presentation layer

---

## 7. Ciclo de vida

### 7.1 Criação
Character nasce com Identity + estrutura mínima.

### 7.2 Construção
Recebe:
- attributes
- advantages/disadvantages
- skills
- templates

### 7.3 Execução
Durante jogo:
- state é atualizado
- pools são consumidos
- equipment influencia carga e combate

### 7.4 Persistência
Character pode ser serializado como JSON estruturado baseado em Schema.

---

## 8. Fronteira arquitetural

Character é:

- agregado raiz
- fonte de verdade estrutural
- independente de UI
- independente de regras

Character NÃO contém lógica de cálculo.
Character NÃO contém lógica de apresentação.

Ele apenas organiza e mantém consistência estrutural dos dados.
