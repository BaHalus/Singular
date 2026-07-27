# Revisão do domínio Skill

## Escopo

Este documento registra a revisão da pesquisa do domínio Skill, conduzida com base exclusiva no projeto GCS durante a etapa de Engenharia Reversa.

## Fatos confirmados

- O tipo principal de domínio é Skill, definido em model/gurps/skill.go.
- Techniques são modeladas como um subtipo especializado de Skill, com comportamento próprio.
- Skills têm dificuldade, especialização, pontos, defaults, notas, prereqs, armas e features.
- O cálculo de nível depende de:
  - atributo associado;
  - dificuldade;
  - defaults;
  - bônus de entidade;
  - encumbrância;
  - pontos investidos.
- Defaults podem ser resolvidos por nome, especialização e tipo de default.
- O domínio possui mecanismos para alternar defaults e evitar ciclos.

## Hipóteses e observações

- A modelagem do domínio é mais rica do que um simples registro de perícia, porque incorpora comportamento de cálculo e relacionamento entre perícias.
- O entendimento do domínio requer distinção entre Skill comum e Technique, pois a última possui regras próprias de cálculo e satisfação.
- A arquitetura do GCS separa claramente dados estruturais e cálculo, o que é relevante para a futura modelagem da SINGULAR.

## Revisão

- Rastreabilidade: preservada.
- Escopo: respeitado.
- Uso de fontes: GCS como fonte primária; gcs_master_library não foi necessário; SINGULAR não foi usado para descobrir o domínio.
- Resultado: domínio Skill revisado com sucesso para a fase atual da pesquisa.
