# GATE-LIB-CORE-1.10 — Fechamento da fundação da Library

**Status:** Fechamento proposto para revisão  
**Data:** 2026-06-25  
**ADR:** ADR-0044, ADR-0042

## Objetivo

Certificar o fechamento da fundação transversal da Library após a entrega do merge incremental estrito de pacotes, sem antecipar adapters concretos de todos os domínios, persistência de infraestrutura ou UI.

## Entregas certificadas

### Definições e registro

- `LibraryDefinition` portátil, validada e imutável;
- IDs soberanos separados de identidades externas e de entidades do `Character`;
- `LibraryRegistry` como autoridade de identidade e conflitos;
- consultas por ID, domínio e tag sem índices persistidos em paralelo;
- registro equivalente idempotente e divergência bloqueante.

### Adapters e dependências

- contrato explícito de adapters proprietários;
- validação e serialização obrigatórias;
- capacidades de instanciação opcionais, porém indivisíveis;
- resolução explícita de dependências obrigatórias, opcionais e ciclos;
- ausência de interpretação genérica dos payloads.

### Planejamento e execução

- plano portátil e validado;
- ordenação por dependências entre ações;
- preflight completo antes de efeitos;
- orquestração de análise, planejamento e execução;
- bloqueios de análise ou planejamento preservados como diagnósticos.

### Integração com o App Core

- comando `library.instantiate`;
- snapshot da sessão atual disponível à análise;
- fronteira de aplicação injetada;
- `CommandExecutor` como única autoridade de commit, revisão e histórico;
- falhas e resultados inválidos sem mutação parcial;
- recibo de aplicação separado do resultado portátil da Library.

### Portabilidade modular

- envelope `singular-library-package` versão 1;
- exportação de registro validado;
- importação para novo registro canônico;
- metadados limitados a JSON portátil;
- parser externo e save de personagem mantidos fora do pacote.

### Merge incremental estrito

- composição aditiva entre pacote e registro existente;
- definições equivalentes tratadas como `no-op`;
- somente definições ausentes são adicionadas;
- conflitos de ID ou identidade externa abortam toda a operação;
- nenhuma sobrescrita, renomeação ou resolução automática;
- alvo canonicalizado em cópia destacada;
- objeto do chamador preservado também em `no-op` e falha;
- recibo imutável com IDs adicionados e inalterados.

## Evidências

- PR #61: arquitetura inicial e ADR-0044;
- PRs #62 a #66: definição, registro, adapters e dependências;
- PRs #67 a #69: plano, runner e orquestrador;
- PR #71: integração com o App Core;
- PR #73: pacote portátil;
- PR #75: merge incremental estrito;
- Tests #769 verde no head final `8cfed12`;
- P2 sobre congelamento de registro pertencente ao chamador corrigido antes da integração;
- thread de revisão resolvida;
- merge final da PR #75 em `3d0005c`.

## Invariantes preservadas

1. A Library cataloga; não é estado do personagem.
2. O domínio proprietário valida e instancia seu payload.
3. A aplicação orquestra e efetiva transições pela autoridade canônica.
4. O motor calcula.
5. A UI não calcula nem instancia diretamente.
6. Identidades externas, de biblioteca e do personagem permanecem distintas.
7. Associação por nome continua proibida.
8. Templates e Morfose mantêm catálogos soberanos.
9. Parsers, normalizadores, históricos e pipelines existentes não são duplicados.
10. Importar uma definição ou pacote não altera automaticamente o `Character`.

## Regressões proibidas

- interpretar payloads proprietários no núcleo da Library;
- criar um schema genérico substituto dos domínios;
- gravar no `Character` fora do App Core e das APIs soberanas;
- registrar handler, histórico ou executor paralelo;
- sobrescrever conflitos durante merge de pacote;
- congelar ou alterar objetos pertencentes ao chamador;
- misturar pacote de Library com save de personagem;
- acionar parser externo durante importação de pacote Singular;
- mover cálculos ou validações mecânicas para a UI.

## Limites do fechamento

O fechamento da fundação LIB-CORE não certifica:

- adapters concretos completos para cada domínio listado;
- importadores GCS ou outros parsers externos;
- assinatura, checksum, confiança ou distribuição remota de pacotes;
- persistência em navegador, arquivo ou nuvem;
- busca textual avançada, ranking ou indexação persistente;
- picker, biblioteca visual ou qualquer UI;
- políticas de substituição, atualização ou resolução assistida de conflitos.

Esses itens pertencem a frentes posteriores e devem reutilizar os contratos fechados sem criar autoridades paralelas. Qualquer alteração das invariantes exige ADR.

## Próximo passo

Retomar o roadmap geral a partir da `main` e identificar a próxima frente arquitetural ainda aberta. Implementações concretas da Library devem ser iniciadas somente quando exigidas por uma frente de domínio, infraestrutura ou UI aprovada.

## Resultado

A fundação LIB-CORE está completa e pronta para consumo por adapters concretos, infraestrutura e UI posteriores. O núcleo possui contratos suficientes para catalogar, transportar, compor e instanciar definições sem duplicar domínios, cálculos, parsers ou estado do personagem.
