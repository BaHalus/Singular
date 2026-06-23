# Gate DOM-SKILL-1.0 — auditoria estrutural inicial

## Estado da frente

Esta frente começa como auditoria estrutural do domínio de perícias e técnicas. O objetivo deste gate é registrar o contrato mínimo antes de qualquer cálculo mecânico de NH, resolução de defaults, limites de técnica ou integração com o Point Ledger.

## Escopo permitido nesta etapa

- Auditar `Character.skills` e `Character.techniques` como coleções canônicas já existentes.
- Auditar preservação de dados importados em `Skills.js` e `Techniques.js`.
- Mapear importadores, testes, operações e integrações atuais do domínio.
- Reconciliar documentação antiga que ainda descreva perícias e técnicas como pendentes.
- Definir lacunas arquiteturais antes de introduzir autoridade soberana de cálculo.

## Fora de escopo nesta etapa

- Cálculo de NH final.
- Resolução mecânica de defaults.
- Limites de técnica.
- Associação automática por nome.
- Integração efetiva com Point Ledger.
- UI calculando qualquer valor derivado.
- Alterações em equipamentos, combate, Poderes ou Magia.
- Reabertura de Traits, Templates, Morfose, Forma Alternativa, Point Ledger ou APP-CORE.

## Restrições arquiteturais

- O motor calcula.
- O schema declara.
- A UI apenas apresenta informações e coleta entrada do usuário.
- Não criar autoridade paralela para perícias ou técnicas.
- Não criar pipeline paralelo de importação, normalização ou cálculo.
- Não inferir vínculo entre perícia e técnica por nome quando um identificador canônico ou externo não estiver disponível.

## Critério para avançar além da auditoria

Só avançar para contrato mecânico quando este gate tiver identificado, no mínimo:

1. onde perícias e técnicas entram no personagem;
2. quais campos importados são preservados hoje;
3. quais operações existentes podem alterar o domínio;
4. quais testes já protegem o comportamento atual;
5. quais documentos precisam ser corrigidos para não contradizer a arquitetura atual;
6. qual será a autoridade soberana futura para NH, defaults, limites de técnica e custos.

## Decisão pendente

Nenhuma decisão funcional de GURPS foi tomada neste gate. Qualquer regra mecânica futura deve entrar em PR própria ou em continuação explícita deste DOM após a auditoria estrutural estar integrada.
