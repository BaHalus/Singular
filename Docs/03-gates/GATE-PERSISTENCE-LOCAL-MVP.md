# GATE-PERSISTENCE-LOCAL-MVP — Persistência Local MVP

**Data:** 2026-06-26  
**Escopo:** `PERSISTENCE-LOCAL-MVP`

## Entrega certificada

A frente entrega a primeira persistência concreta de navegador da SINGULAR, ainda isolada da UI:

- `createBrowserLocalCharacterRepository`;
- `createBrowserLocalSessionRepository`;
- restauração da última sessão válida salva;
- listagem e remoção determinísticas;
- armazenamento versionado por namespace;
- inspeção diagnóstica de corrupção local;
- exportação/importação própria de personagem em JSON SINGULAR;
- testes de roundtrip, isolamento, remoção, corrupção e rejeição de entradas inválidas.

## Arquivos de código

- `src/infrastructure/persistence/browser/BrowserLocalPersistence.js`
- `src/infrastructure/persistence/browser/BrowserLocalPersistence.test.js`

## Arquivos documentais

- `Docs/02-decisoes/ADR-0059-PersistenciaLocalMVP.md`
- `Docs/03-gates/GATE-PERSISTENCE-LOCAL-MVP.md`

## Evidências esperadas

- `node --test`
- testes específicos de persistência local;
- validação das portas `CharacterRepository` e `SessionRepository`;
- roundtrip de `Character` e `ApplicationSession` por snapshots serializados;
- preservação de registro válido na presença de registro corrompido;
- exportação/importação própria `singular-character-export` versão 1.

## Fronteiras preservadas

Esta entrega não altera:

- `src/ui/mobile/*`;
- `Character.js`;
- `ApplicationSession`;
- `CommandExecutor`;
- `CommandRegistry`;
- `ApplicationReadModel`;
- portas de repositório;
- Skills, Techniques, Equipment, Pools, Combat, Magic ou Power;
- Library core;
- importadores externos.

## Regressões proibidas

- persistir objetos vivos;
- criar singleton global oculto;
- recalcular regra GURPS na persistência;
- apagar automaticamente registros válidos após encontrar corrupção;
- criar segundo `Character` autoritativo;
- criar segunda sessão autoritativa;
- acoplar a UI mobile à infraestrutura nesta PR;
- substituir as portas existentes por contratos paralelos.

## Próxima integração

Depois deste gate, a ligação com a Alpha deve ocorrer em PR separada e coordenada:

1. injetar os repositórios concretos no bootstrap da aplicação;
2. conectar ação Salvar ao `SessionRepository.save` e, quando apropriado, ao `CharacterRepository.save`;
3. conectar Abrir/Última sessão à leitura do repositório;
4. expor Exportar/Importar usando o formato próprio;
5. renderizar diagnósticos de corrupção sem apagar registros válidos.
