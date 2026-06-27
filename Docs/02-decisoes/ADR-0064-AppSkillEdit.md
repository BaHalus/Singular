# ADR-0064 — APP-SKILL-EDIT 1.0

## Status
Aceita.

## Contexto
A Alpha mobile já lê Skills e Techniques, mas ainda precisa de contratos de aplicação para edição estrutural em modo Criação. A UI não pode calcular NH, NH relativo, defaults, progressão de pontos ou qualquer resultado mecânico de GURPS. Esses resultados pertencem ao motor e às projeções canônicas.

APP-TRAIT-EDIT 1.0 já estabeleceu o padrão de handlers isolados, operações puras de domínio e payloads portáteis. APP-SKILL-EDIT 1.0 aplica o mesmo padrão a Skills e Techniques sem tocar UI, bootstrap, persistência concreta ou catálogo global de comandos.

## Decisão
Criar operações canônicas mínimas para Skills e Techniques:

- `addSkill`, `updateSkill`, `removeSkill`, `reorderSkill`, `findSkillById`;
- `addTechnique`, `updateTechnique`, `removeTechnique`, `reorderTechnique`, `findTechniqueById`.

Criar handlers de aplicação compatíveis com `CommandExecutor`:

- `skill.add`;
- `skill.update`;
- `skill.remove`;
- `skill.reorder`;
- `technique.add`;
- `technique.update`;
- `technique.remove`;
- `technique.reorder`.

Os comandos preservam os campos já declarados pelo domínio:

- dificuldade;
- atributo;
- pontos;
- especialização;
- nível técnico;
- defaults;
- referências externas;
- `importedLevel`;
- `importedRelativeLevel`;
- `defaultPenalty` e `maximumRelativeLevel` em Techniques;
- features, weapons, prereqs, tags, notas, `importMeta` e `raw`.

## Restrições
A aplicação não calcula:

- NH;
- NH relativo;
- defaults;
- progressão de pontos;
- custo derivado;
- máximo de Technique;
- efeito mecânico de armas, features ou prerequisitos.

Os handlers apenas validam payloads, aplicam operações puras, recriam o `Character` pelo contrato canônico e devolvem recibos e diagnósticos.

## Portabilidade
Payloads de adição e atualização precisam ser portáteis em JSON:

- sem funções;
- sem `Symbol`;
- sem `NaN` ou infinito;
- sem ciclos;
- sem objetos não planos fora de arrays e objetos literais.

Essa regra evita aceitar em memória dados que depois quebrariam salvamento, exportação ou roundtrip JSON.

## Consequências
A UI poderá consumir comandos de edição de Skills e Techniques depois que a composição/catálogo da Alpha registrar esses handlers. Até lá, os contratos ficam isolados e testados.

A serialização continua sob autoridade de `Character`, `Skills` e `Techniques`. APP-SKILL-EDIT 1.0 não cria biblioteca de perícias, não importa GCS/GCA amplamente e não altera arquivos mobile.
