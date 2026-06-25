# GATE-LIB-CORE-1.0-ARCH — Fundação arquitetural da Library

**Status:** Aprovado para integração  
**Data:** 2026-06-24  
**ADR:** ADR-0044

## Objetivo

Certificar a fronteira da biblioteca modular antes da implementação do registro e das definições portáveis.

## Decisões certificadas

- a Library será uma federação de definições e adapters de domínio;
- a Library não será um agregado do `Character`;
- definições de biblioteca, payloads de domínio e entidades do personagem possuem identidades distintas;
- cada domínio proprietário mantém seus factories, validadores, serializadores e invariantes;
- catálogos especializados de Templates e Morfose não serão substituídos;
- importação reutiliza parsers e normalizadores existentes;
- inserção no personagem será explícita, planejada, revalidada e atômica;
- a aplicação coordena remapeamento de IDs, dependências, histórico e recibos;
- a UI pesquisa, apresenta e despacha intenções, sem calcular.

## Regressões proibidas

- armazenar uma cópia do `Character` como definição;
- interpretar payloads de todos os domínios no núcleo da Library;
- usar nome como identidade ou vínculo;
- inserir diretamente pela UI;
- duplicar catálogos de Templates ou Morfose;
- duplicar parsers e normalizadores existentes;
- aplicar definições durante importação;
- calcular regras GURPS na Library.

## Próxima etapa

Implementar a forma canônica e imutável de `LibraryDefinition`, sem registro, adapters ou inserção no `Character`.
