# GATE-LIB-CORE-1.7 — Instanciação orquestrada da Library

**Status:** Marco aprovado para revisão  
**Data:** 2026-06-25  
**ADR:** ADR-0044

## Objetivo

Certificar os contratos de plano, execução e orquestração da Library antes de qualquer integração com `ApplicationSession` ou mutação do `Character`.

## Entregas certificadas

### LIB-CORE-1.5 — Plano de instanciação

- plano efêmero, imutável e serializável;
- estados `ready`, `ready-with-warnings` e `blocked`;
- raízes e definições resolvidas explícitas;
- ações identificadas e ordenáveis por dependências;
- ciclos, referências ausentes e raízes não resolvidas bloqueados;
- planos bloqueados sem ações executáveis.

### LIB-CORE-1.6 — Runner

- consumo exclusivo de `LibraryInstantiationPlan` validado;
- preflight de todos os adapters antes do primeiro despacho;
- execução em ordem de dependências;
- resultados e contexto restritos a valores JSON portáveis;
- agregação de diagnósticos sem interpretar payloads de domínio;
- nenhuma mutação direta do `Character`.

### LIB-CORE-1.7 — Orquestrador

- composição explícita de validação, análise, planejamento e execução;
- validação de definições pelos adapters proprietários;
- interrupção segura diante de análise bloqueante;
- preflight anterior aos efeitos dos adapters;
- resultado de execução portátil;
- `Character` e UI preservados fora desta etapa.

## Evidências

- PR #67 integrada com Tests #743 verde;
- PR #68 integrada com Tests #747 verde;
- PR #69 integrada com Tests #750 verde;
- observações P2 da PR #67 atendidas no código final e threads regularizadas;
- observação P2 da PR #68 atendida antes da integração;
- observação P1 da PR #69 atendida antes da integração;
- nenhuma das três etapas criou parser, catálogo, normalizador ou pipeline mecânico paralelo.

## Fronteiras preservadas

- a Library declara e cataloga;
- o adapter proprietário valida, analisa, planeja e executa ações de domínio;
- o orquestrador coordena as fases;
- o runner não conhece o schema interno do `Character`;
- o motor continua sendo a autoridade de cálculo;
- a UI não calcula;
- Templates e Morfose mantêm seus catálogos soberanos.

## Limites deste gate

Este gate não certifica inserção no `Character`.

Até LIB-CORE-1.7:

- o fluxo termina em resultado portátil de execução;
- não existe comando de aplicação no `ApplicationSession`;
- não existe recibo de mutação do `Character`;
- não existe garantia transacional sobre mutações futuras do personagem;
- importação e exportação modular permanecem pendentes.

## Regressões proibidas

- executar plano não validado;
- iniciar ações antes do preflight de todos os adapters necessários;
- interpretar payloads de domínio no núcleo da Library;
- usar nomes como identidade ou vínculo;
- escrever diretamente no `Character` a partir da Library ou da UI;
- duplicar catálogos, parsers, normalizadores ou cálculos existentes;
- tratar resultado portátil do adapter como recibo de mutação do personagem.

## Próxima etapa

Integrar o orquestrador ao `ApplicationSession` por um comando explícito e pequeno, com revalidação contra o estado atual, aplicação atômica no `Character` e recibo próprio. Essa etapa deve reutilizar os contratos existentes e não mover regras GURPS para a aplicação.

## Resultado

A instanciação da Library está arquiteturalmente pronta até a fronteira da aplicação. O domínio permanece aberto para integração com `ApplicationSession`, recibo de mutação e importação/exportação modular.
