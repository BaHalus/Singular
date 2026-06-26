# GATE-SKILL-MECHANICS-1.0 — Fundação mecânica de Skills e Techniques

**Status:** Fechamento proposto para revisão  
**Data:** 2026-06-26  
**Escopo:** DOM-SKILL-1.3 a 1.9, APP-SKILL-1.0 e DOM-TECH-1.5

## Objetivo

Certificar a fundação mecânica local de Skills e Techniques antes da abertura da resolução global do Character e da projeção no Application Read Model.

Este gate não declara o domínio inteiro concluído. Ele certifica somente contratos, cálculos unitários, seleção e orquestração local já protegidos por testes.

## Autoridades certificadas

### Estrutura persistente

- `Character.skills` e `Character.techniques` permanecem as coleções canônicas;
- `Skills.js` e `Techniques.js` criam, validam e serializam estrutura;
- operações estruturais permanecem imutáveis;
- níveis calculados não são persistidos como segunda autoridade.

### Motor

O Skill Mechanics Engine é autoridade exclusiva para:

- resultados `resolved` e `blocked`;
- progressão treinada de Skills;
- avaliação unitária de defaults;
- seleção do melhor resultado mecânico;
- exigência de fonte treinada para defaults entre Skills;
- progressão inicial de Techniques;
- aplicação de penalidade padrão e teto relativo;
- diagnósticos mecânicos.

### Aplicação

`SkillResolutionOrchestrator` coordena uma Skill localmente sem copiar fórmulas.

A aplicação recebe entradas explícitas, chama o motor e produz relatório efêmero, portátil e imutável.

### Point Ledger

O Point Ledger continua sendo a única autoridade contábil dos pontos declarados.

O motor não cria, remove nem recontabiliza pontos.

### Importadores

Importadores preservam dados externos e identidades.

Valores importados são evidência para comparação, não resultado soberano.

### UI

A UI permanece fora deste gate e não calcula NH, defaults, limites ou seleção.

## Entregas certificadas

### Contratos

- `SkillMechanicsResult`;
- `SkillDefaultCandidate`;
- portabilidade JSON estrita;
- imutabilidade profunda;
- serialização destacada;
- diagnósticos portáteis.

### Skills

- progressão treinada para `E`, `A`, `H` e `VH`;
- patamares 1, 2, 4 e incrementos posteriores de 4 pontos;
- zero pontos sem nível treinado;
- defaults por atributo explícito;
- defaults por Skill canônica explícita;
- proibição de associação por nome;
- proibição de default a partir de Skill conhecida somente por default;
- seleção pelo maior nível;
- desempate treinado antes de default;
- desempate entre defaults pela ordem declarada;
- comparação não autoritativa com níveis importados.

### Techniques

- fonte por `skillId` explícito;
- Skill-base resolvida por treinamento;
- nível padrão por `Skill-base + defaultPenalty`;
- progressão Average;
- progressão Hard com primeira melhoria a 2 pontos;
- zero pontos no nível padrão;
- aplicação de `maximumRelativeLevel`;
- bloqueio de teto abaixo do default;
- comparação não autoritativa com níveis importados.

### Aplicação local

- coordenação de resultado treinado e defaults já canônicos;
- preservação de avaliações bloqueadas;
- seleção final delegada ao motor;
- validação sem dependência da ordem das propriedades JSON;
- relatório portátil, imutável e reconstruível.

## Evidências

- PR #80, merge `df4934d`, Tests #780 verde;
- PR #81, merge `1478170`, Tests #783 verde;
- PR #82, merge `b26028f`, Tests #785 verde;
- PR #83, merge `6702bd9`, Tests #787 verde;
- PR #84, merge `0189a3d`, Tests #789 verde;
- PR #85, merge `2055162`, Tests #794 verde após correção do P2;
- PR #86, merge `dd2128a`, Tests #796 verde;
- PR #88, merge `46413a`, Tests #799 verde.

## Revisões tratadas

### Portabilidade de arrays

O contrato passou a rejeitar arrays esparsos, propriedades extras, ciclos, instâncias não portáteis e valores não finitos.

### Comparação semântica do relatório

A validação do relatório local deixou de depender da ordem de inserção das propriedades.

### Valores não finitos

Entradas e evidências não finitas são bloqueadas ou convertidas em diagnósticos portáteis, sem atravessar silenciosamente o contrato JSON.

## Regressões proibidas

- persistir NH calculado em Skills ou Techniques;
- usar `importedLevel` como autoridade;
- calcular na UI ou na aplicação;
- resolver entidades por nome;
- permitir default a partir de resultado cuja base seja outro default;
- permitir Technique alimentada por Skill não treinada;
- interpretar diretamente payload opaco de `Skill.defaults` dentro do motor;
- duplicar contabilidade do Point Ledger;
- introduzir cache persistente de resultados sem ADR própria;
- reabrir Character, Traits, Equipment ou App Core como atalho mecânico.

## Limites deste gate

Não estão certificados:

- adapter que transforma todos os formatos externos de defaults em candidatos canônicos;
- resolução de IDs externos;
- níveis de atributos obtidos do Character;
- resolução global em lote;
- política completa de Skills compradas a partir de defaults melhores;
- modificadores de Traits, equipamentos, talentos, condições ou outras fontes;
- Techniques com defaults especiais, múltiplas bases, atributo ou defesa ativa;
- integração dos resultados ao Application Read Model;
- UI;
- fechamento final de DOM-SKILL ou DOM-TECH.

## Próxima etapa segura

Definir um plano portátil de resolução global do Character que:

1. receba Skills, Techniques, níveis de atributos e candidatos canônicos já resolvidos por identidade;
2. calcule primeiro resultados treinados;
3. avalie defaults somente a partir de atributos explícitos ou Skills treinadas;
4. resolva Techniques a partir de Skills-base treinadas;
5. produza relatório global sem alterar o Character;
6. mantenha transformação de payload externo em adapter separado;
7. somente depois alimente o Application Read Model.

## Resultado

A fundação mecânica local está pronta. O próximo risco arquitetural não é uma fórmula isolada, mas a composição global das dependências sem criar cache persistente, resolução por nome ou pipeline paralelo.
