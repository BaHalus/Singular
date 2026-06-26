# ADR-0062 — Domínio isolado de Attacks para a Alpha

**Status:** Proposto  
**Data:** 2026-06-26  
**Decisão:** DOM-ATTACK-1.0

## Contexto

O `Character` atual preserva `attacks` como array bruto, sem agregado, validação ou serialização próprios. Skills, Equipment e Spells preservam arrays externos chamados `weapons`, mas esses campos pertencem às respectivas fontes e não constituem uma coleção canônica de ataques.

A Alpha mobile precisa declarar, salvar, carregar e posteriormente editar ataques básicos sem antecipar um sistema completo de combate nem criar dependências circulares entre Attack, Skill e Equipment.

## Decisão

Criar um domínio isolado em:

```text
src/domain/character/Attacks.js
src/domain/character/AttacksOperations.js
```

A coleção mantém ordem declarada e identidade por ID. Um ataque contém referências opcionais por ID para a Skill e para sua origem, sem incorporar cópias dessas entidades.

## Valores mecânicos declarados

Dano, tipo, reach e alcance serão preservados como texto portátil. O objeto de dano carrega obrigatoriamente:

```js
authority: "declared"
```

A decisão evita escolher prematuramente uma gramática para dados como `thr`, `sw`, dados, divisores, multiplicadores ou expressões externas. Nenhum valor declarado será apresentado como resultado mecânico calculado.

## Referências

```text
skillId
source.kind
source.id
```

são referências editoriais. A validação isolada verifica apenas forma e portabilidade. Integridade referencial entre agregados será responsabilidade de uma camada coordenadora futura, sem importações circulares no domínio.

Resolução por nome é proibida.

## Origem

O vocabulário mínimo é:

```text
manual
equipment
trait
spell
power
other
```

Isso registra proveniência sem gerar ataques automaticamente. Nenhum array `weapons` existente é promovido ou convertido nesta decisão.

## Imutabilidade e snapshots

`createAttacks` cria um agregado profundamente congelado e destacado das entradas. `serializeAttacks` devolve snapshot profundo, independente e composto apenas por valores JSON portáteis.

As operações de adicionar, editar, remover e reordenar devolvem nova coleção e não mutam o agregado anterior.

## Integração

Esta decisão não modifica `Character.js`. Depois da integração de DOM-ATTACK-1.0, uma PR separada poderá substituir o array bruto por chamadas a:

```text
createAttacks
validateAttacks
serializeAttacks
```

Essa ligação depende de nova auditoria de concorrência em `Character.js`.

## Consequências

### Positivas

- ataques passam a ter identidade e formato portável próprios;
- save/load futuro poderá usar serialização validada;
- referências não duplicam Skills, Equipment ou outras origens;
- a UI futura não precisa interpretar regras;
- a gramática mecânica continua aberta para decisão própria do motor.

### Custos

- dano, reach e alcance permanecem texto declarado;
- integridade referencial cruzada ainda não é validada;
- arrays `weapons` externos não são importados automaticamente;
- o domínio ainda não oferece projeção mecânica.

## Alternativas rejeitadas

### Reutilizar `Equipment.weapons`, `Skill.weapons` ou `Spell.weapons`

Rejeitado porque criaria múltiplas autoridades e dependência da estrutura externa de cada domínio.

### Copiar Skill ou Equipment para dentro de Attack

Rejeitado porque duplicaria entidades e exigiria sincronização por nome ou conteúdo.

### Definir agora uma gramática mecânica de dano

Rejeitado porque não há decisão suficiente para representar com segurança dano fixo, dados, `thr`, `sw`, modificadores, multiplicadores e futuras autoridades calculadas.

### Calcular NH, alcance ou defesa no schema

Rejeitado porque cálculo pertence ao motor e não ao agregado declarativo.

## Invariantes

1. identidade é sempre por ID;
2. ordem é determinística e declarada;
3. referências cruzadas não copiam entidades;
4. valores mecânicos desta etapa têm autoridade `declared`;
5. snapshots são portáteis e destacados;
6. operações são imutáveis;
7. não existe geração automática de ataques;
8. não existe cálculo de combate em domínio declarativo ou UI.
