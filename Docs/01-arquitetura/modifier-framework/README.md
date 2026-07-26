# Modifier Framework

**Status:** Normativo  
**Versão:** 1.0

---

# Visão geral

O Modifier Framework define a arquitetura oficial de resolução de modificadores da SINGULAR.

Seu objetivo é separar claramente:

- conceitos;
- pipeline;
- extensibilidade;
- resolução percentual;
- ajustes estruturais;
- mecanismos especializados.

Cada documento possui uma responsabilidade única e bem definida.

O Framework foi projetado para evoluir por meio da adição de novos documentos, evitando alterações frequentes no núcleo arquitetural.

---

# Organização

```
Modifier Framework

MOD-001
Modifier Framework Core

↓

MOD-002
Modifier Resolution Pipeline

↓

MOD-003
Modifier Semantic Extensions

↓

MOD-004
Percentage Resolution

↓

MOD-005
Structural Cost Adjustments

↓

MOD-006
Alternative Abilities
```

Essa sequência representa o fluxo lógico da arquitetura.

Nem todos os documentos correspondem diretamente a uma etapa de execução.

Alguns definem conceitos fundamentais e outros especificam algoritmos executados durante o pipeline.

---

# Documentos

## MOD-001 — Modifier Framework Core

Define os conceitos fundamentais do Framework.

Responsabilidades:

- taxonomia;
- categorias de modificadores;
- conceitos normativos;
- invariantes arquiteturais.

---

## MOD-002 — Modifier Resolution Pipeline

Define a sequência oficial de resolução.

Responsabilidades:

- ordem das etapas;
- responsabilidades de cada etapa;
- contratos entre etapas.

---

## MOD-003 — Modifier Semantic Extensions

Define como novos comportamentos podem ser incorporados ao Framework.

Responsabilidades:

- preparação da resolução percentual;
- extensões semânticas;
- contratos de entrada e saída;
- compatibilidade.

---

## MOD-004 — Percentage Resolution

Define o algoritmo padrão de resolução dos modificadores percentuais.

Responsabilidades:

- seleção;
- consolidação;
- teto de -80%;
- aplicação por componente;
- auditoria.

---

## MOD-005 — Structural Cost Adjustments

Define a resolução dos ajustes estruturais de custo.

Responsabilidades:

- fatores estruturais;
- ordem de aplicação;
- arredondamentos;
- auditoria.

---

## MOD-006 — Alternative Abilities

Define a infraestrutura de resolução das Habilidades Alternativas.

Responsabilidades:

- grupos;
- habilidade principal;
- habilidades alternativas;
- resolução;
- auditoria.

---

# Evolução do Framework

Novos mecanismos não devem alterar os documentos fundamentais sempre que possível.

A evolução do Framework deve ocorrer preferencialmente por meio de documentos especializados.

Exemplos:

```
MOD-101 — Either/Or Limitations

MOD-102 — Modifier on Modifier

MOD-103 — Multiplicative Modifiers

MOD-104 — One-Use Abilities

MOD-105 — Costs Character Points
```

Esses documentos especializam o comportamento do Framework preservando os contratos definidos pelos documentos fundamentais.

---

# Princípios arquiteturais

O Modifier Framework adota os seguintes princípios:

- responsabilidade única por documento;
- separação entre conceitos e algoritmos;
- pipeline determinístico;
- contratos explícitos entre etapas;
- auditoria completa;
- extensibilidade controlada;
- compatibilidade retroativa sempre que possível.

---

# Ordem de leitura

Para compreender completamente o Framework recomenda-se a seguinte sequência:

1. MOD-001 — Modifier Framework Core
2. MOD-002 — Modifier Resolution Pipeline
3. MOD-003 — Modifier Semantic Extensions
4. MOD-004 — Percentage Resolution
5. MOD-005 — Structural Cost Adjustments
6. MOD-006 — Alternative Abilities

---

# Relação com a arquitetura da SINGULAR

O Modifier Framework integra o núcleo do domínio da SINGULAR.

Ele fornece os contratos utilizados pelo Motor Soberano para resolver modificadores, preservando separação entre:

- definição da Trait;
- resolução matemática;
- regras estruturais;
- mecanismos especializados.

A interface de usuário (UI) nunca implementa essas regras diretamente.

Toda resolução pertence ao domínio do Motor Soberano.