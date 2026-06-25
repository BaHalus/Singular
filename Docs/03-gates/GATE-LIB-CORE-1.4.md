# GATE-LIB-CORE-1.4 — Fundação integrada da Library

**Status:** Fundação aprovada  
**Data:** 2026-06-24  
**ADR:** ADR-0044

## Objetivo

Certificar a fundação da biblioteca modular antes da implementação de planejamento e inserção no `Character`.

## Entregas certificadas

### LIB-CORE-1.0 — Arquitetura

- biblioteca federada por adapters de domínio;
- identidades de biblioteca, domínio e personagem separadas;
- catálogos especializados preservados;
- nenhuma autoridade mecânica ou contábil paralela.

### LIB-CORE-1.1 — Definição portátil

- envelope versionado e imutável;
- valores JSON-safe;
- payload opaco ao núcleo;
- dependências apenas declaradas;
- serialização destacada.

### LIB-CORE-1.2 — Registro

- coleção autoritativa única;
- registro e remoção idempotentes;
- conflitos de ID e identidade externa explícitos;
- consultas exatas por ID, domínio e tag;
- índices somente derivados.

### LIB-CORE-1.3 — Adapters

- domínio e versões suportadas explícitos;
- validação e serialização delegadas ao proprietário;
- instanciação somente com análise, plano e execução completos;
- nenhum adapter genérico de fallback.

### LIB-CORE-1.4 — Dependências

- ordem dependência-primeiro;
- ausências obrigatórias e opcionais diferenciadas;
- ciclos bloqueantes;
- IDs exatos;
- intervalos de versão preservados sem interpretação.

## Evidências

- PR #61 integrada com Tests #729 verde;
- PR #62 integrada com Tests #731 verde;
- PR #63 integrada com Tests #733 verde;
- PR #64 integrada com Tests #735 verde;
- PR #65 integrada com Tests #737 verde;
- nenhuma revisão ou thread bloqueante permaneceu aberta;
- nenhum código integrado altera o `Character`;
- nenhum parser, normalizador ou catálogo proprietário foi duplicado.

## Fronteiras preservadas

- a Library cataloga;
- o domínio valida e instancia;
- a aplicação orquestra;
- o motor calcula;
- a UI não calcula;
- Templates e Morfose mantêm seus catálogos soberanos;
- dependências e versões não são resolvidas por nome ou suposição.

## Regressões proibidas

- interpretar payloads no núcleo;
- persistir índices como segunda autoridade;
- usar nome para identidade ou vínculo;
- aplicar definição durante leitura ou importação;
- executar adapter parcial;
- inserir diretamente no `Character` sem plano e comando de aplicação;
- duplicar catálogos, parsers ou normalizadores existentes.

## Próxima etapa

LIB-CORE-1.5 deverá definir análise, plano efêmero, revalidação e recibo de instanciação. A integração com `ApplicationSession` permanece posterior e não deve ser antecipada dentro do planner.

## Resultado

A fundação da Library está aprovada. O domínio não está fechado: planejamento, App Core e importação/exportação modular continuam pendentes.
