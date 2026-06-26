# App Attacks

**Código:** APP-ATTACK-1.0  
**Status:** Aprovado  
**Camada:** Application  
**Dependências:** APP-CORE-1.0 e DOM-ATTACK-1.1

## Objetivo

APP-ATTACK conecta intenções estruturais de edição ao agregado canônico de ataques. A aplicação valida o envelope e o payload, delega a alteração a `AttacksOperations` e devolve ao `CommandExecutor` um novo `Character` ou um resultado `no-op`.

## Comandos

```text
attack.add
attack.update
attack.remove
attack.reorder
```

Payloads:

```js
{ attack }
{ attackId, patch }
{ attackId }
{ attackId, targetIndex }
```

Payloads com propriedades adicionais são rejeitados. Edição, remoção e reordenação usam exclusivamente identidade canônica por ID.

## Fluxo

```text
UI futura
→ CommandEnvelope
→ CommandRegistry
→ AttackCommandHandlers
→ AttacksOperations
→ Character
→ CommandExecutor
→ revisão, histórico e recibo
→ persistência, undo e redo
```

`createAttackCommandHandlerEntries()` produz entradas isoladas para o registro existente. Esta etapa não modifica um registro global nem cria segundo executor, sessão ou histórico.

## Operações

- `attack.add` acrescenta uma entrada canônica ao final da ordem declarada;
- `attack.update` aplica somente o patch aceito por `AttacksOperations` e preserva o ID;
- `attack.remove` remove a entrada identificada;
- `attack.reorder` move a entrada para um índice válido.

Atualização estruturalmente idêntica e reordenação para o índice atual produzem `no-op`, preservando revisão e histórico. A igualdade portátil independe da ordem de chaves em objetos JSON.

## Recibos

Resultados aplicados informam a operação, o ID canônico e os índices relevantes. Recibos não carregam cópias de Skill, Equipment, Trait, Spell ou Power.

## Autoridades

- `AttacksOperations` altera a coleção;
- `Character` permanece o Aggregate Root;
- `ApplicationSession` permanece a sessão autoritativa;
- `CommandExecutor` permanece a autoridade de revisão, atomicidade e histórico;
- a persistência continua armazenando snapshots da sessão;
- a UI futura apenas emitirá intenção e apresentará resultados.

## Ausência de mecânica

APP-ATTACK não calcula ou interpreta NH, dano, tipo de dano, reach, alcance, precisão, Aparar, recuo, cadência ou qualquer regra de combate. Valores declarados permanecem com autoridade `declared` definida pelo domínio.

## Atomicidade

Payload inválido, ID ausente, ID duplicado, patch não suportado, índice inválido ou entrada não portátil geram falha pelo executor e preservam a sessão anterior. Revisões obsoletas são rejeitadas antes do handler.

## Fronteiras

Esta etapa não altera UI, `CommandRegistry`, composition roots, `ApplicationReadModel`, persistência concreta, `Character.js`, Attacks, Equipment, Skills, Spells, Powers ou outros domínios.

## API

```js
ATTACK_COMMAND_TYPES
createAttackCommandHandlerEntries()
handleAddAttackCommand(context)
handleUpdateAttackCommand(context)
handleRemoveAttackCommand(context)
handleReorderAttackCommand(context)
```
