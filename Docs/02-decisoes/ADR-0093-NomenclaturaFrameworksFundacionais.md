# ADR-0093 — Nomenclatura de Marcos de Fundação e Frameworks Internos

## Status

ACEITO

## Contexto

A documentação da SINGULAR utiliza atualmente o prefixo MF em documentos
de natureza arquitetural.

O documento MF6_API_Publica_e_Governanca_Arquitetural.md representa um
marco arquitetural contendo decisões de API pública, contratos e governança.

Paralelamente, existe uma família de documentos relacionados ao Modifier
Framework, incluindo contratos, avaliação de custo, aplicação e biblioteca
de modificadores.

O uso do mesmo conceito MF para representar ambos gera ambiguidade
documental.

## Decisão

O prefixo MF será reservado para:

**Marco de Fundação**

Um MF representa uma etapa arquitetural consolidada da evolução da SINGULAR,
contendo objetivos, escopo, contratos e governança.

Exemplo:

- MF6 — API Pública e Governança Arquitetural


Frameworks internos não utilizarão o prefixo MF.

O Modifier Framework terá identificação própria:

**MOD — Modifier Framework**

Exemplo:

- MOD-001 — Modifier Framework Core

## Consequências

Documentos MF continuam representando marcos arquiteturais.

Documentos MOD representam especificações normativas de mecanismos internos.

O Modifier Framework será organizado separadamente sem alteração das
regras mecânicas existentes, apenas reorganizando sua autoridade documental.

## Migração

A migração ocorrerá em etapas:

1. Formalizar a nomenclatura.
2. Inventariar os documentos pertencentes ao Modifier Framework.
3. Criar a árvore documental MOD.
4. Atualizar referências.
5. Executar validação documental.

A validação obrigatória permanece:

node tools/docs/validate.cjs