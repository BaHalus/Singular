# App Attacks

**Código:** APP-ATTACK-1.2  
**Status:** Aprovado  
**Camada:** Application  
**Dependências:** APP-CORE-1.1, DOM-ATTACK-1.1, APP-ATTACK-1.0 e APP-ATTACK-1.1

## Objetivo

APP-ATTACK conecta intenções estruturais de edição ao agregado canônico de ataques, oferece uma projeção portátil de leitura e permite anexá-la explicitamente ao `ApplicationReadModel`. A aplicação não calcula regras de combate.

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

Edição, remoção e reordenação usam exclusivamente identidade canônica por ID. Payloads adicionais são rejeitados.

## Fluxo de escrita

```text
intenção futura
→ CommandEnvelope
→ CommandRegistry
→ AttackCommandHandlers
→ AttacksOperations
→ Character
→ CommandExecutor
→ revisão, histórico e recibo
→ persistência, undo e redo
```

Não existe segundo executor, sessão ou histórico.

## Operações

- `attack.add` acrescenta uma entrada canônica ao final;
- `attack.update` aplica o patch aceito pelo domínio e preserva o ID;
- `attack.remove` remove a entrada identificada;
- `attack.reorder` move a entrada para índice válido.

Atualização estruturalmente idêntica e posição já vigente produzem `no-op`. A igualdade portátil independe da ordem de chaves.

## Projeção de leitura

`createAttackReadProjection(character)` produz:

```js
{
  schemaVersion: 1,
  characterId,
  attacks
}
```

A coleção preserva ordem, IDs, origem, dano declarado, reach, range, notas, `importMeta` e `raw`. A projeção é validada, profundamente congelada e serializável para snapshot destacado. Ela não resolve referências e não acrescenta campos mecânicos.

## Integração ao ApplicationReadModel

O read model v2 recebe uma opção independente:

```js
createApplicationReadModel(session, {
  skillMechanics,
  attackProjection,
})
```

As duas opções podem ser omitidas, fornecidas isoladamente ou combinadas. Modelos novos sempre emitem:

```js
{
  schemaVersion: 2,
  session,
  character,
  pointLedger,
  skillMechanics,
  attackProjection,
}
```

`attackProjection` é uma `AttackReadProjection` validada e pertencente ao mesmo `Character`, ou `null`. O read model não cria a projeção automaticamente e não usa o `Character` como fallback mecânico.

A extensão é retrocompatível: snapshots v2 antigos sem `attackProjection` continuam válidos. Campo presente com valor `undefined` é inválido. Propriedades desconhecidas permanecem proibidas e `skillMechanics` continua obrigatório no shape v2 histórico.

## Autoridades

- `Attacks` declara e valida os dados;
- `AttacksOperations` altera a coleção;
- `Character` permanece o Aggregate Root;
- `CommandExecutor` controla revisão, atomicidade e histórico;
- `AttackReadProjection` protege o snapshot específico de leitura;
- `ApplicationReadModel` apenas anexa projeções já prontas;
- UI e bootstrap permanecem fora desta etapa.

## Ausência de mecânica

APP-ATTACK não calcula ou interpreta NH, dano, tipo, reach, alcance, precisão, Aparar, recuo, cadência ou defesa. A autoridade do dano permanece `declared`.

## Atomicidade e portabilidade

Comandos inválidos falham sem alterar a sessão. A projeção rejeita schema incorreto, propriedades extras, IDs duplicados, arrays esparsos, autoridade diferente de `declared`, ciclos e valores não finitos. Números finitos, inclusive `-0`, são preservados.

## Fronteiras

APP-ATTACK 1.2 não altera UI, bootstrap, domínio, persistência concreta, `Character.js`, Equipamentos, Skills, Spells, Powers ou motores. Também não calcula nem gera a projeção automaticamente.

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

createApplicationReadModel(session, { attackProjection })
```
