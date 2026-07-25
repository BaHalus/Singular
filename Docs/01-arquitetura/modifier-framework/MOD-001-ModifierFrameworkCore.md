# MOD-001 — Modifier Framework Core

## Status

EM CONSOLIDAÇÃO

## Objetivo

Definir o núcleo conceitual do Modifier Framework.

Este documento estabelece o que é um modificador, sua autoridade,
seu ciclo de resolução e suas responsabilidades.

## Definição

Um modificador é uma declaração mecânica associada a um elemento
do domínio que altera ou restringe seu comportamento, custo ou
resultado conforme uma regra conhecida.

Modificadores são dados declarativos.

Eles não são o resultado calculado.

## Autoridade

A autoridade declarativa permanece no proprietário do conceito.

Exemplos:

- Traits possuem `Trait.modifiers`.
- Equipamentos possuem seus próprios modificadores.
- Outros domínios podem declarar modificadores conforme seus contratos.

O Modifier Framework não substitui as autoridades dos domínios.

Ele define como declarações de modificadores são interpretadas.

## Princípios

### Fonte única de verdade

Não deve existir uma segunda coleção persistida contendo modificadores
normalizados como autoridade.

Projeções e avaliações são derivadas.

### Preservação

Modificadores desconhecidos ou não resolvidos devem ser preservados
como evidência.

Nenhuma regra deve ser inventada por aproximação textual.

### Separação

O framework separa:

- declaração;
- interpretação;
- cálculo;
- apresentação.

## Responsabilidades do MOD

O Modifier Framework é responsável por:

- reconhecer tipos de modificadores suportados;
- definir contratos de avaliação;
- aplicar regras conhecidas;
- produzir resultados explicáveis.

## Fora do escopo

O Modifier Framework não é responsável por:

- regras específicas de equipamentos;
- regras específicas de poderes;
- regras específicas de Morfose;
- interface do usuário;
- importação de formatos externos.

## Documentos relacionados

- MOD-002 — Modifier Evaluation
- MOD-003 — Modifier Application Order
- MOD-004 — Modifier Library Contract