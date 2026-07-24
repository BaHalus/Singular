# ADR-0065 — APP-LANGUAGE-CULTURE-EDIT 1.0

## Status
Aceita.

## Contexto
A Alpha mobile já lê Languages e Familiarities, mas ainda precisa de contratos de aplicação para edição estrutural em modo Criação. A UI não pode inferir custo de idioma, custo de familiaridade cultural ou qualquer derivado mecânico de GURPS. Valores declarados e importados devem ser preservados como dados portáteis.

APP-TRAIT-EDIT 1.0 e APP-SKILL-EDIT 1.0 estabeleceram o padrão de operações puras, handlers isolados e payloads JSON-portáteis. APP-LANGUAGE-CULTURE-EDIT 1.0 aplica o mesmo padrão a Languages e Familiarities sem tocar UI, bootstrap, persistência concreta ou registro global de comandos.

## Decisão
Criar operações canônicas mínimas para Languages:

- `addLanguage`;
- `updateLanguage`;
- `removeLanguage`;
- `reorderLanguage`;
- `findLanguageById`.

Criar operações equivalentes para Familiarities:

- `addFamiliarity`;
- `updateFamiliarity`;
- `removeFamiliarity`;
- `reorderFamiliarity`;
- `findFamiliarityById`.

Criar handlers de aplicação compatíveis com `CommandExecutor`:

- `language.add`;
- `language.update`;
- `language.remove`;
- `language.reorder`;
- `familiarity.add`;
- `familiarity.update`;
- `familiarity.remove`;
- `familiarity.reorder`.

Os comandos preservam os campos declarados pelo domínio:

- fala;
- escrita;
- natividade;
- referência;
- custo importado;
- modificadores;
- prerequisitos;
- notas;
- tags;
- metadados de importação;
- `raw` portátil.

## Restrições
A aplicação não calcula:

- custo de idioma;
- custo de familiaridade cultural;
- custo por fala/escrita;
- custo por natividade;
- descontos, inferências ou normalizações mecânicas.

Os handlers apenas validam payloads, aplicam operações puras, recriam o `Character` pelo contrato canônico e devolvem recibos e diagnósticos.

## Portabilidade
Payloads de adição e atualização precisam ser portáteis em JSON:

- sem funções;
- sem `Symbol`;
- sem `NaN` ou infinito;
- sem ciclos;
- sem objetos não planos fora de arrays e objetos literais.

## Consequências
A UI poderá consumir os comandos depois que o catálogo/composição da Alpha registrar os handlers. Até lá, os contratos permanecem isolados e testados.

APP-LANGUAGE-CULTURE-EDIT 1.0 não cria biblioteca de idiomas ou culturas, não importa GCS/GCA amplamente e não altera arquivos mobile.
