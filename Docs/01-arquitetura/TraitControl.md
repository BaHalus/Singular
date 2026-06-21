# TraitControl — Autocontrole e frequência

**Código:** DOM-TRAIT-1.4  
**Camada:** Domain  
**Decisão:** ADR-0039

`TraitControl` é a autoridade para tabelas de autocontrole, frequência e ajustes operacionais associados.

## Princípios

```text
roll conhecido → multiplicador conhecido
roll desconhecido → unsupported
ajuste operacional → não altera pontos
```

As estruturas são recriadas e validadas durante a formação do agregado. `status`, `multiplier`, `penalty` e valores de ajuste não são aceitos como cálculos externos soberanos.

## Autocontrole

A forma canônica contém o teste, o multiplicador derivado, a penalidade operacional, o ajuste e o payload bruto preservado.

O valor `1` representa ausência de resistência. O valor `0` representa ausência de teste aplicável.

## Frequência

A forma canônica contém o teste, seu multiplicador derivado e o payload bruto.

O valor `18` representa frequência constante. O valor `0` representa ausência de teste aplicável.

## Fronteira GCS

São reconhecidos:

```text
cr
cr_adj
frequency
```

A serialização canônica não replica esses aliases. A importação preserva o payload bruto e fornece as declarações ao agregado; não realiza matemática.
