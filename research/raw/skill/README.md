# Skill — Pesquisa arquitetural resumida

## Escopo

Este registro consolida a investigação do domínio Skill com base exclusiva no projeto GCS durante a etapa de engenharia reversa.

## Fontes primárias

- model/gurps/skill.go
- model/gurps/skill_default.go
- model/gurps/attribute_difficulty.go
- model/gurps/level.go
- model/gurps/entity.go

## Conclusões principais

- Skill é um domínio estrutural do GCS, representando perícias e também técnicas.
- A semântica de Skill cobre: identidade, dificuldade, pontos, defaults, especializações, nível calculado e técnicas.
- O cálculo de nível é dependente de atributos, modificadores de dificuldade, defaults e encumbrância.
- Techniques são modeladas como um subtipo de Skill, com default próprio e regra de satisfação.
- O domínio preserva relações entre skills, incluindo defaults resolúveis, alternância de defaults e ciclos de dependência.
