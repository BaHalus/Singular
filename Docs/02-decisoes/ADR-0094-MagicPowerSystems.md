# ADR-0094 — Contratos para poderes e sistemas mágicos

**Status:** Proposta para revisão  
**Data:** 2026-10-13  
**Escopo:** ARC-MAGIC-POWER-1.0  
**Documento de contrato:** [MagicPowerSystems.md](../01-arquitetura/MagicPowerSystems.md)  
**Base:** ADR-0043, ADR-0068, ADR-0069, ADR-0070, ADR-0071, ADR-0035 a ADR-0041 e ADR do Modifier Framework

## Contexto

A SINGULAR já possui agregados canônicos de Traits, Powers e Spells, além de motores de custo, grupos alternativos, Point Ledger e App Core. Esses componentes foram criados para preservar uma única autoridade para cada dado e cálculo.

A inclusão de GURPS Powers, GURPS Psionic Powers, Sorcery, Divine Favor, Power Investiture e Ritual Path Magic exige regras especializadas de construção e execução. Tratar todos como variantes de um único tipo de mágica duplicaria conceitos e apagaria diferenças de aquisição, custo, autorização e uso.

## Decisão proposta

1. Manter Character como Aggregate Root.
2. Manter Traits como autoridade de vantagens, modificadores e custos em pontos.
3. Manter Powers como agrupador/qualificador de Traits; sua declaração de modificador de poder não altera custo por si só.
4. Manter Spells e o motor de Skills como autoridades para conteúdo baseado em perícias, incluindo magia clerical conforme regras validadas.
5. Representar os seis sistemas como módulos especializados com schemas, validação de construção e contratos de execução próprios.
6. Compartilhar infraestrutura apenas quando a semântica for idêntica: identidade, versionamento, diagnósticos, motores de custo, recursos e App Core.
7. Separar aquisição permanente, preparação de uso, resolução de execução e estado transitório.
8. Reutilizar ApplicationSession, Command Executor, histórico, persistência e Point Ledger existentes; não criar autoridades paralelas.
9. Manter catálogo declarativo e versionado. Dados de catálogo não executam código arbitrário e texto livre não é interpretado como regra.
10. Exigir testes de contrato e validação documental antes da implementação mecânica especializada.

## Decisões específicas de representação

- Sorcery e Divine Favor utilizam vantagens/Traits para as aquisições baseadas em vantagens, sem transformar preces em perícias.
- Power Investiture permanece uma vantagem; as mágicas clericais permanecem baseadas em perícias e são autorizadas por uma lista declarada da divindade/tradição.
- RPM usa perícias/Caminhos e definições estruturadas de rituais; rituais improvisados durante a sessão não se tornam automaticamente aquisições permanentes.
- Psionic Powers especializa o framework geral de poderes e não duplica o motor de Traits.
- Custos permanentes, consumo de recursos e estado de execução permanecem conceitos distintos.

## Alternativas rejeitadas

### Um único schema genérico de mágica

Rejeitado porque vantagens, perícias, preces e rituais têm contratos diferentes de aquisição e execução.

### Um motor independente por suplemento

Rejeitado porque duplicaria cálculo de vantagens, aplicação de modificadores, histórico, persistência e tratamento de recursos.

### Tornar Powers a autoridade dos custos

Rejeitado pela ADR-0043: custos e modificadores aplicados pertencem a Traits.

### Armazenar resultados de execução no Character permanente

Rejeitado porque a execução é transitória e não deve alterar automaticamente os Pontos investidos.

## Consequências

- O M1 documenta contratos e testes de fronteira; não implementa mecânicas.
- O framework geral de poderes será implementado antes das especializações.
- Regras e custos concretos devem ser conferidos contra as fontes oficiais antes de entrar no catálogo.
- O status desta ADR permanece **proposta** até revisão e aprovação.

## Critérios de aprovação

- [ ] Contratos de construção, execução e estado de sessão aprovados.
- [ ] Responsabilidades de Traits, Powers, Spells, recursos e App Core confirmadas.
- [ ] Versionamento, diagnósticos e política para regras não suportadas definidos.
- [ ] Matriz de testes de contrato aprovada.
- [ ] node tools/docs/validate.cjs aprovado no branch proposto.
