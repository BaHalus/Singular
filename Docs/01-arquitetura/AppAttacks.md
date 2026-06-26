# App Attacks

**Código:** APP-ATTACK-1.1  
**Status:** Aprovado  
**Camada:** Application  
**Dependências:** APP-CORE-1.0, DOM-ATTACK-1.1 e APP-ATTACK-1.0

## Objetivo

APP-ATTACK conecta intenções estruturais de edição ao agregado canônico de ataques e oferece uma projeção portátil de leitura. A aplicação não calcula regras de combate: delega alterações a `AttacksOperations` e projeta somente o snapshot declarado e validado pelo domínio.

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

## Fluxo de escrita

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

`createAttackCommandHandlerEntries()` produz entradas isoladas para o registro existente. Não existe segundo executor, sessão ou histórico.

## Operações

- `attack.add` acrescenta uma entrada canônica ao final da ordem declarada;
- `attack.update` aplica somente o patch aceito por `AttacksOperations` e preserva o ID;
- `attack.remove` remove a entrada identificada;
- `attack.reorder` move a entrada para um índice válido.

Atualização estruturalmente idêntica e reordenação para o índice atual produzem `no-op`, preservando revisão e histórico. A igualdade portátil independe da ordem de chaves em objetos JSON.

## Projeção de leitura

`createAttackReadProjection(character)` produz:

```js
{
  schemaVersion: 1,
  characterId,
  attacks
}
```

`attacks` preserva a ordem canônica e todos os campos serializados pelo domínio:

- identidade e IDs externos;
- nome e categoria;
- referência opcional a Skill por ID;
- origem declarada por tipo e ID;
- dano declarado, tipo e autoridade `declared`;
- reach e range textuais;
- notas;
- `importMeta` e `raw` portáteis.

A projeção é validada, profundamente congelada e serializável para um snapshot destacado. Ela não resolve referências, não copia entidades de outros agregados e não adiciona NH, dano calculado ou qualquer campo mecânico.

## Autoridades

- `Attacks` declara e valida os dados;
- `AttacksOperations` altera a coleção;
- `Character` permanece o Aggregate Root;
- `ApplicationSession` permanece a sessão autoritativa;
- `CommandExecutor` permanece a autoridade de revisão, atomicidade e histórico;
- `AttackReadProjection` é somente uma fronteira portátil de leitura;
- a UI futura apenas emitirá intenção e apresentará projeções.

## Ausência de mecânica

APP-ATTACK não calcula ou interpreta NH, dano, tipo de dano, reach, alcance, precisão, Aparar, recuo, cadência ou qualquer regra de combate. Valores declarados permanecem com autoridade `declared` definida pelo domínio.

## Atomicidade e portabilidade

Payload inválido, ID ausente, ID duplicado, patch não suportado, índice inválido ou entrada não portátil geram falha pelo executor e preservam a sessão anterior. Revisões obsoletas são rejeitadas antes do handler.

A projeção rejeita schema incorreto, propriedades extras, IDs duplicados, arrays esparsos, autoridade diferente de `declared`, ciclos e valores não finitos. Valores finitos, inclusive `-0`, são preservados sem roundtrip por JSON textual.

## Fronteiras

APP-ATTACK 1.1 não altera UI, `CommandRegistry`, composition roots, `ApplicationReadModel`, persistência concreta, `Character.js`, Attacks, Equipment, Skills, Spells, Powers ou outros domínios.

## API

```js
ATTACK_COMMAND_TYPES
createAttackCommandHandlerEntries()
handleAddAttackCommand(context)
handleUpdateAttackCommand(context)
handleRemoveAttackCommand(context)
handleReorderAttackCommand(context)

createAttackReadProjection(character)
validateAttackReadProjection(projection)
serializeAttackReadProjection(projection)
getAttackReadProjectionSchemaVersion()
```
