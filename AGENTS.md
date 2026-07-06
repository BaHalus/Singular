# AGENTS.md — SINGULAR

## Objetivo

SINGULAR é uma ficha mobile-first para GURPS 4e.

A prioridade atual é concluir a Alpha utilizável descrita na issue #251 do repositório BaHalus/Singular.

## Fontes operacionais

Antes de trabalhar:

- leia a issue #251;
- leia o comentário com marcador SINGULAR_EXECUTION_CONTROL_V2;
- leia o comentário com marcador SINGULAR_ALPHA_STATE_V1;
- verifique a main, pull requests abertas, CI e review threads;
- não confie em números de PR, branches ou heads registrados em prompts antigos.

## Arquitetura obrigatória

- o motor calcula;
- o schema declara;
- a aplicação orquestra;
- a UI apresenta e coleta intenção;
- a persistência armazena snapshots, nunca objetos vivos;
- não criar domínio, sessão, executor, registry, normalizador, pipeline, persistência ou composition root paralelo;
- nenhuma regra derivada de GURPS deve ser calculada na UI.

## Fluxo de trabalho

- mantenha no máximo uma PR escritora aberta;
- continue a PR existente antes de criar outra;
- trabalhe somente na branch indicada pelo controle operacional;
- nunca use force push;
- não faça merge automaticamente;
- trabalhe por capacidade visível do usuário, não por microgates;
- não abra PR apenas de documentação, checklist ou teste redundante;
- sempre que possível, inclua implementação, regressão e prova de aceite na mesma PR;
- não altere o escopo das etapas A1–A8;
- não marque uma etapa como concluída por conta própria.

## Testes

- use Node.js 22;
- execute npm test;
- execute também os testes focais dos arquivos modificados;
- quando a mudança envolver UI mobile, montagem, persistência ou interação real, valide o smoke Playwright;
- não use mocks que inventem capacidades inexistentes;
- um teste deve falhar quando o comportamento real estiver quebrado;
- não considere documentação ou checklist como prova suficiente.

## Criação e Mesa

Preserve obrigatoriamente:

- modo Criação;
- modo Mesa;
- edição estrutural somente no modo adequado;
- transitórios de PV, PF e equipamentos;
- histórico;
- persistência;
- save/remount/load;
- exportação e importação;
- roundtrip;
- funcionamento em navegador real.

## Revisão de código

Procure especialmente por:

- cálculo de GURPS fora do motor;
- mutação direta do personagem na UI;
- mocks que aceitam comportamento inexistente;
- testes que não provam a ação descrita;
- perda silenciosa de dados;
- quebra da separação Criação/Mesa;
- listeners, bootstraps, sessões, executores ou pipelines duplicados;
- infraestrutura paralela;
- regressões de persistência e roundtrip;
- controles mobile inacessíveis;
- texto importante cortado ou truncado.

Relate apenas problemas acionáveis e introduzidos pela mudança analisada.

## Uso do Codex

- trabalhe somente na tarefa, branch e PR indicadas;
- não abra tarefa paralela para a mesma capacidade;
- não crie uma segunda PR;
- não redefina arquitetura ou escopo;
- não resolva review thread sem evidência;
- não faça merge;
- ao terminar, informe:
  - arquivos alterados;
  - testes executados;
  - resultados;
  - riscos;
  - bloqueios;
  - próxima ação exata.
