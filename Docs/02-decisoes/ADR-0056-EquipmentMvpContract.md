# ADR-0056 — Contrato de consumo Equipment MVP

## Estado

Aceito para a Alpha mobile.

## Contexto

A frente DOM-EQUIPMENT-MVP já fornece totais determinísticos de equipamentos pelo motor. A próxima integração com aplicação e UI precisa de um contrato portátil e explícito para consumir esses dados sem duplicar cálculo, sem criar um inventário paralelo e sem depender de arquivos visuais.

A frente mobile simultânea trabalha em `src/ui/mobile/*`. Esta decisão permanece restrita a `src/engine/equipment/*` e documentação específica de Equipamentos.

## Decisão

Adicionar `src/engine/equipment/EquipmentMvpContract.js` como contrato mínimo de consumo para a Alpha.

O contrato expõe:

- estados conhecidos: `equipped`, `carried`, `stored`, `dropped`, `ignored`;
- estados contados em inventário: `equipped`, `carried`, `stored`, `dropped`;
- estados que contam para carga: `equipped`, `carried`, `stored`;
- campos canônicos de entrada projetada;
- campos canônicos de totais;
- campos canônicos de diagnóstico;
- projeção portátil e congelada de um relatório de totais já resolvido pelo motor.

A projeção mantém a árvore de `children` como vínculo mínimo de conteúdo/recipiente. A aplicação e a UI devem consumir essa árvore e os totais resolvidos, não recalcular quantidade, peso, custo ou carga.

## Fora do escopo

Esta ADR não liga Equipamentos a `Character`, ApplicationSession, CommandExecutor, CommandRegistry ou UI. Essa ligação deve acontecer em PR coordenada posterior.

Também não inclui catálogo visual, importação GCS completa, comércio, crafting, manutenção, munição detalhada, ataques derivados, regras completas de carga GURPS ou persistência concreta.

## Consequências

A integração futura pode depender de um contrato pequeno e estável:

1. o domínio de Equipamentos valida e resolve;
2. `EquipmentTotalsResolver` produz o relatório autoritativo;
3. `EquipmentMvpContract` projeta o relatório para consumo portátil;
4. aplicação orquestra;
5. UI apenas apresenta e coleta entrada.

Se a aplicação precisar anexar esse relatório a `Character` ou sessão, isso deve ser tratado por PR separada e coordenada para evitar conflito com a frente mobile.
