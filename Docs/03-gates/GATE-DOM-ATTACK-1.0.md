# Gate — DOM-ATTACK-1.0

**Status:** Em validação  
**Data:** 2026-06-26  
**Frente:** SINGULAR — ATAQUES MVP  
**Branch:** `feature/attacks-mvp-domain`

## Objetivo

Certificar o contrato canônico isolado de ataques declarados para a Alpha, sem abrir combate, aplicação, UI ou integração com `Character.js`.

## Arquivos

- `src/domain/character/Attacks.js`
- `src/domain/character/Attacks.test.js`
- `src/domain/character/AttacksOperations.js`
- `src/domain/character/AttacksOperations.test.js`
- `Docs/01-arquitetura/Attacks.md`
- `Docs/02-decisoes/ADR-0062-AttacksMvpDomain.md`
- `Docs/03-gates/GATE-DOM-ATTACK-1.0.md`

## Critérios arquiteturais

- [x] domínio isolado em arquivos novos;
- [x] `Character.js` não alterado;
- [x] UI, App Core e persistência não alterados;
- [x] nenhum segundo Character ou inventário;
- [x] nenhuma cópia de Skill, Equipment, Trait, Spell ou Power;
- [x] referências cruzadas somente por ID;
- [x] nenhuma resolução por nome;
- [x] nenhuma dependência circular;
- [x] nenhum cálculo de NH, dano, alcance ou defesa;
- [x] nenhum ataque gerado automaticamente.

## Critérios do contrato

- [x] coleção canônica;
- [x] IDs únicos e não vazios;
- [x] ordem declarada determinística;
- [x] categorias mínimas `melee` e `ranged`;
- [x] `skillId` opcional;
- [x] origem estruturada opcional por ID;
- [x] dano e tipo declarados;
- [x] reach e alcance declarados;
- [x] autoridade explícita `declared`;
- [x] notas e metadados externos portáteis;
- [x] criação, validação e serialização;
- [x] snapshots profundos e destacados;
- [x] operações imutáveis de adicionar, editar, remover e reordenar;
- [x] busca por ID;
- [x] rejeição de arrays esparsos, ciclos e valores não portáteis.

## Auditoria de representações existentes

- [x] `Character.attacks` confirmado como array bruto na `main` de partida;
- [x] Skills preservam `weapons` externos;
- [x] Equipment preserva `weapons`, `raw`, `calc` e metadados externos;
- [x] Spells preservam `weapons` externos;
- [x] nenhuma dessas representações foi promovida a catálogo canônico;
- [x] importação externa completa permanece fora de escopo;
- [x] gramática mecânica de dano e alcance não foi inventada.

## Testes previstos

- criação vazia e defaults;
- identidade, ordem e duplicidade;
- categorias, origens e referências;
- autoridade declarada;
- ausência de cópias de entidades e resultados calculados;
- portabilidade, densidade e ciclos;
- snapshot destacado;
- adição, edição, remoção, busca e reordenação imutáveis;
- erros para ID ausente, posição inválida e patch não suportado.

## Condições pendentes para aprovação

- [ ] suíte integral `npm test` verde no head atual da PR;
- [ ] CI executada sobre a `main` vigente;
- [ ] nenhuma revisão bloqueante;
- [ ] nenhuma thread aberta;
- [ ] comparação final sem sobreposição com SINGULAR MVP Julho.

## Próxima etapa autorizável

Depois da integração deste gate, revalidar `main`, PRs e `Character.js`. Somente então abrir uma segunda PR mínima para substituir o array bruto por `createAttacks`, `validateAttacks` e `serializeAttacks`.
