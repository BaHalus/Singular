Modelo de Domínio da SINGULAR

Versão: 1.0 (Fundacional)

Status: Documento Permanente de Arquitetura

---

Objetivo

Este documento define os principais conceitos do domínio da plataforma SINGULAR.

Seu objetivo é estabelecer quais objetos existem na aplicação, quais responsabilidades possuem e como se relacionam.

A implementação deverá respeitar este modelo.

---

Princípios

- O núcleo da SINGULAR não conhece regras específicas de GURPS.
- GURPS é implementado através de Schemas e Módulos.
- O domínio é orientado a entidades genéricas.
- Todo comportamento específico pertence aos módulos de regras.
- Todo cálculo pertence ao Motor.

---

Classificação dos Objetos

Todos os objetos da plataforma pertencem a uma das quatro categorias abaixo.

1. Entidades

Entidades possuem identidade permanente.

Sempre possuem UUID.

Exemplos:

- Character
- Item
- Library
- Module
- Campaign
- Template
- Profile

As entidades permanecem identificáveis mesmo quando seus dados são alterados.

---

2. Objetos de Valor (Value Objects)

Objetos de Valor não possuem identidade.

São definidos exclusivamente pelo seu conteúdo.

Exemplos:

- Damage
- Weight
- Cost
- Modifier
- SkillLevel
- CurrencyAmount
- PointCost

Dois Objetos de Valor com os mesmos dados são considerados equivalentes.

---

3. Estados

Estados representam informações temporárias.

São descartáveis.

Exemplos:

- CharacterState
- ItemState
- EquipmentState
- CombatState
- ConditionState
- SpellState

Estados nunca modificam permanentemente uma Entidade.

---

4. Serviços

Serviços representam comportamento.

Não armazenam dados permanentes do personagem.

Exemplos:

- Engine
- EventBus
- Storage
- History
- Registry
- Importer
- Exporter
- Renderer

---

Entidade Character

Character representa o personagem.

Ele contém apenas informações permanentes.

Estrutura conceitual:

- id
- version
- identity
- attributes
- resources
- items
- preferences
- metadata

Character não possui listas específicas para vantagens, perícias, magias ou equipamentos.

Todos esses elementos são representados por Items.

---

Entidade Item

Item representa qualquer elemento persistente pertencente ao personagem.

Exemplos:

- vantagem
- desvantagem
- perícia
- técnica
- magia
- equipamento
- ataque
- idioma
- familiaridade
- raça
- template
- poder
- recipiente

Estrutura conceitual:

- id
- schemaId
- moduleId
- fields
- derivedFields
- modifiers
- flags
- notes
- metadata

O comportamento do Item é definido pelo Schema correspondente.

---

Entidade Library

Library representa uma coleção reutilizável de objetos.

Estrutura conceitual:

- id
- items
- modules
- metadata

A Library nunca pertence diretamente ao Character.

---

Entidade Module

Module representa um suplemento ou conjunto de regras.

Estrutura conceitual:

- id
- name
- version
- schemas
- rules
- assets
- translations
- metadata

Novos suplementos devem ser adicionados através de Modules.

---

Entidade Schema

Schema descreve um tipo de Item.

Um Schema define:

- campos
- validações
- regras de exibição
- regras de edição
- regras de serialização
- regras de cálculo declarativas

O Schema nunca executa cálculos.

O Motor interpreta os Schemas.

---

Character State

State representa exclusivamente informações temporárias.

Estrutura conceitual:

- itemStates
- resourceStates
- conditions
- ui
- runtime

State nunca altera permanentemente Character.

---

Especialização através de Schemas

Todos os elementos específicos de GURPS são especializações de Item.

Exemplos:

- Advantage
- Disadvantage
- Skill
- Technique
- Spell
- Equipment
- Weapon
- Armor
- Language
- Familiarity
- Race
- Template
- Attack

Esses tipos não pertencem ao núcleo da plataforma.

Eles pertencem ao módulo GURPS.

---

Relações Fundamentais

Character possui Items.

Items utilizam Schemas.

Schemas pertencem a Modules.

Modules podem ser armazenados em Libraries.

State representa apenas informações temporárias.

Engine interpreta Character, State, Modules e Schemas para produzir os dados derivados.

---

Objetivos Arquiteturais

Este modelo busca garantir:

- desacoplamento entre núcleo e regras de jogo;
- alta extensibilidade;
- baixo acoplamento entre componentes;
- facilidade de manutenção;
- possibilidade de novos suplementos sem alteração do núcleo;
- reutilização máxima de código.

---

Resumo

O núcleo da SINGULAR conhece apenas os seguintes conceitos fundamentais:

- Character
- Item
- State
- Library
- Module
- Schema
- Engine
- EventBus
- Storage
- History
- Registry

Todo o restante é implementado por módulos especializados.
