# Framework de Composição da SINGULAR

**Status:** Proposto  
**Camada:** Domain / Import / Composition  
**Escopo:** Estrutura de traits, containers e composição do Character

---

## Objetivo

Este documento define a arquitetura conceitual para tratar a composição de traits na SINGULAR quando a fonte externa apresenta uma estrutura hierárquica ambígua, como no formato GCS.

A proposta busca preservar a riqueza da fonte sem transformar automaticamente cada nó da árvore em uma entidade mecânica final do personagem.

---

## Princípios fundamentais

1. A importação preserva estrutura, contexto e intenção.
2. A composição do Character acontece somente após a classificação da estrutura de origem.
3. Containers não são entidades automáticas. Eles funcionam como nós de organização, semântica ou contexto.
4. A classificação deve ser conservadora. Quando houver dúvida, o sistema prefere preservar a informação em vez de inventar significado.
5. Regras de jogo não são inferidas no processo de importação. Elas permanecem sob responsabilidade do motor e dos módulos de regra.

---

## Problema central

A estrutura externa frequentemente mistura três papéis distintos em uma mesma árvore:

- nós que representam traits jogáveis de fato;
- nós que desempenham função estrutural ou semântica;
- nós que são ambíguos e precisam ser preservados sem interpretação prematura.

A SINGULAR deve evitar duas falhas comuns:

- sobreinterpretação da fonte, convertendo tudo em entidades artificiais;
- subinterpretação, perdendo contexto importante ao flattenar a árvore.

---

## Arquitetura proposta

A composição da ficha deve seguir uma arquitetura em camadas.

### 1. Camada de entrada

Recebe a representação externa da fonte, como um snapshot importado ou uma árvore de traits.

Nesta camada, o sistema preserva:

- hierarquia original;
- identidade externa;
- dados brutos;
- metadados de importação;
- ordem e contexto estrutural.

### 2. Camada de normalização intermediária

A árvore de origem é convertida em uma representação intermediária de nós.

Cada nó deve ser classificado conservadoramente como:

- trait
- container
- unknown

Essa classificação não define ainda a entidade final do Character. Ela apenas expressa o papel estrutural do nó dentro da árvore importada.

### 3. Camada de composição do domínio

Somente após a classificação o sistema converte os nós relevantes em agregados canônicos do Character.

Nesse estágio:

- traits jogáveis podem virar itens do personagem;
- containers podem permanecer como nós de composição ou metadados estruturais;
- relações especiais, como poderes, habilidades alternativas, raças, templates e meta-características, são tratadas como relações ou contextos, não como entidades automáticas sem evidência explícita.

### 4. Camada de avaliação mecânica

O motor e os módulos de regra recebem entidades já interpretadas e realizam a avaliação final.

Nesta camada não há necessidade de reconstruir a árvore original de forma imperativa. A interpretação já foi estabilizada no domínio.

---

## Modelo conceitual

### TraitNode

Um TraitNode é a unidade intermediária da árvore importada.

Ele representa um nó com o seguinte conjunto mínimo de responsabilidade:

- preservar a origem externa;
- registrar seu papel estrutural;
- manter referência ao pai e aos filhos;
- preservar dados brutos e metadados;
- permitir posterior composição.

### Container

Um container é um nó que serve a fins de organização, semântica ou contexto.

Ele pode existir para:

- agrupar traits relacionados;
- expressar uma relação semântica;
- representar um contexto de poder, alternativa, raça ou template;
- preservar intenção estrutural da fonte externa.

Containers não viram automaticamente uma entidade final do Character.

### Trait

Um trait é um nó que possui indício suficiente para virar uma entidade jogável no domínio.

A decisão de tratá-lo como trait depende de:

- semântica da fonte;
- classificação do nó;
- política de importação;
- contexto estrutural local e ancestral.

### Unknown

Quando a fonte é ambígua, o sistema deve preservar o nó como unknown.

Esse estado é preferível a uma interpretação indevida, porque permite:

- evitar falsos positivos;
- manter rastreabilidade;
- proteger roundtrip e interoperabilidade futura.

---

## Regras de composição

### Regra 1 — Preservar antes de interpretar

A primeira operação da importação é preservar a árvore e seus metadados. Não se deve converter tudo imediatamente em itens do Character.

### Regra 2 — Separar estrutura de entidade

Estrutura e entidade são conceitos diferentes. Um container pode carregar informação rica e mesmo ter filhos, mas isso não o torna automaticamente um item mecânico.

### Regra 3 — Classificação conservadora

Se houver dúvida, o sistema deve:

- manter o nó em um estado intermediário;
- preservar o raw data;
- evitar inferência indevida.

### Regra 4 — Composição sob autoridade do domínio

A composição final depende de entidades já classificadas e de relações explícitas. Ela não deve depender da árvore bruta diretamente.

### Regra 5 — Propriedade da origem

Toda entidade resultante deve manter vínculo com sua origem externa, mesmo quando a interpretação final for simplificada.

---

## Casos sensíveis

### Poderes

Poderes não devem ser tratados como um conjunto paralelo de traits sem contexto. O modelo deve preservar a estrutura do poder, mas a associação mecânica deve ocorrer em uma etapa posterior, com regras explícitas.

### Habilidades alternativas

Habilidades alternativas devem ser mantidas como relação estrutural quando a fonte não fornecer evidência suficiente para uma entidade canônica independente.

### Raças, templates e meta-características

Esses elementos podem aparecer como containers ricos e com hierarquia própria. Eles devem ser preservados como contexto estrutural e, quando apropriado, transformados em agregados específicos somente após uma classificação explícita.

### Nós de natureza mista

Alguns nós podem conter dados de trait e de container ao mesmo tempo. Nesses casos, a arquitetura deve priorizar a preservação do contexto e a classificação por evidência, não por convenção ad hoc.

---

## Integração com o pipeline da SINGULAR

A arquitetura proposta encaixa-se na divisão já adotada pela SINGULAR:

- o motor calcula;
- o schema declara;
- a aplicação orquestra;
- a UI apresenta e coleta intenção;
- a persistência armazena snapshots.

Nesse contexto, a composição de traits deve ocorrer como uma etapa intermediária entre importação e avaliação, sem misturar responsabilidades.

O fluxo recomendado é:

1. entrada de fonte externa;
2. preservação da árvore original;
3. normalização de nós;
4. classificação estrutural;
5. composição do Character;
6. persistência do snapshot resultante;
7. avaliação mecânica pelo motor.

---

## Critérios de aceitação

A arquitetura proposta é considerada adequada quando:

- nenhum container estrutural vira automaticamente uma entidade de Character sem classificação explícita;
- a hierarquia da origem é preservada ao longo do processo;
- dados brutos e metadados de importação permanecem acessíveis;
- nós ambíguos são tratados sem interpretação indevida;
- a composição final depende de entidades já interpretadas e não de uma árvore crua.

---

## Consequências esperadas

A adoção dessa arquitetura melhora:

- fidelidade à fonte externa;
- previsibilidade da importação;
- separação entre importação, composição e cálculo;
- capacidade de roundtrip e diagnóstico;
- extensibilidade para novos formatos e novas regras de composição.
