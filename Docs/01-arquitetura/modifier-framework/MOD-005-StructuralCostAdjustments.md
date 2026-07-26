# MOD-005 — Structural Cost Adjustments

**Categoria:** Modifier Framework  
**Status:** Normativo  
**Versão:** 1.0

---

# 1. Objetivo

Este documento define o algoritmo oficial de resolução dos ajustes estruturais de custo do Modifier Framework.

Os ajustes estruturais representam mecanismos que alteram o custo de uma Trait após a conclusão da resolução percentual.

Esses mecanismos não pertencem à resolução percentual e constituem uma etapa independente do pipeline oficial.

---

# 2. Escopo

Este documento define:

- fatores estruturais de custo;
- aplicação sequencial;
- ordem de resolução;
- arredondamentos estruturais;
- auditoria.

Este documento não define:

- modificadores percentuais;
- extensões semânticas;
- Habilidades Alternativas;
- mecanismos específicos de cada ajuste estrutural.

---

# 3. Entrada

A etapa recebe como entrada os custos produzidos pela resolução percentual.

Cada componente deve possuir:

- custo original;
- percentual consolidado;
- custo após resolução percentual.

Nenhuma consolidação percentual ocorre nesta etapa.

---

# 4. Ajustes estruturais

Um ajuste estrutural representa um mecanismo que altera diretamente o custo resultante de uma Trait.

Ao contrário dos modificadores percentuais, ajustes estruturais não modificam percentuais.

Eles modificam diretamente o valor do custo.

Cada ajuste define seu próprio fator estrutural.

---

# 5. Fatores estruturais

O Modifier Framework representa fatores estruturais na forma:

**n/x**

onde:

- **n** representa o numerador;
- **x** representa o denominador.

O Framework não assume que o numerador seja necessariamente igual a 1.

Essa representação permite mecanismos presentes nas regras oficiais e futuras extensões.

---

# 6. Ordem de aplicação

Quando houver múltiplos ajustes estruturais, eles devem ser aplicados sequencialmente.

Cada fator recebe como entrada o resultado produzido pelo fator imediatamente anterior.

Os fatores nunca são consolidados em uma única operação.

A ordem de aplicação deve ser definida pelo mecanismo correspondente ou por documentação normativa específica.

---

# 7. Arredondamento

Quando um mecanismo estrutural exigir arredondamento, ele deve ocorrer imediatamente após a aplicação do fator correspondente.

Exemplo conceitual:

1. aplicar fator;
2. arredondar;
3. aplicar o próximo fator.

O Modifier Framework adota arredondamento para cima (**ceil()**) sempre que uma regra determinar arredondamento intermediário.

Na ausência de exigência normativa, nenhum arredondamento adicional deve ser realizado.

---

# 8. Independência da resolução percentual

Os ajustes estruturais são completamente independentes da resolução percentual.

Consequentemente:

- não participam da consolidação percentual;
- não são limitados pelo teto de -80%;
- não alteram percentuais;
- não modificam a elegibilidade de modificadores.

Eles atuam exclusivamente sobre os custos já resolvidos.

---

# 9. Resultado

Ao término desta etapa, cada componente deve possuir:

- custo após resolução percentual;
- fatores estruturais aplicados;
- ordem de aplicação;
- arredondamentos realizados;
- custo estrutural resultante.

Esses valores passam a integrar o histórico oficial da resolução.

---

# 10. Auditoria

Toda aplicação de ajuste estrutural deve ser completamente auditável.

A implementação deve permitir identificar:

- fator aplicado;
- mecanismo responsável;
- ordem de aplicação;
- custo antes do fator;
- custo após o fator;
- arredondamento executado, quando houver;
- justificativa normativa.

Nenhuma transformação estrutural pode ocorrer implicitamente.

---

# 11. Algoritmo padrão

O algoritmo padrão executa os seguintes passos:

1. receber os custos produzidos pela resolução percentual;
2. identificar os fatores estruturais aplicáveis;
3. aplicar cada fator individualmente;
4. executar arredondamento quando exigido;
5. registrar o resultado;
6. encaminhar o custo resultante para a etapa seguinte do pipeline.

---

# 12. Princípios invariantes

## MOD-005-01

Fatores estruturais nunca participam da resolução percentual.

---

## MOD-005-02

Fatores estruturais nunca são limitados pelo teto de -80%.

---

## MOD-005-03

Cada fator estrutural é resolvido individualmente.

---

## MOD-005-04

A ordem de aplicação faz parte da mecânica da resolução.

---

## MOD-005-05

Sempre que um mecanismo exigir arredondamento intermediário, ele deve ocorrer imediatamente após o fator correspondente.

---

## MOD-005-06

Toda aplicação estrutural deve permanecer completamente auditável.

---

# 13. Relação com os demais documentos

Este documento define exclusivamente a resolução dos ajustes estruturais de custo.

Os demais aspectos do Modifier Framework são definidos em documentos próprios:

- **MOD-001** — Modifier Framework Core;
- **MOD-002** — Modifier Resolution Pipeline;
- **MOD-003** — Modifier Semantic Extensions;
- **MOD-004** — Percentage Resolution;
- **MOD-006** — Alternative Abilities.

Os ajustes estruturais constituem a etapa imediatamente posterior à resolução percentual no pipeline oficial.