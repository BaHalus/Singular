# MOD-002 — Modifier Resolution Pipeline

**Categoria:** Modifier Framework  
**Status:** Normativo  
**Versão:** 1.1

---

# 1. Objetivo

Este documento define o pipeline oficial de resolução de modificadores utilizado pelo Modifier Framework.

A ordem apresentada neste documento é normativa.

Toda implementação compatível com a SINGULAR deve preservar esta sequência de resolução.

Alterar a ordem das etapas altera o resultado mecânico da Trait.

Este documento define apenas a sequência de resolução.

Ele não define:

- a taxonomia dos modificadores;
- a matemática da resolução percentual;
- as regras específicas de mecanismos especializados.

Esses assuntos são tratados em documentos próprios.

---

# 2. Pipeline oficial

A resolução completa ocorre nas seguintes etapas:

1. Definição do custo estrutural inicial.
2. Construção estrutural da Trait.
3. Resolução dos componentes de custo.
4. Preparação da resolução percentual.
5. Resolução percentual.
6. Ajustes estruturais de custo.
7. Habilidades Alternativas.
8. Resultado final.

Cada etapa recebe como entrada o resultado produzido pela etapa imediatamente anterior.

Nenhuma etapa pode ser antecipada ou executada fora dessa sequência.

---

# 3. Etapa 1 — Definição do custo estrutural inicial

A Trait é analisada conforme sua definição estrutural original.

São identificados todos os componentes de custo declarados pela própria Trait.

Exemplos incluem:

- custo-base;
- custo por nível;
- componentes adicionais;
- estruturas especiais previstas pela própria Trait.

Nenhum modificador externo é aplicado nesta etapa.

O objetivo é estabelecer a estrutura original que será utilizada durante todo o restante do pipeline.

---

# 4. Etapa 2 — Construção estrutural da Trait

Após identificar os componentes de custo, são incorporados todos os elementos estruturais pertencentes à própria definição da Trait.

Incluem-se nesta etapa:

- adições estruturais;
- multiplicadores estruturais;
- divisores estruturais próprios;
- demais elementos intrínsecos da Trait.

Esses elementos não representam modificadores percentuais.

Seu objetivo é concluir a construção estrutural da Trait antes da aplicação de modificadores externos.

Ao término desta etapa, a estrutura de custo encontra-se completamente definida.

---

# 5. Etapa 3 — Resolução dos componentes de custo

Traits podem possuir múltiplos componentes independentes de custo.

Exemplos:

- custo-base;
- custo por nível;
- componentes adicionais definidos pela própria Trait.

Cada componente deve permanecer identificado durante toda a resolução.

Os modificadores somente podem atuar sobre componentes pertencentes ao seu escopo declarado.

O Framework nunca propaga automaticamente modificadores entre componentes distintos.

Cada componente mantém sua própria identidade durante todo o pipeline.

---

# 6. Etapa 4 — Preparação da resolução percentual

Antes da resolução percentual, o conjunto de modificadores deve ser preparado.

Esta etapa reúne todos os modificadores percentuais elegíveis.

Implementações podem executar etapas opcionais de normalização previstas por extensões normativas do Modifier Framework.

Essas extensões podem:

- transformar modificadores;
- consolidar mecanismos especializados;
- aplicar regras próprias de interpretação;
- produzir conjuntos equivalentes de modificadores percentuais.

Independentemente das transformações realizadas, a saída desta etapa deve permanecer compatível com a resolução percentual definida pelo Framework.

A preparação não altera a ordem oficial do pipeline.

Ela apenas produz a entrada que será consumida pela etapa seguinte.

---

# 7. Etapa 5 — Resolução percentual

A resolução percentual recebe o conjunto preparado na etapa anterior.

Sua responsabilidade é:

- consolidar modificadores percentuais;
- respeitar o escopo de cada modificador;
- aplicar o limite percentual definido pelo Framework;
- produzir os custos resultantes de cada componente.

A matemática desta etapa é definida pelo documento específico de resolução percentual.

Este documento define apenas sua posição dentro do pipeline.
---

# 8. Etapa 6 — Ajustes estruturais de custo

Após a conclusão da resolução percentual, aplicam-se os ajustes estruturais de custo.

Esses ajustes representam mecanismos independentes da resolução percentual.

Exemplos incluem:

- Uso Único;
- Custo em Pontos;
- Vantagens Potenciais;
- Vantagens Duplicadas;
- Vantagens Internas;
- outros mecanismos compatíveis com o Modifier Framework.

Cada mecanismo define seu próprio fator estrutural.

O Modifier Framework apenas determina sua posição dentro do pipeline.

Quando múltiplos ajustes estruturais estiverem presentes, eles devem ser aplicados na ordem definida pelas regras do próprio mecanismo ou por documento normativo específico.

Quando uma regra exigir arredondamento intermediário, ele deve ocorrer imediatamente após a aplicação do fator correspondente.

O resultado produzido por esta etapa constitui a entrada da etapa seguinte.

---

# 9. Etapa 7 — Habilidades Alternativas

A resolução de Habilidades Alternativas ocorre somente após a conclusão dos ajustes estruturais de custo.

Essa etapa utiliza o custo resultante produzido pelas etapas anteriores.

Sua responsabilidade é determinar:

- quais Traits permanecem principais;
- quais recebem custo reduzido;
- quando múltiplas Traits podem permanecer com custo integral.

Habilidades Alternativas constituem um mecanismo independente.

Elas não participam:

- da resolução percentual;
- da consolidação de modificadores;
- dos ajustes estruturais anteriores.

As regras específicas desse mecanismo são definidas em documentação própria.

---

# 10. Etapa 8 — Resultado final

Ao término do pipeline, cada componente da Trait possui seu custo definitivo.

O resultado final deve preservar:

- custo estrutural inicial;
- componentes de custo identificados;
- modificadores aplicados;
- percentual consolidado;
- ajustes estruturais executados;
- resolução de Habilidades Alternativas, quando aplicável;
- custo final.

Esse histórico constitui a trilha oficial de auditoria da resolução.

---

# 11. Auditoria

Toda implementação compatível com o Modifier Framework deve permitir reconstruir completamente o processo de resolução.

A auditoria deve permitir identificar, no mínimo:

- entrada de cada etapa;
- saída de cada etapa;
- modificações produzidas;
- mecanismos responsáveis por cada transformação;
- justificativa para modificadores descartados, quando houver.

Cada etapa deve permanecer individualmente identificável.

A auditoria não depende da implementação interna do motor.

Ela faz parte do contrato do Framework.

---

# 12. Princípios invariantes

## MOD-002-01

As etapas do pipeline possuem ordem normativa.

Nenhuma implementação pode alterar essa sequência.

---

## MOD-002-02

Cada etapa recebe exclusivamente o resultado produzido pela etapa anterior.

---

## MOD-002-03

A preparação da resolução percentual pode transformar ou normalizar modificadores, mas deve produzir um conjunto compatível com a resolução percentual oficial.

---

## MOD-002-04

A resolução percentual nunca executa ajustes estruturais de custo.

---

## MOD-002-05

Ajustes estruturais sempre ocorrem antes da resolução de Habilidades Alternativas.

---

## MOD-002-06

Toda etapa do pipeline deve permanecer completamente auditável.

---

# 13. Relação com os demais documentos

Este documento define exclusivamente a sequência oficial de resolução do Modifier Framework.

Os demais aspectos da resolução são especificados em documentos próprios:

- **MOD-001** — Conceitos fundamentais e taxonomia;
- **MOD-003** — Semântica e extensibilidade dos modificadores;
- **MOD-004** — Resolução dos modificadores percentuais;
- documentos futuros que definam mecanismos especializados.

O pipeline definido neste documento constitui o eixo central de integração entre todos os componentes do Modifier Framework.