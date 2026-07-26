# MOD-003 — Modifier Semantic Extensions

**Categoria:** Modifier Framework  
**Status:** Normativo  
**Versão:** 1.0

---

# 1. Objetivo

Este documento define o mecanismo oficial de extensibilidade semântica do Modifier Framework.

Seu objetivo é permitir a introdução de novos comportamentos para modificadores sem alterar:

- a taxonomia do Framework;
- o pipeline oficial;
- o algoritmo de resolução percentual.

As extensões definidas neste documento constituem pontos oficiais de evolução do Framework.

---

# 2. Escopo

Este documento não define novos modificadores.

Também não define:

- matemática da resolução percentual;
- ajustes estruturais de custo;
- Habilidades Alternativas.

Seu único objetivo é estabelecer como novos comportamentos podem ser incorporados ao Framework.

---

# 3. Conceito de extensão semântica

Uma extensão semântica é um mecanismo capaz de alterar a interpretação de modificadores antes da etapa de resolução percentual.

Uma extensão pode:

- transformar modificadores;
- combinar modificadores;
- substituir modificadores;
- eliminar modificadores;
- alterar a estratégia de resolução;
- produzir modificadores equivalentes.

Entretanto, ela não altera o pipeline oficial.

---

# 4. Posição no pipeline

As extensões semânticas são executadas durante a etapa de preparação da resolução percentual definida pelo MOD-002.

Sua entrada consiste no conjunto de modificadores elegíveis.

Sua saída consiste em um novo conjunto equivalente de modificadores percentuais.

Esse conjunto torna-se a entrada oficial da resolução percentual.

---

# 5. Contrato de entrada

Uma extensão recebe:

- componentes de custo;
- modificadores elegíveis;
- escopo de cada modificador;
- origem de cada modificador;
- demais informações necessárias ao comportamento especializado.

A extensão nunca recebe custos já resolvidos.

Ela trabalha exclusivamente sobre modificadores.

---

# 6. Contrato de saída

Após sua execução, a extensão deve produzir um conjunto consistente de modificadores.

Cada modificador resultante deve possuir:

- identificador;
- origem;
- valor percentual;
- escopo;
- estado.

A saída deve ser completamente compatível com a etapa oficial de resolução percentual.

---

# 7. Restrições

Uma extensão semântica não pode:

- alterar componentes de custo;
- alterar a ordem do pipeline;
- executar ajustes estruturais;
- executar Habilidades Alternativas;
- modificar diretamente o custo da Trait.

Sua responsabilidade limita-se exclusivamente à preparação da resolução percentual.

---

# 8. Compatibilidade

Extensões podem coexistir.

Quando múltiplas extensões forem utilizadas, sua ordem de execução deve ser definida por documentação normativa específica.

Cada extensão deve preservar a compatibilidade do conjunto produzido para a extensão seguinte.

A última extensão deve produzir uma saída compatível com a resolução percentual oficial.

---

# 9. Exemplos de extensões

Este documento prevê, entre outras possibilidades:

- modificadores sobre modificadores;
- limitações Either/Or;
- modificadores multiplicativos;
- modificadores condicionais;
- grupos mutuamente exclusivos;
- outros mecanismos especializados.

A existência desses exemplos não implica sua implementação obrigatória.

Cada mecanismo deverá possuir documentação normativa própria.

---

# 10. Auditoria

Toda extensão deve ser completamente auditável.

A auditoria deve permitir identificar:

- modificadores recebidos;
- transformações realizadas;
- modificadores produzidos;
- justificativa para exclusões;
- justificativa para substituições;
- justificativa para consolidações.

Nenhuma transformação pode ocorrer de forma implícita.

---

# 11. Princípios invariantes

## MOD-003-01

Toda extensão atua exclusivamente durante a preparação da resolução percentual.

---

## MOD-003-02

Toda extensão produz um conjunto equivalente de modificadores.

---

## MOD-003-03

Extensões nunca alteram o pipeline oficial.

---

## MOD-003-04

Extensões nunca executam ajustes estruturais.

---

## MOD-003-05

Extensões nunca executam Habilidades Alternativas.

---

## MOD-003-06

Toda transformação produzida por uma extensão deve permanecer completamente auditável.

---

# 12. Relação com os demais documentos

Este documento define apenas a infraestrutura de extensibilidade do Modifier Framework.

Os demais documentos permanecem responsáveis por seus respectivos domínios:

- **MOD-001** — Conceitos fundamentais;
- **MOD-002** — Pipeline oficial;
- **MOD-004** — Resolução percentual;
- documentos futuros que definam comportamentos especializados.

Cada comportamento avançado deve ser documentado separadamente, preservando os contratos definidos neste documento.