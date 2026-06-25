# GATE-DOM-POWER-1.4 — Fechamento estrutural de Powers

**Status:** Fechado  
**Data:** 2026-06-24  
**ADR:** ADR-0043

## Objetivo

Certificar que a SINGULAR possui um agregado persistente de Powers para agrupamento e qualificação de Traits, sem criar autoridade mecânica ou contábil paralela.

## Autoridades certificadas

### Powers

```text
src/domain/character/Powers.js
```

Autoridade para:

- identidade do agrupamento;
- fonte e metadados editoriais;
- modificador de poder declarado;
- referência ao Trait de talento;
- associação ordenada de Traits membros;
- metadados de importação e dados brutos.

### Character

```text
src/domain/character/Character.js
```

O `Character`:

- cria, valida e serializa Powers pelo agregado canônico;
- exige que `talentTraitId` e `memberTraitIds` apontem para Traits existentes;
- rejeita referências internas ausentes;
- não associa entidades por nome.

### Operações

```text
src/domain/character/PowersOperations.js
```

Transformações imutáveis editam somente o agrupamento. Nenhuma operação altera Traits implicitamente.

## Fronteiras preservadas

- Traits permanece autoridade de habilidades, níveis, modificadores e custos;
- Powers não contém cópias de Traits;
- Powers não possui custo próprio;
- Powers não cria contribuição direta ao Point Ledger;
- `powerModifier` é declaração estrutural, não aplicação mecânica;
- o motor calcula;
- o schema declara;
- a aplicação orquestra;
- a UI não calcula.

## Evidências

- ADR-0043 e gate arquitetural integrados pela PR #53;
- agregado e testes integrados pela PR #54;
- integração com `Character` e validação de referências integradas pela PR #55;
- operações estruturais e testes integrados pela PR #56;
- Tests #711, #713, #716 e #718 concluídos com sucesso;
- nenhuma revisão ou thread bloqueante permaneceu aberta nas integrações;
- nenhum pipeline paralelo foi introduzido.

## Regressões proibidas

- embutir cópias completas de Traits em Powers;
- somar custos diretamente a partir de Powers;
- aplicar modificadores aos Traits por efeito colateral;
- resolver talento ou membros por nome;
- manter um segundo catálogo de poderes na aplicação ou UI;
- reabrir Traits ou Point Ledger sem ADR próprio.

## Itens deliberadamente posteriores

- handlers atômicos no App Core;
- importador de Powers e resolução de IDs externos;
- diagnóstico de consistência do modificador de poder;
- projeções específicas para UI;
- cálculos mecânicos pertencentes ao motor.

## Resultado

DOM-POWER está fechado estruturalmente para manutenção. Evoluções funcionais ou mecânicas exigem etapas próprias e devem consumir as autoridades já estabelecidas.
