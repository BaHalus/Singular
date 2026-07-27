# SINGULAR Development Playbook

Este documento define como os agentes colaboram durante o desenvolvimento.

---

# Objetivo

Produzir software incremental, previsível, documentado e sem regressões.

Nenhum agente trabalha isoladamente.

Todo trabalho segue este fluxo.

---

# Fluxo oficial

1. Project Manager

Analisa o estado atual do projeto.

Define a próxima entrega.

↓

2. Architect

Produz o plano técnico.

Define etapas.

Identifica dependências.

↓

3. Implementer

Implementa somente o que foi planejado.

↓

4. Reviewer

Revisa.

Valida.

Procura regressões.

↓

5. Project Manager

Marca a entrega como concluída.

Atualiza o backlog.

Seleciona a próxima entrega.

---

# Regras

Nunca iniciar uma implementação sem planejamento.

Nunca alterar arquitetura durante implementação.

Nunca aprovar código sem revisão.

Nunca implementar mais de uma grande funcionalidade simultaneamente.

Toda funcionalidade deve ser incremental.

---

# Prioridades

1. Estabilidade

2. Simplicidade

3. Legibilidade

4. Modularidade

5. Performance

---

# Filosofia

Planejar pouco.

Implementar pouco.

Validar sempre.

Evoluir continuamente.