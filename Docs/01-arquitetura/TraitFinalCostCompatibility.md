# Compatibilidade — controles de Traits

| Entrada externa | Campo canônico |
|---|---|
| `cr` | `selfControl.roll` |
| `cr_adj` | `selfControl.adjustment.type` |
| `frequency` | `frequency.roll` |
| `round_down` | `roundCostDown` |
| `replacements` | `choices` |

A tabela descreve somente conversão de fronteira. A SINGULAR serializa a forma canônica e preserva o payload externo em `raw` quando disponível.

Campos neutros são omitidos das projeções históricas para não ampliar retrocompatibilidade sem necessidade arquitetural.
