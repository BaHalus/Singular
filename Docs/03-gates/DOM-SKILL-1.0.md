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

## Auditoria estrutural — Passo 1

### Entradas canônicas já reconhecidas

- `Character.skills` é a coleção canônica de perícias no personagem.
- `Character.techniques` é a coleção canônica de técnicas no personagem.
- `Skills.js` e `Techniques.js` são os normalizadores atuais observados para preservação de dados importados.

### Campos importados que devem permanecer preservados durante a auditoria

- Identificadores externos.
- Dados brutos ou metadados de importação.
- Defaults declarados.
- Features declaradas.
- Armas associadas quando já vierem da importação.
- Pré-requisitos e metadados auxiliares já existentes.

### Lacunas ainda não resolvidas

- Autoridade soberana de NH final.
- Resolução de defaults.
- Limites de técnicas.
- Integração com Point Ledger.
- Lista completa de operações que podem alterar perícias e técnicas.
- Cobertura de testes existente e lacunas de regressão.
- Documentos antigos que ainda descrevem perícias e técnicas como pendentes.

### Decisão explícita deste passo

Este passo apenas registra o inventário estrutural inicial. Nenhuma regra de GURPS, fórmula de NH, custo, default, limite de técnica ou vínculo automático foi introduzido.

## Auditoria estrutural — Passo 2

### Fronteiras iniciais do domínio

- Perícias e técnicas pertencem ao personagem como dados estruturais persistidos, não como resultado derivado de UI.
- Normalizadores podem aceitar, preservar e estabilizar payloads importados, mas não devem decidir NH final, custo final ou vínculo mecânico entre itens.
- Operações futuras do domínio devem escrever nas coleções canônicas existentes, sem criar coleção espelho, cache autoritativo ou lista paralela para cálculo.
- Integrações futuras com Point Ledger devem consumir um contrato explícito do domínio; este gate ainda não define esse contrato.

### Regras negativas registradas

- Não criar busca por nome como mecanismo de associação entre técnica e perícia-mãe.
- Não derivar dificuldade, atributo-base, pontos, defaults ou limites a partir de rótulos textuais.
- Não usar importador, schema ou UI como autoridade mecânica temporária enquanto o motor soberano ainda não existir.
- Não mover responsabilidade de Traits, equipamentos, combate, Poderes ou Magia para o DOM-SKILL como atalho de implementação.

### Próxima lacuna auditável

O próximo passo estrutural deve identificar, em arquivos e testes existentes, quais operações atuais conseguem inserir, alterar, normalizar ou preservar `skills` e `techniques`. Essa identificação ainda não deve alterar comportamento.

### Decisão explícita deste passo

Este passo apenas registra fronteiras arquiteturais e regras negativas para impedir expansão indevida do domínio. Nenhuma regra de GURPS, fórmula de NH, custo, default, limite de técnica ou integração com Point Ledger foi introduzida.

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