# MOD-000 — Modifier Framework Inventory

## Status

INICIADO

## Objetivo

Identificar e consolidar os documentos existentes que pertencem ao
Modifier Framework.

Este inventário não altera regras mecânicas. Ele apenas define a origem
documental e o futuro destino normativo dos conceitos relacionados a
modificadores.

## Escopo

O Modifier Framework contém:

- representação de modificadores;
- autoridade declarativa;
- avaliação mecânica;
- ordem de aplicação;
- modificadores por nível;
- modificadores desconhecidos;
- modificadores desabilitados;
- contratos de biblioteca.

## Documentos de origem

| Documento | Conteúdo | Destino MOD |
|---|---|---|
| ADR-ModifierFramework.md | definição geral do framework | MOD-001 |
| TraitModifierCost.md | avaliação de custo | MOD-002 |
| TraitModifierLibraryContract.md | contrato de biblioteca | MOD-004 |
| Traits.md | autoridade declarativa e integração | MOD-001/MOD-002 |
| ADR-0038-CalculoModificadoresTraits.md | cálculo soberano | MOD-002 |
| ADR-0039-AutocontroleFrequenciaEscolhasTraits.md | limite de responsabilidade | MOD-003 |

## Fora do escopo

Os documentos abaixo utilizam modificadores, mas não pertencem ao
Modifier Framework:

| Área | Documento |
|---|---|
| Equipamentos | EquipmentArchitecture |
| Poderes | AutoridadePowers |
| Morfose | Morfose |
| Skills | Skills |
| UI | App/UI |

Esses domínios continuam sendo autoridades de seus próprios conceitos.

## Regras de migração

- Nenhuma regra mecânica será modificada.
- Nenhuma decisão existente será apagada.
- Toda migração deve preservar rastreabilidade Git.
- Documentos antigos serão transformados em referências após consolidação.

## Validação

Antes de concluir qualquer etapa:

node tools/docs/validate.cjs