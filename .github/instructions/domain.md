# SINGULAR — Domain Instructions

## Objetivo

Este documento descreve o domínio funcional da SINGULAR.

Todo agente deve compreender este domínio antes de implementar novas funcionalidades.

---

# O que é a SINGULAR

A SINGULAR é uma ficha digital para GURPS 4ª Edição.

Não é um sistema genérico de RPG.

Toda modelagem deve representar conceitos próprios de GURPS.

---

# O princípio mais importante

O domínio é soberano.

A interface nunca define regras.

Toda regra pertence ao Motor.

---

# O núcleo do domínio

O núcleo do sistema é o Character.

Todo o restante existe para representar aspectos de um personagem.

Exemplos:

- Attributes
- Secondary Characteristics
- Traits
- Skills
- Techniques
- Spells
- Equipment
- Languages
- Attacks
- Defenses
- Powers

Todos pertencem ao Character.

---

# Não criar abstrações genéricas

Evite modelos como:

- Resource
- Ability
- Statistic
- Entity

Eles escondem conceitos importantes de GURPS.

Prefira modelar diretamente:

- Advantage
- Disadvantage
- Quirk
- Skill
- Technique
- Spell
- Equipment
- Modifier
- Attack
- Armor

---

# Motor Soberano

Toda regra matemática pertence ao Motor.

Exemplos:

- custo de atributos
- custo de vantagens
- modificadores
- NH
- dano
- carga
- velocidade
- esquiva

A UI apenas consome resultados.

Nunca replique cálculos na interface.

---

# Snapshot

A interface trabalha sobre um Snapshot produzido pelo Motor.

A UI nunca recalcula valores.

A UI apenas:

- apresenta
- filtra
- ordena
- edita dados

Após alterações, solicita novo processamento ao Motor.

---

# Modifier Framework

O Modifier Framework é responsável exclusivamente pela resolução de modificadores.

Sua organização atual é:

MOD-001 Core

MOD-002 Pipeline

MOD-003 Semantic Extensions

MOD-004 Percentage Resolution

MOD-005 Structural Cost Adjustments

MOD-006 Alternative Abilities

O agente nunca deve alterar essa organização sem atualizar a documentação correspondente.

---

# Documentação primeiro

Antes de implementar:

1. localizar a documentação
2. verificar ADRs
3. verificar o Modifier Framework
4. verificar impactos
5. somente então alterar código

---

# Evolução

Mudanças devem ser pequenas.

Evite grandes refatorações.

Prefira melhorias incrementais.

---

# Testabilidade

Toda implementação deve ser verificável.

Sempre que possível:

- criar testes
- validar regressões
- preservar compatibilidade

---

# Objetivo Final

A SINGULAR deve permanecer:

- modular
- documentada
- previsível
- auditável
- fiel às regras de GURPS

Toda implementação deve preservar esses princípios.