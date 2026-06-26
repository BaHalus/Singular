# Gate — DOM-ATTACK-1.0

**Status:** Aprovado  
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

## Testes e evidências

A suíte integral canônica `npm test` passou na CI da PR. O workflow **Tests #895** concluiu com sucesso sobre a implementação e a documentação aceita.

A cobertura específica inclui:

- criação vazia e defaults;
- identidade, ordem e duplicidade;
- categorias, origens e referências;
- autoridade declarada;
- ausência de cópias de entidades e resultados calculados;
- portabilidade, densidade e ciclos;
- snapshot destacado;
- adição, edição, remoção, busca e reordenação imutáveis;
- erros para ID ausente, posição inválida e patch não suportado.

## Condições de aprovação

- [x] suíte integral `npm test` verde na PR;
- [x] branch baseada na `main` vigente após a PR #109;
- [x] nenhuma revisão bloqueante;
- [x] nenhuma thread aberta;
- [x] somente a PR #110 aberta na revalidação;
- [x] sete arquivos novos, sem sobreposição com SINGULAR MVP Julho.

A revisão automática solicitada não foi executada porque o serviço atingiu seu limite de uso. Isso não produziu comentário técnico, revisão bloqueante ou thread. O diff foi reavaliado contra as invariantes do gate e permaneceu sem bloqueio conhecido.

## Resultado

DOM-ATTACK-1.0 está aprovado como domínio declarativo isolado. Ele fornece identidade, ordem, referências, portabilidade, snapshots e operações mínimas sem antecipar mecânica de combate.

## Próxima etapa autorizável

Depois da integração deste gate, revalidar `main`, PRs e `Character.js`. Somente então abrir uma segunda PR mínima para substituir o array bruto por `createAttacks`, `validateAttacks` e `serializeAttacks`.
