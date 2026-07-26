# MOD-001 — Modifier Framework Core

**Categoria:** Modifier Framework  
**Status:** Normativo  
**Versão:** 1.1

---

# 1. Objetivo

O Modifier Framework define os princípios fundamentais para representação, classificação e resolução de modificadores mecânicos dentro da SINGULAR.

Seu objetivo é garantir que modificadores sejam:

- declarativos;
- rastreáveis;
- auditáveis;
- explicáveis;
- determinísticos;
- independentes de implementação.

O Framework estabelece a linguagem comum utilizada pelo motor, pela interface e por futuras extensões do sistema.

Ele não define regras específicas de Traits individuais nem substitui as regras declaradas pelos domínios que utilizam modificadores.

Além disso, o Modifier Framework define os contratos fundamentais que permitem a introdução de extensões normativas sem alterar seu núcleo nem o pipeline oficial de resolução.

---

# 2. Autoridade declarativa

Os modificadores pertencem ao domínio que os declara.

Exemplos:

- Traits possuem modificadores próprios;
- Equipamentos podem possuir modificadores próprios;
- Poderes podem declarar modificadores específicos;
- Outros domínios podem definir mecanismos adicionais.

O Modifier Framework interpreta essas declarações.

Ele não cria uma segunda autoridade paralela nem duplica informações declarativas existentes.

Toda informação utilizada pelo Framework deve possuir uma origem claramente identificável.

---

# 3. Classificação dos modificadores

O Framework distingue diferentes categorias de modificadores de acordo com sua natureza mecânica.

Categorias distintas representam comportamentos distintos.

Elas nunca devem ser tratadas como uma única operação matemática.

---

## 3.1 Modificadores estruturais intrínsecos

São modificadores que fazem parte da própria estrutura da Trait.

Exemplos incluem:

- adições estruturais;
- multiplicadores estruturais;
- divisores próprios da vantagem;
- outros componentes definidos pela própria Trait.

Esses modificadores não representam alterações percentuais.

Eles são incorporados à estrutura de custo da Trait antes da resolução dos modificadores percentuais.

Sua função é construir a estrutura mecânica da Trait que servirá de base para as etapas posteriores do pipeline.

---

## 3.2 Modificadores associados a componentes de custo

Uma Trait pode possuir mais de um componente de custo.

Exemplos:

- custo-base;
- custo por nível;
- componentes adicionais definidos pela própria Trait.

Todo modificador deve declarar explicitamente quais componentes pode afetar.

Escopos típicos incluem:

| Escopo | Componentes afetados |
|---|---|
| Base | Apenas o custo-base |
| Níveis | Apenas o custo por nível |
| Ambos | Todos os componentes elegíveis |

O Framework nunca amplia automaticamente esse escopo.

Um modificador somente pode afetar os componentes declarados por sua própria definição.

---

## 3.3 Modificadores percentuais

Modificadores percentuais representam alterações proporcionais do custo.

Participam desta categoria:

- modificadores provenientes da biblioteca;
- modificadores inerentes da Trait;
- Enhancements;
- Limitations;
- outras fontes compatíveis com o Modifier Framework.

Todos os modificadores percentuais elegíveis participam da mesma etapa de resolução.

Após sua consolidação, o resultado percentual é aplicado uma única vez aos componentes elegíveis.

O limite inferior da resolução percentual é de **-80%**.

Esse limite pertence exclusivamente à etapa percentual.

Ele não limita ajustes estruturais posteriores.

---

## 3.4 Ajustes estruturais de custo

Ajustes estruturais de custo representam mecanismos próprios de alteração de custo.

Eles não constituem modificadores percentuais.

Exemplos incluem:

- Uso Único;
- Custo em Pontos;
- Vantagens Potenciais;
- Vantagens Duplicadas;
- Vantagens Internas;
- outros mecanismos definidos pelo sistema.

Esses ajustes utilizam fatores estruturais representados na forma:

**n/x**

O Framework não assume que o numerador será sempre igual a 1.

Cada mecanismo define seu próprio fator estrutural.

Esses fatores:

- não participam da composição percentual;
- não estão sujeitos ao limite de -80%;
- são resolvidos em etapa própria do pipeline.

---

## 3.5 Habilidades Alternativas

Habilidades Alternativas constituem um mecanismo independente de redução de custo.

Sua resolução ocorre somente após a conclusão dos ajustes estruturais.

Elas:

- não participam da composição percentual;
- não utilizam o limite percentual de -80%;
- não integram a cadeia de fatores estruturais anterior.

Essa etapa determina:

- quais habilidades permanecem principais;
- quais recebem custo reduzido;
- quando múltiplas habilidades podem permanecer com custo integral.

---

## 3.6 Extensões normativas

O Modifier Framework admite extensões normativas que acrescentem novos comportamentos aos modificadores.

Essas extensões podem definir, entre outros aspectos:

- regras adicionais de elegibilidade;
- regras de composição;
- regras de interpretação;
- estratégias alternativas de resolução;
- mecanismos especializados compatíveis com o Framework.

As extensões não alteram a taxonomia fundamental apresentada neste documento.

Toda extensão deve preservar os contratos estabelecidos pelo Modifier Framework e produzir resultados compatíveis com o pipeline oficial de resolução.

A existência de extensões não modifica o comportamento normativo do núcleo do Framework.
---

# 4. Arredondamento

O Modifier Framework não determina que todas as etapas do pipeline realizem arredondamento.

Cada mecanismo define se sua etapa exige ou não arredondamento.

Quando uma regra mecânica determinar arredondamento de custo, deve ser utilizado arredondamento superior.

A operação normativa é:

**ceil()**

Exemplos:

| Valor | Resultado |
|------:|----------:|
| 0,2 | 1 |
| 0,9 | 1 |
| 1,1 | 2 |
| 4,01 | 5 |

Frações nunca reduzem um custo para zero.

Quando uma regra determinar aplicações sequenciais de fatores estruturais, cada fator deve concluir completamente sua própria resolução antes da aplicação do fator seguinte.

Caso essa regra exija arredondamento intermediário, o arredondamento deve ocorrer imediatamente após a aplicação daquele fator.

---

# 5. Princípios invariantes

Os princípios abaixo são normativos.

Eles representam contratos fundamentais do Modifier Framework e devem ser preservados por qualquer implementação compatível.

---

## MOD-001-01

Modificadores de natureza mecânica diferente nunca podem ser tratados como uma única operação matemática.

---

## MOD-001-02

Modificadores percentuais possuem limite inferior próprio de **-80%**.

Esse limite pertence exclusivamente à etapa percentual.

---

## MOD-001-03

Ajustes estruturais de custo não são modificadores percentuais.

Eles possuem regras próprias de resolução.

---

## MOD-001-04

A ordem das etapas do pipeline faz parte da regra mecânica.

Alterar essa ordem altera o resultado da resolução.

---

## MOD-001-05

Toda resolução deve permitir rastreamento completo das transformações aplicadas.

Cada etapa deve permanecer identificável durante auditoria.

---

## MOD-001-06

O escopo declarado de um modificador faz parte de sua definição mecânica.

Somente os componentes de custo pertencentes ao seu escopo podem ser afetados.

---

## MOD-001-07

Extensões normativas podem acrescentar novos comportamentos ao Modifier Framework.

Entretanto, elas não podem alterar os contratos fundamentais definidos por este documento nem violar o pipeline oficial de resolução.

---

# 6. Relação com os demais documentos

Este documento define exclusivamente os conceitos fundamentais do Modifier Framework.

Os demais aspectos da resolução são definidos por documentos específicos:

- **MOD-002** — Pipeline oficial de resolução;
- **MOD-003** — Semântica e extensibilidade dos modificadores;
- **MOD-004** — Resolução dos modificadores percentuais;
- documentos futuros que definam mecanismos especializados compatíveis com o Framework.

Este documento constitui a base normativa sobre a qual todos os demais documentos do Modifier Framework são construídos.