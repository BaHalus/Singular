# ADR-0047 — Referências explícitas para defaults de Skills

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-SKILL-1.6

## Contexto

`SkillsImporter` preserva `Skill.defaults` como dados opacos da fonte. `TechniquesImporter` ainda possui um fallback legado por nome, já registrado como dívida de compatibilidade. Esse fallback não pode se tornar contrato do motor.

## Decisão

O motor receberá defaults por meio de um contrato portátil chamado `SkillDefaultCandidate`.

O contrato contém:

- `schemaVersion`;
- `id` do candidato;
- `targetSkillId` da Skill-alvo;
- `sourceType`, limitado a `attribute` ou `skill`;
- `sourceId` para uma Skill-fonte;
- `attribute` para um atributo-fonte;
- `modifier`, inteiro e finito;
- `metadata`, objeto JSON portátil e mecanicamente neutro.

## Regras

- Fonte `attribute` exige `attribute` e proíbe `sourceId`.
- Fonte `skill` exige `sourceId` e proíbe `attribute`.
- Uma Skill não pode referenciar diretamente a si própria.
- Nomes e especializações nunca resolvem identidade.
- O contrato criado é imutável.

## Fronteiras

O importador ou adapter interpreta a fonte externa e resolve identidades externas. Quando a identidade não puder ser resolvida inequivocamente, ele produz diagnóstico e não cria candidato mecânico.

O Skill Mechanics Engine valida candidatos e, em etapas posteriores, avalia fontes, detecta referências ausentes ou ciclos e escolhe o melhor resultado.

O motor não interpreta diretamente `Skill.defaults`.

## Fora de escopo

- interpretar todas as variantes externas de default;
- resolver IDs externos;
- calcular o nível da fonte;
- escolher entre candidatos;
- comparar com o nível treinado;
- detectar ciclos indiretos;
- resolver Techniques ou modificadores externos.

## Alternativas rejeitadas

### Entregar `Skill.defaults` diretamente ao motor

Rejeitada porque o array é opaco e pode conter formatos externos diferentes.

### Resolver fonte por nome

Rejeitada porque nomes são editoriais e podem se repetir.

### Reutilizar `resolvedByName`

Rejeitada porque transformaria compatibilidade legada do importador em autoridade mecânica nova.

## Invariantes

1. Todo candidato pertence a uma Skill-alvo explícita.
2. A fonte é atributo explícito ou Skill por ID explícito.
3. Nomes nunca resolvem identidade.
4. Auto-referência direta é proibida.
5. O modificador é inteiro e finito.
6. Metadados são portáteis e mecanicamente neutros.
7. O motor não interpreta dados externos opacos.
8. A futura resolução produz `SkillMechanicsResult`.
