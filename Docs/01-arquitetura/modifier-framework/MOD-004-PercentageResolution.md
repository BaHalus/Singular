# MOD-004 — Percentage Resolution

**Categoria:** Modifier Framework  
**Status:** Normativo  
**Versão:** 1.1

---

# 1. Objetivo

Este documento define o algoritmo padrão de resolução dos modificadores percentuais do Modifier Framework.

Sua responsabilidade consiste exclusivamente em consolidar e aplicar modificadores percentuais aos componentes de custo elegíveis de uma Trait.

Este documento pressupõe que:

- a taxonomia dos modificadores já foi definida;
- o pipeline oficial já determinou a posição desta etapa;
- toda preparação semântica já foi concluída.

---

# 2. Escopo

Este documento define exclusivamente:

- seleção de modificadores percentuais;
- consolidação percentual;
- aplicação por componente;
- limite inferior de redução;
- resultado da resolução;
- auditoria.

Este documento não define:

- elegibilidade de modificadores;
- extensões semânticas;
- ajustes estruturais de custo;
- Habilidades Alternativas;
- mecanismos especializados.

Esses assuntos pertencem a documentos próprios.

---

# 3. Entrada

A resolução percentual recebe um conjunto de modificadores previamente preparado pela etapa correspondente do pipeline oficial.

Cada modificador deve possuir, no mínimo:

- identificador;
- origem;
- valor percentual;
- escopo;
- estado.

Todos os modificadores recebidos já devem estar aptos para resolução.

---

# 4. Componentes de custo

Uma Trait pode possuir um ou mais componentes independentes de custo.

Exemplos incluem:

- custo-base;
- custo por nível;
- componentes adicionais;
- componentes definidos por mecanismos específicos.

Cada componente constitui uma unidade independente de resolução.

O algoritmo nunca combina componentes distintos.

---

# 5. Seleção dos modificadores

Para cada componente de custo, devem ser executados os seguintes passos:

1. identificar os modificadores compatíveis;
2. descartar modificadores incompatíveis com o escopo;
3. produzir o conjunto efetivamente aplicável.

O escopo declarado do modificador é obrigatório.

Nenhum modificador pode afetar componentes fora do seu escopo.

---

# 6. Consolidação percentual

Os modificadores selecionados são consolidados por soma algébrica.

Exemplo:

| Modificador | Valor |
|-------------|------:|
| Área | +50% |
| Alcance | +20% |
| Custo em Fadiga | -10% |

Resultado consolidado:

**+60%**

Esta etapa não realiza arredondamentos.

---

# 7. Limite inferior

Após a consolidação aplica-se o limite inferior previsto pelo Modifier Framework.

O menor valor permitido é:

**-80%**

Exemplos:

| Percentual consolidado | Percentual aplicado |
|------------------------|--------------------:|
| -30% | -30% |
| -80% | -80% |
| -120% | -80% |

O limite é aplicado individualmente para cada componente de custo.

---

# 8. Aplicação ao componente

Após a consolidação e eventual limitação, o percentual resultante é aplicado ao componente correspondente.

Cada componente produz seu próprio resultado.

A resolução percentual nunca altera:

- outros componentes;
- componentes incompatíveis com o escopo;
- mecanismos pertencentes a outras etapas do pipeline.

---

# 9. Resultado

Ao término da resolução, cada componente deve possuir:

- custo original;
- modificadores considerados;
- modificadores descartados;
- percentual consolidado;
- percentual efetivamente aplicado;
- indicação de eventual limitação pelo teto de -80%;
- custo resultante.

Esses dados constituem o resultado oficial da resolução percentual.

---

# 10. Auditoria

Toda resolução percentual deve ser completamente auditável.

A implementação deve permitir identificar:

- componentes resolvidos;
- modificadores considerados;
- modificadores descartados;
- motivo de cada descarte;
- percentual consolidado;
- aplicação do limite inferior;
- custo antes da resolução;
- custo após a resolução.

Nenhuma transformação pode ocorrer de forma implícita.

---

# 11. Algoritmo padrão

O algoritmo padrão do Modifier Framework executa os seguintes passos:

1. selecionar modificadores elegíveis;
2. separar modificadores incompatíveis;
3. consolidar percentuais por soma algébrica;
4. aplicar o limite inferior de -80%;
5. aplicar o percentual consolidado ao componente;
6. registrar o resultado para auditoria.

Qualquer estratégia alternativa de resolução percentual deverá ser definida por documentação normativa específica.

---

# 12. Princípios invariantes

## MOD-004-01

Cada componente de custo é resolvido independentemente.

---

## MOD-004-02

O algoritmo padrão consolida modificadores por soma algébrica.

---

## MOD-004-03

O limite inferior da resolução percentual é de -80%.

---

## MOD-004-04

O limite inferior aplica-se individualmente a cada componente.

---

## MOD-004-05

A resolução percentual atua exclusivamente sobre modificadores percentuais.

---

## MOD-004-06

Toda resolução percentual deve permanecer completamente auditável.

---

# 13. Relação com os demais documentos

Este documento define exclusivamente o algoritmo padrão de resolução percentual do Modifier Framework.

Os demais aspectos da resolução são definidos em documentos próprios:

- **MOD-001** — Modifier Framework Core;
- **MOD-002** — Modifier Resolution Pipeline;
- **MOD-003** — Modifier Semantic Extensions;
- **MOD-005** — Structural Cost Adjustments;
- demais documentos especializados.

O algoritmo definido neste documento constitui a implementação normativa da etapa de resolução percentual prevista pelo pipeline oficial.