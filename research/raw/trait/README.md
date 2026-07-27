# Trait — Pesquisa arquitetural resumida

## Escopo

Este registro consolida a investigação do domínio Trait baseada no repositório GCS e nos artefatos já existentes na SINGULAR.

## Fontes principais

- código-fonte do GCS: model/gurps/trait.go
- código-fonte da SINGULAR: src/domain/character/Traits.js
- código-fonte da SINGULAR: src/domain/character/TraitPointValue.js
- código-fonte da SINGULAR: src/domain/character/TraitFinalCost.js
- código-fonte da SINGULAR: src/domain/character/TraitAlternativeGroups.js
- código-fonte da SINGULAR: src/domain/character/TraitCostAuthorityAnalysis.js
- documentação: Docs/01-arquitetura/Traits.md

## Conclusões principais

- Trait é um conceito central do GURPS e da SINGULAR.
- A representação canônica na SINGULAR é Character.traits.
- O domínio separa identidade, origem, valores de ponto, controles, modificadores e autoridade final.
- O cálculo soberano de pontos está separado da persistência e da UI.
- Grupos alternativos e autoridade final são tratados como uma camada de análise e execução distinta.
