# Fontes mecânicas — TraitControl

A implementação de DOM-TRAIT-1.4 foi confrontada com o modelo GCS v5 consultado em 2026-06-21.

## Estruturas verificadas

- `model/gurps/trait.go`: ordem de composição de `AdjustedPoints`, campos `cr`, `cr_adj`, `frequency`, `round_down` e `replacements`;
- `model/gurps/enums/selfctrl/roll.go`: testes, multiplicadores e penalidades de autocontrole;
- `model/gurps/enums/selfctrl/adjustment.go`: consequências operacionais dos ajustes;
- `model/gurps/enums/frequency/frequency.go`: testes e multiplicadores de frequência;
- `model/fxp/int.go`: semântica de arredondamento positivo e negativo;
- `model/nameable/nameable.go`: substituições identificadas por chaves explícitas.

## Regra confirmada

```text
custo modificado
× multiplicador de autocontrole
× multiplicador de frequência
→ arredondamento final
```

A SINGULAR não executa código do GCS nem o transforma em autoridade persistente. A consulta serve para verificar semântica de interoperabilidade; as autoridades do domínio permanecem implementadas e testadas localmente.
