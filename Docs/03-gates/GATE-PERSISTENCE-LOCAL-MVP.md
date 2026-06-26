# GATE-PERSISTENCE-LOCAL-MVP — Persistência Local MVP

**Status:** Aprovado  
**Data:** 2026-06-26  
**Escopo:** `PERSISTENCE-LOCAL-MVP`  
**Base validada:** `main` com APP-POOL 1.0

## Entrega certificada

A frente entrega persistência concreta de navegador ainda isolada da UI:

- `createBrowserLocalCharacterRepository`;
- `createBrowserLocalSessionRepository`;
- restauração da última sessão salva;
- listagem e remoção determinísticas;
- armazenamento versionado por namespace;
- registros separados de chaves internas de índice;
- inspeção diagnóstica de registros, índices e ponteiros corrompidos;
- exportação/importação própria `singular-character-export` versão 1.

## Arquivos

- `src/infrastructure/persistence/browser/BrowserLocalPersistence.js`
- `src/infrastructure/persistence/browser/BrowserLocalPersistence.test.js`
- `Docs/02-decisoes/ADR-0059-PersistenciaLocalMVP.md`
- `Docs/03-gates/GATE-PERSISTENCE-LOCAL-MVP.md`

## Critérios aprovados

- [x] Implementa as portas existentes de Character e Session.
- [x] Persiste snapshots, não objetos vivos.
- [x] Reidrata entidades validadas.
- [x] Isola namespaces.
- [x] Salva e restaura a última sessão.
- [x] Lista e remove registros deterministicamente.
- [x] ID `index` não colide com a chave interna do índice.
- [x] Índice inválido produz diagnóstico portátil.
- [x] Escrita não sobrescreve índice corrompido silenciosamente.
- [x] Registro válido permanece acessível na presença de irmão corrompido.
- [x] Exportação/importação própria possui formato versionado.
- [x] Não altera UI, App Core, Character ou domínios.
- [x] Branch atualizada sobre a `main` vigente.
- [x] Suíte integral verde.

## Evidência

GitHub Actions `Tests`, execução `28255756797`: job `test` concluído com sucesso no head documental e de código alinhado à `main`.

## Revisões endereçadas

1. Colisão entre ID de registro `index` e a chave interna do índice: corrigida com segmento `record` nas chaves de entidade e regressão específica.
2. Índice inválido tratado silenciosamente como vazio: corrigido com diagnóstico `invalid-storage-index`, leitura estrita em escrita e testes para JSON inválido, estrutura não-array e preservação do índice corrompido.

## Fronteiras preservadas

A entrega não altera `src/ui/mobile/*`, Character, ApplicationSession, CommandExecutor, CommandRegistry, ApplicationReadModel, histórico, portas ou domínios mecânicos. A ligação com Salvar/Abrir e bootstrap ocorrerá em PR separada.

## Resultado

**PERSISTENCE-LOCAL-MVP aprovado para integração sequencial**, condicionado à ausência de nova revisão bloqueante e à permanência da `main` sem conflito.
