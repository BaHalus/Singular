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
- Não introduzir novo vínculo entre perícia e técnica por nome quando um identificador canônico ou externo não estiver disponível.
- O fallback legado por nome já observado no importador de técnicas deve ser tratado como lacuna a reconciliar, não como contrato novo do DOM-SKILL.

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

- Não criar nova busca por nome como mecanismo de associação entre técnica e perícia-mãe.
- O comportamento legado de importação que retorna `status: "resolvedByName"` quando encontra uma perícia única por nome deve permanecer registrado como dívida/compatibilidade observada até ADR ou correção própria.
- Não derivar dificuldade, atributo-base, pontos, defaults ou limites a partir de rótulos textuais.
- Não usar importador, schema ou UI como autoridade mecânica temporária enquanto o motor soberano ainda não existir.
- Não mover responsabilidade de Traits, equipamentos, combate, Poderes ou Magia para o DOM-SKILL como atalho de implementação.

### Próxima lacuna auditável

O próximo passo estrutural deve identificar, em arquivos e testes existentes, quais operações atuais conseguem inserir, alterar, normalizar ou preservar `skills` e `techniques`. Essa identificação ainda não deve alterar comportamento.

### Decisão explícita deste passo

Este passo apenas registra fronteiras arquiteturais e regras negativas para impedir expansão indevida do domínio. Nenhuma regra de GURPS, fórmula de NH, custo, default, limite de técnica ou integração com Point Ledger foi introduzida.

## Auditoria estrutural — Passo 3

### Operações estruturais identificadas

- `createCharacter(input)` consome `input.skills` e `input.techniques` e delega a normalização para `createSkills` e `createTechniques`.
- `validateCharacter(character)` delega a validação das coleções para `validateSkills` e `validateTechniques`.
- `serializeCharacter(character)` delega a persistência serializável para `serializeSkills` e `serializeTechniques`.
- `createSkills(input)` e `createTechniques(input)` aceitam arrays e normalizam cada item individualmente.
- `createSkill(input)` e `createTechnique(input)` constroem os itens estruturais e preenchem campos ausentes com valores neutros.
- `validateSkill(skill)` e `validateTechnique(technique)` validam forma e tipos, mas não calculam NH, defaults, limites ou custo final.
- `serializeSkills(skills)` e `serializeTechniques(techniques)` preservam a estrutura serializável das coleções existentes.
- `src/domain/character/SkillsOperations.js` expõe operações isoladas atuais como `addSkill`, `removeSkill`, `renameSkill` e `setSkillPoints`.
- `src/domain/character/TechniquesOperations.js` expõe operações isoladas atuais análogas, incluindo edição estrutural de técnica e `setTechniqueSkillReference`.

### Escritas atualmente observadas

- A criação de personagem é uma entrada estrutural para inserir ou substituir coleções de perícias e técnicas.
- A serialização de personagem é a saída estrutural primária para persistir essas coleções.
- As operações isoladas de `SkillsOperations.js` e `TechniquesOperations.js` já são caminhos reais de mutação das coleções canônicas e devem ser cobertas por qualquer contrato futuro do DOM-SKILL.
- Essas operações atuais são estruturais; este gate não as transforma em autoridade de NH, default, limite ou custo.

### Limites explícitos desta auditoria

- A presença de `skillId`, `skillName` e `skillSpecialization` em técnicas não autoriza novo mecanismo de associação mecânica automática por nome.
- A presença de `importedLevel`, `importedRelativeLevel`, `defaultPenalty` e `maximumRelativeLevel` registra dados importados ou declarados, mas ainda não estabelece autoridade soberana de cálculo.
- A geração local de IDs em `Skills.js` e `Techniques.js` é comportamento estrutural legado observado; este passo não altera a política de IDs nem a integra ao runtime da aplicação.

### Próxima lacuna auditável

O próximo passo estrutural deve mapear testes existentes que protegem normalização, validação e serialização de `skills` e `techniques`, sem acrescentar regras mecânicas novas.

### Decisão explícita deste passo

Este passo apenas identifica operações estruturais já existentes. Nenhuma regra de GURPS, fórmula de NH, custo, default, limite de técnica, vínculo automático ou integração com Point Ledger foi introduzida.

## Auditoria estrutural — Passo 4

### Cobertura de testes a proteger antes de cálculo mecânico

- Os testes do DOM-SKILL devem continuar restritos a normalização, validação, serialização e preservação estrutural das coleções canônicas.
- A cobertura necessária para esta auditoria deve exercitar `skills` e `techniques` por meio das entradas estruturais e operações isoladas existentes, sem criar API paralela para edição isolada.
- Casos de regressão devem proteger preservação de identificadores externos, metadados importados, defaults declarados, features, armas, pré-requisitos e campos auxiliares.
- Falhas de forma ou tipo devem permanecer bloqueadas pela validação, mas sem transformar dados importados em decisão soberana de NH, default, limite ou custo.

### Lacunas de teste ainda abertas

- Confirmar quais arquivos de teste existentes já cobrem `createSkills`, `createTechniques`, `validateSkills`, `validateTechniques`, `serializeSkills` e `serializeTechniques`.
- Confirmar se a criação, validação e serialização de `Character` cobrem as coleções completas de perícias e técnicas.
- Confirmar a cobertura existente de `SkillsOperations.js`, `TechniquesOperations.js` e do fallback legado `resolvedByName` do importador de técnicas.
- Identificar lacunas de regressão para payloads importados incompletos, campos opcionais ausentes e metadados desconhecidos que ainda devem ser preservados.
- Evitar adicionar testes de NH final, resolução de defaults, limite de técnica ou integração com Point Ledger antes de ADR ou contrato mecânico próprio.

### Próxima lacuna auditável

O próximo passo estrutural deve reconciliar documentos antigos que ainda tratem perícias e técnicas como pendentes, incompletas ou fora das coleções canônicas atuais.

### Decisão explícita deste passo

Este passo apenas registra a fronteira da cobertura de testes esperada e as lacunas que ainda precisam ser confirmadas. Nenhum teste novo, regra de GURPS, fórmula de NH, custo, default, limite de técnica, vínculo automático ou integração com Point Ledger foi introduzido.

## Auditoria estrutural — Passo 5

### Reconciliação documental inicial

- Documentos antigos que descrevam perícias e técnicas como ausentes, pendentes ou ainda não canônicas devem ser tratados como obsoletos em relação ao estado observado desta frente.
- A reconciliação documental deve preferir correções localizadas e explícitas, sem reescrever decisões arquiteturais de frentes já fechadas.
- Qualquer documento que descreva cálculo de NH, defaults, limites de técnica ou custo como já resolvido deve ser marcado como prematuro até existir contrato mecânico soberano.
- Referências a UI calculando NH, novo vínculo por nome ou associação implícita entre técnica e perícia devem ser removidas ou rebaixadas para hipótese rejeitada.

### Critério mínimo para atualizar documentação antiga

- Manter `Character.skills` e `Character.techniques` como coleções canônicas.
- Registrar `Skills.js` e `Techniques.js` como normalizadores estruturais, não como motor mecânico soberano.
- Preservar a distinção entre dado importado/declarado e valor calculado.
- Não transformar documentação de auditoria em contrato funcional de GURPS.

### Próxima lacuna auditável

O próximo passo estrutural deve identificar os documentos concretos que precisam de reconciliação ou confirmar que a reconciliação pode permanecer limitada a este gate inicial.

### Decisão explícita deste passo

Este passo apenas define como documentação antiga será reconciliada. Nenhuma regra de GURPS, fórmula de NH, custo, default, limite de técnica, vínculo automático ou integração com Point Ledger foi introduzida.

## Auditoria estrutural — Passo 6

### Documentos concretos para reconciliação

- `Docs/03-gates/GATE-DOM-SKILL-1.0.md` já registra que a documentação antiga de Skills e Techniques está desatualizada e deve ser tratada como alvo de reconciliação.
- `Docs/01-arquitetura/Skills.md` é alvo documental concreto porque ainda contém checklist/estado que pode contradizer a existência atual de `Character.skills`, `Skills.js` e operações estruturais associadas.
- `Docs/01-arquitetura/Techniques.md` é alvo documental concreto porque ainda contém checklist/estado que pode contradizer a existência atual de `Character.techniques`, `Techniques.js`, operações estruturais associadas e importação preservada.
- Nenhum documento antigo foi alterado neste passo; a correção desses alvos deve ocorrer em rodada própria e limitada à reconciliação documental.
- Qualquer correção futura nesses documentos deve citar explicitamente que `Character.skills` e `Character.techniques` já são coleções canônicas observadas, sem declarar cálculo mecânico resolvido.

### Limite desta reconciliação

- Este passo não promove o gate a contrato funcional de GURPS.
- Este passo não corrige documentação fora do gate sem rodada própria para cada alvo documental concreto.
- Este passo não altera código, testes, schema, importadores, UI ou Point Ledger.

### Próxima lacuna auditável

O próximo passo estrutural deve confirmar a situação da branch em relação à `main` e decidir se a auditoria documental já pode ser fechada como PR de gate ou se ainda precisa de uma última revisão textual antes de sair de rascunho.

### Decisão explícita deste passo

Este passo apenas registra os alvos documentais concretos já conhecidos para reconciliação futura. Nenhuma regra de GURPS, fórmula de NH, custo, default, limite de técnica, novo vínculo automático ou integração com Point Ledger foi introduzida.

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
