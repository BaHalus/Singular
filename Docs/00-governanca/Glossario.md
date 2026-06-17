# Glossário da SINGULAR

**Código:** GLO-1.0

**Status:** Documento Normativo

---

# Objetivo

Este glossário estabelece o significado oficial dos principais termos utilizados na arquitetura da SINGULAR.

Todo documento do projeto deverá utilizar estes termos com os significados aqui definidos.

---

# Plataforma

A SINGULAR é uma plataforma para gerenciamento de personagens de RPG.

Ela não pertence a um sistema específico.

---

# Sistema

Conjunto de regras que define um RPG específico.

Exemplos:

- GURPS 4e
- D&D 5e
- Pathfinder 2e

Um sistema é implementado através de módulos.

---

# Módulo (Module)

Conjunto de regras, schemas, recursos e definições pertencentes a um sistema ou suplemento.

Exemplos:

- GURPS Básico
- GURPS Magic
- GURPS Powers

---

# Personagem (Character)

Entidade que representa um personagem jogável.

Contém apenas dados permanentes.

---

# Estado (State)

Representa informações temporárias do personagem durante a sessão.

Exemplos:

- PV atuais
- PF atuais
- munição restante
- efeitos temporários
- condições

---

# Trait

Característica intrínseca do personagem.

Exemplos:

- ST
- DX
- IQ
- HT
- Per
- Will
- Vision
- Hearing
- Threshold
- Force Sight

Traits representam capacidades permanentes.

---

# Pool

Recurso que possui um valor atual e um valor máximo.

Exemplos:

- HP
- FP
- Energy Reserve
- Mana
- Stress
- Sanidade

Pools possuem estado próprio.

---

# Item

Elemento persistente pertencente ao personagem.

Exemplos:

- Vantagem
- Desvantagem
- Perícia
- Técnica
- Magia
- Equipamento
- Idioma
- Ataque
- Poder
- Raça
- Template

O comportamento do Item é definido pelo seu Schema.

---

# Schema

Descrição declarativa de um tipo de Item.

Define:

- campos
- validações
- regras de exibição
- regras de edição
- regras de serialização
- metadados necessários ao Motor

Schemas nunca executam cálculos.

---

# Regra (Rule)

Definição declarativa utilizada pelo Motor para produzir resultados derivados.

---

# Modificador (Modifier)

Elemento que altera um valor sem modificar diretamente sua origem.

Exemplos:

- bônus
- penalidade
- multiplicador
- override parcial

Todos os modificadores são resolvidos pelo Motor.

---

# Override

Valor informado manualmente pelo usuário que substitui apenas o resultado final de um cálculo.

Nunca altera a fórmula original.

---

# Biblioteca (Library)

Coleção reutilizável de Items, Schemas e Modules.

É independente dos personagens.

---

# Comando (Command)

Representa uma intenção de alteração do sistema.

Exemplos:

- AddItem
- RemoveItem
- EquipItem
- SpendPool
- RenameCharacter

Todo Command pode gerar eventos.

---

# Evento (Event)

Notificação de que algo ocorreu no sistema.

Eventos descrevem fatos passados.

Exemplos:

- ItemAdded
- PoolChanged
- CharacterLoaded

---

# Motor (Engine)

Conjunto de serviços responsáveis por interpretar regras, calcular valores derivados, validar dados e resolver dependências.

---

# Persistência

Camada responsável pelo armazenamento e recuperação dos dados da aplicação.

---

# Interface (UI)

Camada responsável pela interação com o usuário.

Apresenta informações e coleta entradas.

Nunca executa regras de negócio.

---

# Auditoria

Capacidade do sistema de explicar a origem de qualquer valor calculado.

---

# Documento Normativo

Documento que estabelece regras obrigatórias para o projeto.

---

# RFC

Documento utilizado para propor novas funcionalidades ou mudanças arquiteturais antes de sua implementação.

---

# ADR

Registro permanente de uma decisão arquitetural e da justificativa para sua adoção.

---

# Fonte Única da Verdade

Princípio segundo o qual cada informação possui apenas uma representação canônica dentro do sistema.

Valores derivados nunca constituem uma nova fonte de verdade.
