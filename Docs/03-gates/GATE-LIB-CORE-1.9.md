# GATE-LIB-CORE-1.9 — Pacote portátil da Library

**Status:** Marco aprovado para revisão  
**Data:** 2026-06-25  
**ADR:** ADR-0044

## Objetivo

Certificar o contrato inicial de importação e exportação modular da Library por envelope portátil Singular, sem criar parser externo, persistência concreta, merge incremental, UI ou pipeline paralelo.

## Entregas certificadas

### Envelope de pacote

- kind canônico `singular-library-package`;
- `schemaVersion` suportado igual a `1`;
- `metadata` limitado a JSON portátil;
- `registry` validado pelo contrato canônico de `LibraryRegistry`.

### Exportação

- `exportLibraryPackage(registry, options)` exige `LibraryRegistry` válido;
- o pacote exportado é profundamente congelado;
- o registro é serializado antes de ser envelopado;
- metadados não podem carregar funções, objetos especiais, ciclos ou valores não JSON.

### Importação

- `importLibraryPackage(package)` valida o envelope recebido;
- a importação devolve um novo `LibraryRegistry` canônico;
- conflitos de ID e identidade externa continuam sendo autoridade do registro;
- payloads proprietários permanecem opacos ao núcleo da Library.

### Serialização

- `serializeLibraryPackage(package)` produz valor portátil;
- o resultado preserva kind, versão, metadados e registro serializado;
- nenhuma referência viva ou estado transitório é persistido.

## Evidências

- PR #73 integrada;
- Tests #763 verde no head final `37b6736`;
- cobertura de exportação, roundtrip, normalização, rejeição de versão incompatível, rejeição de metadado não portátil e preservação de conflitos do registro.

## Fronteiras preservadas

- a Library continua catalogando definições;
- `LibraryDefinition` continua validando envelopes de definição;
- `LibraryRegistry` continua sendo a autoridade de identidade e conflitos;
- adapters de domínio continuam proprietários;
- parsers externos continuam fora deste contrato;
- persistência concreta continua posterior;
- UI e picker continuam posteriores;
- o motor continua calculando e a UI continua sem cálculo.

## Regressões proibidas

- interpretar `payload` dentro de `LibraryPackage`;
- aceitar metadado não portátil;
- aceitar kind ou versão desconhecidos silenciosamente;
- importar definições sem passar por `LibraryRegistry`;
- criar normalizador paralelo de definições;
- acionar parser externo durante importação de pacote Singular;
- misturar pacote de biblioteca com save de personagem;
- criar persistência concreta antes de novo gate/ADR quando necessário.

## Limites deste gate

Este gate não certifica:

- importadores GCS ou parsers externos;
- merge incremental entre pacotes e registros existentes;
- assinatura, checksum ou política de confiança;
- armazenamento em navegador, arquivo ou nuvem;
- picker, UI ou fluxo visual;
- fechamento definitivo da frente LIB-CORE.

## Próxima etapa

Definir uma operação explícita e segura de composição/merge entre um pacote importado e um registro existente, preservando idempotência, conflitos e diagnósticos sem substituir o registro silenciosamente.

## Resultado

A Library possui um envelope portátil inicial para transportar registros Singular validados. A importação/exportação modular está iniciada sem duplicar parsers, normalizadores, pipelines ou autoridade de identidade.
