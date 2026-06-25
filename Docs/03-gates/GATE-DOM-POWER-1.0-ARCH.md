# GATE-DOM-POWER-1.0-ARCH — Autoridade e fronteiras

**Status:** Aprovado para integração  
**Data:** 2026-06-24  
**ADR:** ADR-0043

## Objetivo

Certificar a autoridade persistente de `Powers` antes da implementação do agregado.

## Decisões certificadas

- `Character.powers` será um agregado persistente de agrupamento.
- Powers referencia Traits canônicos por ID interno.
- Habilidades, custos, níveis e modificadores aplicados permanecem em Traits.
- `powerModifier` é declaração estrutural e não altera custos.
- Powers não contribui diretamente ao Point Ledger.
- Associação por nome é proibida.
- Não haverá normalizador legado paralelo para o antigo array bruto.

## Regressões proibidas

- copiar Traits para dentro de Powers;
- calcular custos no agregado de Powers;
- aplicar implicitamente modificadores aos Traits;
- resolver referências por nome;
- criar catálogo paralelo na aplicação ou UI;
- reabrir Traits sem ADR próprio.

## Próxima etapa

Implementar a fundação estrutural do agregado em `Powers.js` e `Powers.test.js`.
