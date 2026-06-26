# GATE-LIB-CORE-1.10 — Merge incremental de pacote portátil

**Status:** Marco aprovado para revisão  
**Data:** 2026-06-25  
**ADR:** ADR-0044

## Objetivo

Certificar a composição explícita entre um `LibraryPackage` importado e um `LibraryRegistry` existente, preservando idempotência, atomicidade e autoridade do registro sem sobrescrever definições, interpretar payloads ou criar resolução automática de conflitos.

## Entregas certificadas

### Merge incremental estrito

- pacote portátil validado antes da composição;
- registro alvo canonicalizado antes do merge;
- definições novas são adicionadas ao final do registro;
- definições equivalentes já existentes são tratadas como `unchanged`;
- conflitos abortam a operação inteira.

### Atomicidade

- falha não expõe estado intermediário;
- conflito de ID soberano impede qualquer adição parcial;
- conflito de identidade externa impede qualquer adição parcial;
- o registro alvo recebido pelo chamador não é congelado ou mutado por merges `no-op`.

### Recibo

- resultado imutável contém o registro mesclado;
- recibo lista definições `added`;
- recibo lista definições `unchanged`;
- recibo preserva contagens antes e depois;
- pacote e registro permanecem distinguíveis.

## Evidências

- PR #75 integrada;
- Tests #769 verde no head final `8cfed12`;
- observação P2 sobre congelamento de registro do chamador corrigida;
- thread de revisão resolvida antes da integração;
- cobertura de merge aditivo, idempotência, conflito de ID, conflito de identidade externa, pacote inválido, recibo e preservação de registro serializado mutável do chamador.

## Fronteiras preservadas

- `LibraryRegistry` continua autoridade de identidade e conflito;
- `LibraryPackage` continua envelope portátil, não persistência;
- merge não interpreta `payload`;
- merge não chama adapters de domínio;
- merge não instancia no `Character`;
- merge não substitui importadores externos;
- motor continua calculando;
- UI continua sem cálculo.

## Regressões proibidas

- sobrescrever definição divergente automaticamente;
- renomear ou remapear IDs durante merge;
- aceitar conflito como aviso;
- adicionar parte do pacote após conflito;
- congelar objetos recebidos do chamador em caminho `no-op`;
- interpretar payloads proprietários para decidir equivalência;
- misturar merge de biblioteca com save de personagem;
- criar normalizador paralelo fora de `LibraryRegistry` e `LibraryDefinition`.

## Limites deste gate

Este gate não certifica:

- resolução assistida de conflitos;
- política de confiança, assinatura ou checksum;
- persistência concreta de pacotes;
- importador GCS ou parser externo;
- UI de comparação/merge;
- fechamento definitivo da frente LIB-CORE.

## Próxima etapa

Registrar o fechamento intermediário da portabilidade modular da Library ou avançar para persistência concreta somente após decisão arquitetural explícita sobre armazenamento local, arquivo incorporado ou ambos.

## Resultado

A Library possui exportação, importação e merge incremental estrito para pacotes Singular portáteis. A composição é atômica, idempotente e subordinada ao registro canônico, sem criar pipelines paralelos ou regras de domínio no núcleo da Library.
