# Gate — APP-EQUIPMENT-1.0

**Status:** Em validação  
**Data:** 2026-06-26  
**Branch:** `feature/app-inventory-commands`  
**Base validada:** `main` em `b31a367113faf98bd0e403805eb55503cc0db560`

## Objetivo

Certificar comandos estruturais de Equipment pelo App Core, sem cálculo de totais e sem UI.

## Critérios

- [x] reutiliza EquipmentOperations;
- [x] usa IDs canônicos;
- [x] adiciona itens no topo ou em recipiente;
- [x] renomeia e altera quantidade/estado;
- [x] remove e move itens preservando hierarquia;
- [x] produz novo Character canônico;
- [x] não cria sessão, executor ou registro paralelo;
- [x] não calcula quantidade, peso, custo ou carga;
- [x] não toca UI, domínio ou persistência concreta;
- [ ] suíte integral verde;
- [ ] revisão e threads próprias limpas;
- [ ] merge serializado.

## Coordenação

A PR #121 altera somente `src/ui/mobile/*` e está com CI vermelha e threads próprias. Esta etapa permanece isolada em `src/application/equipment/*` e documentação.

## Próxima etapa

Após integração, iniciar APP-EQUIPMENT 1.1: projeção portátil de leitura consumindo o contrato MVP resolvido pelo motor.
