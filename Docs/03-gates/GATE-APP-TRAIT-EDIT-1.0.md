# Gate — APP-TRAIT-EDIT-1.0

**Status:** Proposto  
**Data:** 2026-06-27  
**Frente:** SINGULAR Edição Estrutural Alpha  
**Branch:** `feature/app-trait-edit-1-0-main-aae467b`

## Objetivo

Certificar contratos mínimos de aplicação para adicionar, atualizar, remover e reordenar Traits na Alpha, sem implementar interface, sem registrar no bootstrap e sem recalcular regras de GURPS na aplicação.

## Arquivos

- `src/domain/character/TraitsOperations.js`
- `src/application/traits/TraitCommandHandlers.js`
- `src/application/traits/TraitCommandHandlers.test.js`
- `Docs/02-decisoes/ADR-0063-AppTraitEdit.md`
- `Docs/03-gates/GATE-APP-TRAIT-EDIT-1.0.md`

## Critérios arquiteturais

- [x] comandos isolados em `src/application/traits/*`;
- [x] operações mínimas e imutáveis no domínio;
- [x] nenhuma alteração em interface mobile;
- [x] nenhuma alteração em bootstrap, persistência concreta ou `CommandRegistry.js`;
- [x] nenhum segundo registry, executor ou sessão;
- [x] handlers compatíveis com `CommandExecutor`;
- [x] snapshots reconstruídos por `createCharacter`;
- [x] projeções legadas continuam derivadas de `traits`.

## Critérios do contrato

- [x] `trait.add` adiciona Trait validado;
- [x] `trait.update` aplica patch permitido por ID;
- [x] `trait.remove` remove por ID;
- [x] `trait.reorder` reordena por ID e índice válido;
- [x] no-op para update sem mudança;
- [x] no-op para reorder na mesma posição;
- [x] rejeição de patch não suportado;
- [x] preservação de `role`, inclusive customizado;
- [x] preservação de `source`;
- [x] preservação de `pointValue`;
- [x] preservação de modificadores e metadados portáteis;
- [x] ausência de cálculo de custo em pontos.

## Fora de escopo

- biblioteca de vantagens/desvantagens;
- catálogo oficial;
- importação GCS/GCA ampla;
- cálculo de modificadores, custo por nível ou custo final;
- interface mobile;
- registro no bootstrap;
- catálogo global de comandos da Alpha.

## Evidência esperada

A suíte canônica `npm test` deve passar na CI da PR. A cobertura específica exercita operações de domínio e execução por `CommandExecutor`, incluindo revisão, histórico, projeções derivadas, rejeição de payload inválido, no-op e preservação de campos não relacionados.

## Condição de aprovação

Este gate só pode ser marcado como aprovado após CI verde no head da PR, ausência de revisão bloqueante, ausência de threads abertas e revalidação de que nenhuma frente de interface alterou os mesmos arquivos ou redefiniu contratos de Traits.