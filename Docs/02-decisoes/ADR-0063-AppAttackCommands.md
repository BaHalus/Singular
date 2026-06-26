# ADR-0063 — Comandos de aplicação para Attacks

**Status:** Proposto  
**Data:** 2026-06-26  
**Decisão:** APP-ATTACK-1.0

## Contexto

DOM-ATTACK-1.0 oferece coleção canônica, validação, serialização e operações imutáveis. DOM-ATTACK-1.1 integrou essa coleção ao `Character`. O App Core já oferece `CommandEnvelope`, `CommandRegistry`, `CommandExecutor`, `ApplicationSession`, revisão, histórico, persistência, undo e redo.

A Alpha precisa editar ataques futuramente pela interface sem mutar o `Character`, duplicar o domínio ou mover regras de GURPS para a aplicação.

## Decisão

Criar handlers isolados em:

```text
src/application/attacks/AttackCommandHandlers.js
```

Tipos canônicos:

```text
attack.add
attack.update
attack.remove
attack.reorder
```

Os handlers serão compostos externamente com o `CommandRegistry` existente. Esta decisão não modifica o registro central nem qualquer composition root.

## Delegação

Cada handler valida somente contexto e forma do payload. A alteração é delegada a:

```text
addAttack
updateAttack
removeAttack
reorderAttack
```

Depois da operação, o handler serializa o `Character` atual, substitui somente `attacks` pelo snapshot canônico resultante e reidrata pelo `createCharacter` existente.

Não existe segundo modelo de personagem nem mutação direta da sessão.

## No-op

Atualização semanticamente idêntica e reordenação para o índice atual retornam `no-op`. O `CommandExecutor` preserva revisão, histórico, sessão e fila de redo.

## Identidade e referências

Edição, remoção e reordenação usam `attackId`. Nenhuma associação usa nome. Referências declaradas a Skill e origem continuam IDs opcionais e não são resolvidas ou copiadas pela aplicação.

## Autoridades

- Attacks declara os dados;
- AttacksOperations altera a coleção;
- Character é o Aggregate Root;
- ApplicationSession é a sessão autoritativa;
- CommandExecutor controla revisão, recibo, histórico e atomicidade;
- a UI futura somente emitirá comandos;
- a persistência armazena snapshots resultantes.

## Falhas

Erros de payload ou domínio propagam ao `CommandExecutor`, que produz `failed` e preserva a sessão original. Revisões obsoletas produzem `rejected` antes do handler.

## Consequências

- a UI mobile poderá emitir intenções estáveis sem chamar domínio diretamente;
- histórico, undo, redo e persistência continuam reutilizando snapshots canônicos;
- comandos não dependem de Equipment, Skills ou regras de combate;
- a composição com bootstrap e UI permanece para outra frente;
- a projeção de leitura será tratada separadamente em APP-ATTACK-1.1.

## Fora de escopo

- registrar handlers globalmente;
- alterar UI ou bootstrap;
- criar projeção de leitura;
- validar existência de Skill ou origem;
- gerar ataques automaticamente;
- calcular NH, dano, alcance, precisão, Aparar ou combate;
- alterar persistência concreta.
