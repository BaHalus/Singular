# ADR-0059 — Persistência Local MVP de navegador

**Status:** Aceito  
**Data:** 2026-06-26  
**Bloco:** PERSISTENCE-LOCAL-MVP

## Contexto

A Alpha mobile da SINGULAR precisa sobreviver ao fechamento do navegador sem antecipar backend, contas, sincronização em nuvem ou uma interface completa de gerenciamento.

O App Core já define `CharacterRepository` e `SessionRepository`. A persistência concreta deve armazenar snapshots portáteis e reidratar entidades validadas, sem se tornar autoridade mecânica ou manter objetos vivos.

## Decisão

Criar `src/infrastructure/persistence/browser/BrowserLocalPersistence.js` com storage injetável compatível com `localStorage`.

O adaptador:

- mantém namespace e versão explícitos;
- implementa as portas existentes de `Character` e `ApplicationSession`;
- serializa e reidrata pelas APIs canônicas;
- lista e remove IDs por índices determinísticos;
- registra a última sessão salva em ponteiro separado;
- inspeciona corrupção sem apagar registros válidos;
- oferece exportação própria `singular-character-export` versão 1.

## Chaves locais

Registros, índices e ponteiros usam espaços de chave distintos:

```text
<namespace>:v1:character:record:<id codificado>
<namespace>:v1:character:index
<namespace>:v1:session:record:<id codificado>
<namespace>:v1:session:index
<namespace>:v1:last-session
```

O segmento `record` impede colisões entre uma entidade cujo ID seja `index` e a chave interna do índice.

## Registros

Cada registro salvo possui:

```js
{
  format: "singular-local-persistence",
  version: 1,
  kind,
  id,
  snapshot,
}
```

`kind` é `character` ou `session`.

O ponteiro da última sessão possui:

```js
{
  format: "singular-local-persistence",
  version: 1,
  kind: "last-session",
  id,
}
```

## Corrupção e recuperação

Carregamento por ID retorna `null` quando o registro está ausente ou inválido. A inspeção produz diagnósticos portáteis para registros, índices e ponteiros ilegíveis.

Um índice com JSON inválido, estrutura diferente de array ou IDs inválidos não é tratado silenciosamente como índice vazio durante escrita. `save` e `remove` falham antes de alterar registros, preservando o conteúdo corrompido para diagnóstico ou recuperação explícita.

A escrita restaura registro e índice anteriores quando uma operação de storage falha após o início da atualização.

## Exportação própria

```js
{
  format: "singular-character-export",
  version: 1,
  exportedAt,
  character,
}
```

`character` é o snapshot canônico de `serializeCharacter`.

## Fronteiras

Esta decisão não integra persistência a botões, telas ou bootstrap automático. Também não introduz IndexedDB, service worker, nuvem, login, criptografia avançada, migração de protótipos ou compatibilidade ampla com formatos externos.

A ligação com Salvar, Abrir, Exportar e Importar ocorrerá em PR separada e coordenada com a frente mobile.

## Invariantes

1. Os repositórios concretos implementam as portas existentes.
2. A persistência armazena snapshots serializados.
3. Carregamento reidrata instâncias validadas.
4. Registros corrompidos não destroem registros válidos.
5. Índices corrompidos são diagnosticados e não sobrescritos implicitamente.
6. IDs de entidade não colidem com chaves internas.
7. O adaptador não calcula regras GURPS.
8. O adaptador não cria segundo `Character` ou segunda sessão autoritativa.
9. UI e App Core não são alterados por esta fatia.
