# ADR-0059 — Persistência Local MVP de navegador

**Status:** Proposto  
**Data:** 2026-06-26  
**Bloco:** PERSISTENCE-LOCAL-MVP

## Contexto

A Alpha mobile da SINGULAR precisa sobreviver ao fechamento do navegador sem antecipar backend, contas, sincronização em nuvem ou interface visual completa de gerenciamento.

O App Core já define `CharacterRepository` e `SessionRepository` com `load`, `save`, `remove` e `listIds`. Os adaptadores em memória armazenam snapshots serializados e reidratam objetos validados. A persistência concreta deve seguir a mesma autoridade: armazenar evidências portáteis, nunca objetos vivos nem regras paralelas.

## Decisão

Criar um adaptador mínimo de navegador em `src/infrastructure/persistence/browser/BrowserLocalPersistence.js`.

O adaptador:

- usa um storage injetável compatível com `localStorage`;
- mantém namespace explícito;
- armazena registros versionados `singular-local-persistence` versão 1;
- implementa repositórios concretos para `Character` e `ApplicationSession` usando as portas já existentes;
- serializa por `serializeCharacter` e `serializeApplicationSession`;
- reidrata por `createCharacter` e `createApplicationSession`;
- lista IDs por índices determinísticos;
- remove registros sem afetar outros namespaces;
- registra o último `ApplicationSession` salvo por ponteiro separado;
- ignora registros ausentes ou inválidos durante carregamento público;
- expõe inspeção diagnóstica portátil para detectar corrupção sem destruir estado válido;
- define exportação própria de personagem como `singular-character-export` versão 1.

## Fronteiras

Esta ADR não integra a persistência a botões, telas ou boot automático da UI.

Também não introduz:

- IndexedDB;
- service worker;
- nuvem;
- login;
- contas;
- criptografia avançada;
- anexos;
- migração de protótipos antigos;
- compatibilidade ampla com formatos externos.

A futura ligação com Salvar, Abrir, Exportar e Importar deve ocorrer em PR separada e coordenada com a frente mobile.

## Formato local

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

## Formato de exportação própria

A exportação de personagem possui:

```js
{
  format: "singular-character-export",
  version: 1,
  exportedAt,
  character,
}
```

`character` é o snapshot canônico retornado por `serializeCharacter`.

## Corrupção e recuperação

Carregamento por ID retorna `null` quando o registro está ausente ou inválido. A inspeção diagnóstica permite à aplicação/UI futura avisar o usuário sem apagar automaticamente outros registros válidos.

A escrita tenta preservar atomicidade mínima no escopo do `localStorage`: se a atualização do registro ou do índice falhar, o adapter restaura os valores anteriores dos dois pontos conhecidos.

## Alternativas rejeitadas

### IndexedDB já na Alpha

Rejeitado por acrescentar complexidade assíncrona, migração e superfície de falha desnecessária para o MVP. Pode ser introduzido depois preservando as portas.

### Salvar objetos vivos

Rejeitado por violar a autoridade do App Core e permitir mutações por referência.

### Integrar diretamente à UI nesta PR

Rejeitado para evitar colisão com a frente mobile e manter a entrega como infraestrutura isolada.

### Formato externo genérico

Rejeitado porque a Alpha precisa primeiro de roundtrip próprio e validado da SINGULAR.

## Invariantes

1. Repositórios concretos implementam as portas já existentes.
2. Persistência armazena snapshots serializados.
3. Carregamento sempre reidrata instâncias validadas.
4. Registros corrompidos não destroem registros válidos.
5. O adaptador não calcula regra GURPS.
6. O adaptador não cria segunda sessão autoritativa.
7. UI e App Core não são alterados por esta fatia.
8. O formato local é versionado desde a primeira entrega.
