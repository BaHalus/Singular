# Arquitetura de poderes e sistemas mágicos — contratos M1

**Código:** ARC-MAGIC-POWER-1.0  
**Status:** Proposta para revisão; sem implementação mecânica  
**Marco:** M1 — contratos canônicos  
**Base de código auditada:** `main` em `f4ccd36d2407920866154a7837f1f4c1be28e68f`

## 1. Objetivo

Definir os limites e contratos necessários para acrescentar à SINGULAR os sistemas de poderes de GURPS Powers, poderes psíquicos de GURPS Psionic Powers e os sistemas mágicos Feitiçaria (Sorcery), Favorecimento Divino (Divine Favor), Investidura de Poder (Power Investiture) e Ritual Path Magic (RPM).

Este documento especifica fronteiras e responsabilidades. Não implementa regras de suplementos, não declara custos mecânicos definitivos e não substitui a conferência das fontes oficiais.

Princípio obrigatório:

> O motor calcula; o schema declara; a aplicação orquestra; a UI não calcula.

## 2. Estado preexistente que deve ser preservado

A implementação parte dos contratos existentes:

- `Character` permanece o Aggregate Root.
- `Traits` é a autoridade canônica para vantagens, modificadores, níveis e custos em pontos.
- `Powers` é um agregado persistente de agrupamento e qualificação de Traits; não duplica Traits, não calcula custos e não contribui diretamente para o Point Ledger.
- `Spells` preserva mágicas aprendidas e metadados operacionais. Os campos operacionais textuais atuais não constituem, por si só, um motor de regras.
- `TraitFinalCost`, `TraitAlternativeGroups`, a autoridade final de custo e o Point Ledger mantêm suas responsabilidades atuais.
- `ConstructionEngine` e `PricingEngine` não devem ser substituídos por um calculador mágico paralelo.
- `ApplicationSession`, o Command Executor, o histórico e a persistência existentes continuam sendo as autoridades de sessão e de transições.
- Os comandos estruturais e as projeções existentes de Powers e Spells continuam sendo a base da integração de aplicação e UI.

Referências normativas atuais: ADR-0043, ADR-0068, ADR-0069, ADR-0070, ADR-0071, ADR-0035 a ADR-0041 e ADR do Modifier Framework.

## 3. Taxonomia: sistemas não são tipos de conteúdo

A arquitetura distingue três dimensões independentes:

1. **Sistema de regras:** seleciona as regras de aquisição, disponibilidade e execução.
2. **Tipo de conteúdo:** identifica o que foi adquirido ou será usado, por exemplo vantagem, perícia mágica, prece ou ritual.
3. **Registro de personagem ou sessão:** registra a aquisição permanente ou uma operação transitória.

Não usar um único objeto genérico para substituir Traits, Skills, Spells, Powers, preces e rituais. Um envelope comum pode identificar o módulo responsável, mas não apaga os schemas especializados.

### 3.1 Sistemas cobertos pelo escopo

| Sistema | Construção canônica | Responsabilidade específica |
|---|---|---|
| GURPS Powers | Vantagens/Traits e seus modificadores, agrupadas por Powers quando apropriado | Framework de poderes, modificadores de poder, talentos, condições e relações de capacidades |
| GURPS Psionic Powers | Construções baseadas em Traits, com dados de disciplina e talento declarados conforme as regras aplicáveis | Conteúdo e regras psíquicas especializadas sobre o framework geral |
| Sorcery | Mágicas construídas como vantagens/Traits | Sorcerous Empowerment, mágicas, custos e regras de execução da Feitiçaria |
| Divine Favor | Vantagem de Favorecimento e preces adquiridas como vantagens/Traits, conforme o suplemento | Aquisição de preces e resolução de petições, como operações distintas |
| Power Investiture | Vantagem de Investidura mais mágicas registradas como perícias em Spells/Skills conforme o contrato validado | Autorização divina, lista permitida e aprendizado por perícia |
| Ritual Path Magic | Perícias e Caminhos existentes, mais definições estruturadas de rituais | Composição, energia, acumulação e resolução ritualística |

A tabela define a natureza dos contratos, não uma declaração de que todo detalhe de cada suplemento já foi validado.

## 4. Contratos e autoridades

### 4.1 Definições de sistema

Uma definição de sistema é dado declarativo, versionado e validável, que identifica:

- `systemId` estável;
- versão do contrato/schema;
- versão ou referência do conjunto de regras;
- tipos de conteúdo suportados;
- validadores e estratégias de construção/execução disponibilizados pelo módulo;
- políticas de compatibilidade explicitamente suportadas.

Ela não contém lógica executável arbitrária nem permite que dados de biblioteca definam código. O motor resolve `systemId` por registro explícito de implementações conhecido pela aplicação.

### 4.2 Definições de conteúdo

Uma definição de conteúdo deve possuir identidade estável e identificar o sistema proprietário. Os campos mecânicos devem ser tipados e interpretáveis pelo módulo correspondente; texto livre permanece descritivo e nunca é interpretado silenciosamente como regra.

Conteúdo oficial, conteúdo de campanha e conteúdo importado devem poder ser distinguidos por origem. Conteúdo desconhecido importado deve ser preservado nos mecanismos de importação existentes, mas não pode ser executado como se fosse validado.

### 4.3 Aquisições permanentes

O personagem registra referências e escolhas canônicas, não cópias concorrentes de resultados calculados.

- Aquisições baseadas em vantagens referenciam Traits canônicos.
- Aquisições baseadas em perícias referenciam Skills/Spells canônicos e seus níveis/custos conforme os respectivos motores.
- Agrupamentos de poderes referenciam Traits por IDs internos exatos.
- Vínculos com divindades, disciplinas, listas autorizadas e tradições usam IDs estáveis, nunca nomes ou posições como identidade.
- Custos finais e contribuições em pontos são derivados pelas autoridades existentes, não armazenados como uma segunda fonte soberana.

### 4.4 Contrato de construção

Cada módulo de regras deve oferecer uma operação pura de análise de construção, conceitualmente:

```text
analyzeConstruction(character, systemDefinition, options)
    -> status + diagnostics + references to canonical calculations
```

O contrato é conceitual; a assinatura TypeScript/JavaScript final deve seguir as convenções do domínio após revisão.

Estados mínimos padronizados para interoperabilidade:

- `ready`: dados suficientes e compatíveis para análise;
- `incomplete`: falta uma escolha ou dado obrigatório;
- `conflict`: declarações incompatíveis ou referências conflitantes;
- `unsupported`: regra ou versão não suportada pelo motor;
- `invalid`: violação estrutural do contrato.

Diagnósticos devem identificar entidade, regra e origem do problema. Não corrigir silenciosamente escolhas ou custos.

O contrato de construção não executa poderes, não gasta recursos de sessão e não altera o Character.

### 4.5 Contrato de execução

Cada módulo executável deve oferecer uma operação de preparação e uma operação de resolução. A preparação valida a intenção e retorna parâmetros explícitos; a resolução consome apenas entradas validadas e dados de estado requeridos.

Contrato conceitual:

```text
prepareExecution(character, systemDefinition, intent, sessionState)
    -> ready | incomplete | rejected + diagnostics

resolveExecution(preparedExecution, sessionState, runtimeInputs)
    -> outcome + stateTransition + auditBreakdown
```

A operação não altera diretamente o personagem permanente nem persiste por conta própria. A camada de aplicação valida revisão, coordena a transição de sessão, registra histórico e emite recibo usando o App Core existente.

A resolução deve ser determinística para as mesmas entradas explícitas. Aleatoriedade de dados de jogo deve entrar por uma porta explícita do runtime e ser registrada no resultado, não ocultada dentro de uma função de domínio.

### 4.6 Estado da sessão e recursos

Estado transitório de execução pertence ao contexto de sessão existente, não ao custo permanente do personagem.

- O estado atual de PV/PF e demais recursos continua sob as autoridades de recursos já existentes.
- Energia de RPM, acumulação de ritual, petição em andamento e detalhes transitórios de execução são estados tipados do sistema, quando necessários.
- Não introduzir um segundo `ApplicationSession`, Point Ledger, histórico ou sistema de persistência.
- Não assumir que energia de RPM é PF, nem que todos os poderes consomem o mesmo recurso.
- Cada módulo declara o tipo de custo/consumo e delega a alteração de recursos ao contrato de recursos apropriado.
- Cancelar ou falhar uma execução deve obedecer às regras do sistema e produzir transição auditável; não se deve inferir reembolso ou consumo.

## 5. Contratos específicos por módulo

### 5.1 Framework geral de poderes — GURPS Powers

O framework opera sobre Traits e seus cálculos soberanos. Deve representar referências a fonte, modificador de poder, talento, capacidades membros, condições e relações de habilidades alternativas quando aplicáveis.

O agregado `Powers` atual permanece um agrupador estrutural. O seu campo `powerModifier` continua sendo uma declaração para auditoria/apresentação e não altera custos sozinho. Qualquer aplicação mecânica deve produzir modificadores canônicos nos Traits por uma operação explícita, validada e auditável, sem duplicação.

O framework não pode impor que todo poder possua talento, que toda capacidade pertença a apenas um agrupamento ou que todas as fontes compartilhem o mesmo modificador.

### 5.2 Poderes psíquicos — GURPS Psionic Powers

O módulo psíquico especializa o framework geral e declara disciplinas, talentos, conteúdo e restrições específicos do suplemento. Não deve duplicar o motor de Traits nem presumir que toda capacidade psíquica usa perícia ou que todas as disciplinas têm regras idênticas.

Regras opcionais ou variantes de campanha devem ser escolhas explícitas de configuração/versionamento, não comportamento implícito.

### 5.3 Sorcery

A mágica adquirida como vantagem permanece um Trait canônico. O módulo declara Sorcerous Empowerment, talento, custo da mágica, modificadores e relações de habilidades alternativas conforme o suplemento. A ativação usa a definição operacional validada da mágica.

O custo da vantagem, o custo/condições de uso e o estado atual de recursos são conceitos separados.

### 5.4 Divine Favor

Favorecimento e preces conhecidas são aquisições permanentes distintas de uma petição feita em sessão. A prece conhecida não garante atendimento. A execução deve registrar a intenção/pedido, as entradas de resolução e o resultado determinado pelas regras e pelo mestre quando houver decisão interpretativa.

Não tratar a prece como perícia mágica nem converter automaticamente uma resposta narrativa em alteração permanente de construção.

### 5.5 Power Investiture

Investidura é uma vantagem; mágicas clericais continuam sendo conteúdo baseado em perícia. A definição da divindade/tradição declara uma lista autorizada e suas condições. O módulo valida autorização e aprendizado, sem transformar a lista em uma cadeia tradicional de pré-requisitos e sem criar um segundo tipo de NH.

O motor de Skills/Spells permanece a autoridade de nível, defaults e custo de aprendizado, conforme a especificação validada de magia clerical.

### 5.6 Ritual Path Magic

RPM utiliza os contratos canônicos de perícias/Caminhos e uma definição estruturada para cada ritual salvo. O ritual improvisado é uma intenção de sessão e não precisa ser persistido como aquisição permanente. A composição de efeitos, os modificadores e o cálculo de energia devem produzir um breakdown auditável.

Não reutilizar automaticamente o schema de mágicas padrão nem confundir RPM com outras variantes de magia ritualística. Decisões interpretativas não formalizadas devem ser explícitas e controladas pelo mestre.

## 6. Registros de execução e auditabilidade

Um resultado de execução deve permitir reconstruir o que foi tentado e por que o resultado foi produzido. O registro pode incluir:

- identificador do sistema e versão de regras;
- referência à capacidade, prece, mágica ou ritual;
- intenção e parâmetros normalizados;
- alvos e entradas de runtime relevantes;
- testes, modificadores, dados aleatórios fornecidos e resultados;
- consumo e alterações de recursos efetivamente realizados;
- efeitos calculados e decisões pendentes de interpretação;
- diagnóstico, breakdown e referência à transição de sessão.

O registro de execução não é uma cópia do Character e não altera custos em pontos. A política de retenção do histórico de execução será definida na implementação e não deve substituir o histórico transacional do App Core.

## 7. Biblioteca e versionamento

Os catálogos serão dados declarativos versionados. Cada definição deve declarar origem e versão. Atualizar biblioteca não pode alterar silenciosamente uma ficha ou reinterpretar uma aquisição antiga.

Regras desconhecidas, schemas não suportados e campos mecânicos não reconhecidos devem gerar diagnóstico. Dados externos brutos permanecem preservados nos mecanismos de importação atuais.

Não incluir texto protegido integral de suplementos nos arquivos de biblioteca. A implementação deve usar dados próprios declarativos e referências bibliográficas legítimas, com validação mecânica contra as fontes oficiais durante o desenvolvimento.

## 8. Dependências e limites de implementação

Direção permitida:

```text
Catálogo/schema
    -> módulo de regras
        -> Traits / Skills / Spells / recursos canônicos
        -> motores de construção e execução
    -> App Core / comandos / transições
    -> projeções
    -> UI passiva
```

Direção proibida:

- UI calculando custos, NH, energia, efeitos ou disponibilidade;
- catálogo executando código arbitrário;
- Powers duplicando Traits ou custos;
- Spells tornando-se um agregado genérico de todas as habilidades;
- módulo mágico alterando o Character durante uma execução;
- motor especializado copiando o Construction/Pricing Engine;
- persistência recalculando ou corrigindo dados;
- recurso de sessão tratado como Pontos permanentes;
- inferência mecânica a partir de rótulos, nomes ou texto livre.

## 9. Testes de contrato requeridos antes de M2

### Contratos estruturais

1. Rejeitar IDs vazios/duplicados e referências canônicas inexistentes.
2. Demonstrar que Powers não duplica Traits nem contribui diretamente ao Point Ledger.
3. Demonstrar que o modificador declarado no agrupamento não muda custos sem aplicação canônica explícita.
4. Preservar snapshots e rejeitar versões não suportadas sem reinterpretá-las.
5. Verificar que campos textuais de Spells não são executados como regras.

### Construção

6. Comparar custo individual de Traits com a autoridade canônica, incluindo modificadores e relações de habilidades alternativas.
7. Garantir que a mesma declaração de modificador de poder não é aplicada duas vezes.
8. Garantir que mágicas clericais usam o motor de perícias e que preces/feitiçaria baseadas em vantagens usam o motor de Traits.
9. Distinguir incompletude, conflito, regra não suportada e invalidade estrutural.
10. Garantir que uma análise de construção não altera Character, Point Ledger ou estado de sessão.

### Execução

11. Uma capacidade adquirida e disponível pode ser preparada; uma não adquirida é rejeitada.
12. Uma prece conhecida não garante atendimento; a petição é uma execução distinta.
13. Uma mágica clerical não autorizada pela lista da divindade é rejeitada mesmo que exista no catálogo geral.
14. Um ritual RPM expõe a composição da energia e o estado de acumulação.
15. Falha, cancelamento e sucesso produzem transições compatíveis com as regras e com o contrato de recursos.
16. O mesmo conjunto de entradas explícitas produz o mesmo resultado; testes aleatórios são entradas registradas.
17. Undo/redo e persistência usam a infraestrutura existente e não mudam os Pontos permanentes por efeitos transitórios.

## 10. Critérios de saída de M1

M1 só poderá ser encerrado quando:

- este contrato for revisado e aprovado;
- cada contrato for mapeado para os módulos/arquivos existentes ou propostos, com justificativa;
- os estados de erro e versionamento estiverem definidos;
- os limites entre construção, execução e recursos estiverem claros;
- os testes de contrato forem especificados sem duplicar testes mecânicos dos módulos;
- a validação documental `node tools/docs/validate.cjs` passar;
- nenhuma implementação mecânica tiver sido antecipada sem referência e teste de regra.

M1 não autoriza iniciar Sorcery, Divine Favor, Power Investiture, RPM ou Psionic Powers antes de o framework e os contratos comuns serem aprovados. Após o encerramento, M2 implementa o framework geral de poderes, e os módulos especializados seguem a ordem registrada no plano de trabalho.
