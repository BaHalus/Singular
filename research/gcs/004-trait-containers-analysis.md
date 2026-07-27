# Análise — Trait Containers no contexto GCS

## Visão geral

O tema central deste estudo é a distinção entre nós de uma árvore de traits que representam verdadeiras características jogáveis e nós que funcionam apenas como agrupamentos estruturais ou semânticos no formato GCS. O ponto de partida é a ideia de que o GCS não organiza todas as entradas como traits finais; parte da estrutura existe para dar contexto, hierarquia, navegação e semântica, não para virar automaticamente um elemento do personagem.

> Como o documento de pesquisa original não estava presente no workspace, esta análise foi consolidada com base em documentos de arquitetura e decisão do repositório relacionados ao tema, especialmente os materiais sobre importação de traits, containers alternativos e autoridade final de custo.

---

## 1. Contexto

No modelo de GURPS representado pelo GCS, a informação sobre vantagens, desvantagens, qualidades, peculiaridades, poderes, raças, meta-características e templates pode aparecer em uma estrutura hierárquica complexa. Nesse contexto:

- alguns nós representam traits jogáveis de fato;
- outros são apenas containers de organização;
- alguns podem carregar dados ricos, como modificadores, features, prereqs, tags e filhos;
- a mesma estrutura pode ser usada para representar tanto uma entidade mecânica quanto um agrupamento semântico.

Isso cria uma tensão conceitual importante: o importador precisa preservar a riqueza da fonte sem assumir, de forma prematura, que cada nó da árvore corresponde a uma entidade final do personagem.

---

## 2. Problemas principais

### 2.1 Ambiguidade estrutural

A maior dificuldade é que a árvore do GCS mistura dois papéis distintos:

- representação de traits efetivamente jogáveis;
- organização de conteúdo em containers semânticos.

Se o processo de importação tratar todos os nós como traits, haverá risco de criar entidades artificiais, duplicar informações ou perder o contexto original da fonte.

### 2.2 Risco de sobreinterpretação da fonte

Há um risco claro de converter dados externos em regras canônicas sem evidência suficiente. Por exemplo, um container pode ter aparência de trait, mas sua função real pode ser apenas estrutural.

### 2.3 Complexidade das relações entre traits e containers

Alguns casos exigem cuidado especial, como:

- habilidades alternativas;
- poderes com hierarquia própria;
- raças, templates e meta-características;
- agrupamentos visuais ou de navegação.

Esses elementos não devem ser confundidos com uma nova categoria de trait simplesmente porque aparecem na árvore.

### 2.4 Necessidade de preservar informação sem impor lógica indevida

O domínio precisa ser capaz de conservar a intenção do arquivo GCS, mas sem transformar o importador em um mecanismo de interpretação de regras completo. Isso é especialmente importante quando a estrutura é ambígua ou quando o GCS usa convenções específicas que não possuem um equivalente direto no modelo canônico da ficha.

---

## 3. Alternativas consideradas

### Alternativa A — Flattening direto da árvore

Nessa abordagem, cada nó da árvore seria transformado imediatamente em uma entidade do personagem.

Pontos fortes:
- simples de implementar;
- parece direto à primeira vista.

Problemas:
- produz muitos falsos positivos;
- perde contexto estrutural;
- pode gerar entidades sem correspondência mecânica real;
- aumenta o risco de interpretação indevida da fonte.

Essa alternativa é inadequada para o domínio porque confunde organização com entidade.

### Alternativa B — Preservação conservadora da árvore intermediária

Essa abordagem define uma etapa intermediária de classificação, onde cada nó é avaliado como:

- trait;
- container;
- unknown.

Essa opção preserva a estrutura original e evita interpretações precipitadas. Ela é mais apropriada porque separa o que a fonte “diz” do que o modelo canônico “entende”.

### Alternativa C — Tratamento especializado por tipo de container

Aqui, alguns containers seriam interpretados de forma específica, como no caso de habilidades alternativas ou poderes. Essa alternativa é útil, mas exige um conjunto claro de regras semântico-mecânicas. Sem isso, o risco de inventar comportamento cresce rapidamente.

---

## 4. Impacto no domínio

A questão dos trait containers impacta diretamente o domínio em três níveis:

### 4.1 Clareza da fronteira entre importação e regra

A principal consequência conceitual é separar claramente aquilo que é importação de fonte do que é interpretação de regras. O importador deve preservar a estrutura e os metadados, mas não deve assumir responsabilidade por decisões mecânicas que dependem de uma política de custo, de regras de grupo alternativo ou de avaliação final.

### 4.2 Preservação da intenção do personagem

Quando um container é tratado como estrutura e não como trait, a ficha preserva melhor o conteúdo original do GCS. Isso é especialmente importante em cenários em que a hierarquia do arquivo carrega significado sem necessariamente corresponder a uma entidade jogável isolada.

### 4.3 Regras de composição e custo

Habilidades alternativas, por exemplo, não devem ser tratadas como uma nova categoria de advantage. Em vez disso, elas passam a funcionar como uma relação estrutural entre membros e um grupo de alternativas. Isso tem impacto direto na forma como o custo e a contribuição final devem ser avaliados, mas sem que o importador assuma essa avaliação por conta própria.

---

## 5. Riscos principais

### 5.1 Subimportação

Se o modelo for excessivamente conservador, pode haver perda de conteúdo relevante que deveria ter sido representado no personagem.

### 5.2 Superimportação

Se a classificação for excessivamente permissiva, o sistema pode criar entidades artificiais que não correspondem ao conceito real de trait do domínio.

### 5.3 Ambiguidade persistente

Alguns nós do GCS serão sempre difíceis de classificar com confiança. Nesses casos, manter uma classificação “unknown” com preservação de raw data é preferível a uma interpretação errada.

### 5.4 Fragmentação da semântica

Se cada tipo especial de container for tratado de maneira independente e sem uma estratégia comum, o domínio pode ficar fragmentado e menos previsível.

---

## 6. Recomendações

### 6.1 Manter uma postura conservadora na classificação

A regra geral deve ser: se houver dúvida, preservar a informação e não inventar significado. A categoria “unknown” é uma ferramenta importante, não um defeito.

### 6.2 Separar claramente importação, estrutura e avaliação mecânica

A fonte externa deve ser preservada como dado rico. A interpretação mecânica deve acontecer em etapas posteriores, com regras explícitas e sem mistura de responsabilidades.

### 6.3 Tratar containers como estruturas, não como entidades automáticas

Agrupamentos semânticos e estruturais devem servir ao contexto da ficha, mas não devem ser convertidos automaticamente em traits finais apenas por estarem presentes na árvore.

### 6.4 Preservar metadados e identidade externa

Mesmo quando um nó não vira uma entidade final, ele deve manter sua identidade externa, contexto e informações brutas. Isso é essencial para roundtrip, rastreio e futura interoperabilidade com o GCS.

### 6.5 Definir regras explícitas para casos sensíveis

Casos como habilidades alternativas, poderes e containers aninhados merecem uma política explícita, pois são justamente onde o risco de interpretação indevida é maior.

### 6.6 Validar com amostras reais do GCS

A decisão conceitual fica mais robusta quando se baseia em arquivos reais de ficha, especialmente em cenários com estruturas complexas e pouco padronizadas.

---

## 7. Conclusão

A análise de trait containers mostra que o problema central não é apenas técnico, mas conceitual: o GCS mistura estrutura, semântica e entidade em uma mesma árvore. A abordagem mais sólida é tratar essa árvore como uma fonte rica e potencialmente ambígua, preservando a hierarquia e classificando cada nó com cautela.

Em termos de domínio, a recomendação principal é manter uma distinção clara entre:

- aquilo que é um trait jogável;
- aquilo que é um container estrutural;
- aquilo que é ainda ambíguo e deve ser preservado sem interpretação prematura.

Essa postura reduz erros de importação, preserva a fidelidade ao GCS e evita que o modelo canônico da ficha incorpore regras não comprovadas a partir da estrutura externa.
