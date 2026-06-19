Character

Código: DOM-CHAR-1.2
Status: Aprovado
Camada: Domain
Tipo: Aggregate Root

---

1. Objetivo

O Character é o Aggregate Root da SINGULAR.

Ele representa um personagem completo e constitui a unidade fundamental de persistência, carregamento, serialização e manipulação do domínio.

Todo dado pertencente a um personagem deve estar contido direta ou indiretamente em um Character.

---

2. Responsabilidades

O Character é responsável por:

- manter a identidade do personagem;
- manter a composição estrutural dos agregados;
- preservar dados permanentes;
- preservar estados transitórios;
- preservar pacotes importados;
- preservar o histórico de aplicação de templates;
- preservar conjuntos de formas e a forma ativa de cada conjunto;
- garantir invariantes estruturais mínimas;
- fornecer serialização consistente.

---

3. Não Responsabilidades

O Character não é responsável por:

- cálculos de GURPS;
- custos em pontos;
- dano;
- carga;
- movimento;
- NH;
- pré-requisitos;
- aplicação mecânica de modificadores e features;
- cálculo de transformação;
- renderização;
- persistência;
- importação;
- exportação;
- lógica de interface.

Essas responsabilidades pertencem a outros módulos.

---

4. Composição

Um Character é composto pelos seguintes agregados:

Character
│
├── Identity
├── Attributes
├── SecondaryCharacteristics
├── Pools
├── Advantages
├── Perks
├── Disadvantages
├── Quirks
├── Skills
├── Techniques
├── Spells
├── Powers
├── Equipment
├── Attacks
├── Languages
├── Familiarities
├── Templates
├── TemplateApplications
├── AlternateFormSets
├── State
└── Metadata

---

5. Estrutura Canônica

{
  identity,
  attributes,
  secondaryCharacteristics,
  pools,
  advantages,
  perks,
  disadvantages,
  quirks,
  skills,
  techniques,
  spells,
  powers,
  equipment,
  attacks,
  languages,
  familiarities,
  templates,
  templateApplications,
  alternateFormSets,
  state,
  metadata
}

---

6. Dados Permanentes

São considerados permanentes:

- identity;
- attributes;
- secondaryCharacteristics;
- advantages;
- perks;
- disadvantages;
- quirks;
- skills;
- techniques;
- spells;
- powers;
- equipment;
- attacks;
- languages;
- familiarities;
- templates;
- templateApplications;
- alternateFormSets;
- metadata.

Os componentes temporários produzidos pela forma ativa permanecem serializados enquanto estiverem ativos, com proveniência explícita.

---

7. Templates e aplicações

`templates` contém pacotes importados e ainda independentes.

`templateApplications` registra incorporações estruturais permanentes desses pacotes ao personagem.

Importar e incorporar são operações distintas.

Uma aplicação ativa contém o ID do pacote, os IDs dos componentes copiados e a data de aplicação.

Quando uma incorporação é removida, seu registro permanece com status `removed` para preservar o histórico.

O Character apenas armazena o resultado estrutural dessas operações. Ele não calcula os efeitos das features incorporadas.

---

8. Formas Alternativas

`alternateFormSets` contém conjuntos de formas mutuamente exclusivas.

Cada conjunto possui:

- forma-base;
- forma ativa;
- formas disponíveis;
- mecanismo de transformação;
- proveniência da ativação atual.

Somente uma forma fica ativa dentro de cada conjunto.

Conjuntos independentes podem coexistir. Assim, uma forma corporal pode coexistir com um revestimento ou outro mecanismo separado.

Templates permanentes, como Elfo e Vampiro, permanecem ativos durante a troca entre formas como Humanoide, Morcego ou Lobo.

Trocas de forma não criam novas entradas em `templateApplications`.

---

9. Dados Transitórios

São considerados transitórios:

- HP atual;
- FP atual;
- ER atual;
- condições;
- efeitos temporários;
- buffs;
- debuffs;
- estado de combate;
- recursos consumidos durante a sessão;
- estado operacional da transformação atual.

O estado operacional da transformação é registrado em `alternateFormSets`, enquanto efeitos mecânicos temporários continuam pertencendo ao State ou aos agregados operacionais apropriados.

---

10. GURPS First

A SINGULAR é construída inicialmente para GURPS 4e.

O Character deve utilizar conceitos compatíveis com GURPS sempre que isso produzir um modelo mais claro.

Abstrações genéricas somente devem ser introduzidas quando resolverem um problema real da arquitetura.

---

11. Composição sobre Herança

O domínio deverá privilegiar:

- composição;
- objetos simples;
- serialização direta;
- funções puras.

Hierarquias profundas de herança devem ser evitadas.

---

12. Separação de Responsabilidades

O Character armazena dados.

Ele não contém:

- Schema;
- Rules;
- Presentation.

Esses elementos devem permanecer desacoplados.

---

13. Invariantes Estruturais

O Character deve sempre garantir apenas invariantes estruturais mínimas.

Um Character válido deve possuir:

- Identity;
- Attributes;
- State;
- coleções estruturais válidas;
- histórico de aplicações de template válido;
- conjuntos de formas válidos.

Identity deve conter:

- id;
- name.

Attributes deve conter:

- ST;
- DX;
- IQ;
- HT.

State deve existir mesmo que esteja vazio.

Cada conjunto de formas deve possuir:

- pelo menos uma forma;
- uma forma-base existente;
- uma forma ativa existente;
- IDs de forma únicos dentro do conjunto.

Estas invariantes não executam regras de GURPS.

Validações como:

- HP derivado de ST;
- limites de Pools;
- pré-requisitos de perícias;
- consistência de carga;
- cálculos de atributos secundários;
- efeitos de templates;
- custo ou tempo de transformação;
- limites de Morfo;

não pertencem ao Character.

Essas validações pertencem ao módulo Rules.

---

14. Serialização

O Character deve ser serializável para JSON sem perda estrutural.

A serialização inclui:

- pacotes de template;
- histórico de aplicações;
- conjuntos de formas;
- forma ativa e ativação corrente.

Ela não deve conter:

- métodos;
- referências circulares;
- estado de UI;
- dependências externas.

---

15. Direção de Implementação

A implementação deve evoluir para:

- composição;
- imutabilidade quando viável;
- funções puras;
- separação clara entre dados e regras;
- operações reversíveis com proveniência explícita;
- suporte progressivo a Forma Alternativa e Morfo.

O Aggregate Root deve permanecer simples e previsível.

---

16. Checklist de Implementação

- [x] Criar Character.md
- [x] Criar Character.js
- [x] Criar Character.test.js
- [x] Validar invariantes estruturais
- [x] Validar serialização
- [x] Refatorar Character.js para arquitetura funcional
- [x] Integrar templates
- [x] Integrar histórico de aplicações de template
- [x] Integrar conjuntos de formas alternativas
- [x] Integrar estado ativo de cada conjunto
- [x] Aprovar Character v1.2
