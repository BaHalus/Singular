# SINGULAR — Architecture Instructions

## Objetivo

A SINGULAR é uma ficha digital para GURPS 4ª Edição.

Este repositório deve priorizar:

- simplicidade
- modularidade
- legibilidade
- baixo acoplamento
- alta coesão
- documentação antes da implementação

---

# Princípios Fundamentais

## 1. O domínio é soberano

A modelagem do domínio sempre vem antes da interface.

A UI nunca define regras do sistema.

---

## 2. O Motor é soberano

Toda regra de negócio pertence ao Motor.

A interface apenas apresenta informações.

Nunca implemente cálculos na UI.

---

## 3. Documentação é código

Toda arquitetura relevante deve possuir documentação.

Documentos oficiais possuem prioridade sobre comentários em código.

---

## 4. Evolução incremental

Prefira pequenas mudanças.

Evite grandes refatorações.

Cada alteração deve ser pequena, revisável e testável.

---

## 5. Não criar abstrações genéricas desnecessárias

Evite criar modelos genéricos como:

- Resource
- Entity
- Ability
- Statistic

Modele conceitos próprios de GURPS.

---

# Organização

Arquitetura:

Docs/

Código:

src/

Ferramentas:

tools/

ATK:

tools/atk/

---

# Architecture Toolkit

Toda documentação deve ser criada pelo ATK.

Sempre que possível utilize:

npm run atk:new

em vez de criar documentos manualmente.

---

# Modificações

Antes de alterar uma arquitetura:

1. localizar a documentação correspondente
2. verificar ADRs
3. verificar impactos
4. somente então alterar código

---

# Commits

Commits devem ser pequenos.

Cada commit deve representar apenas uma responsabilidade.

---

# Objetivo Final

Manter a SINGULAR como um projeto modular, documentado e evolutivo.