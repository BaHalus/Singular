# Etapa 4.1 — Efeitos que criam elementos na ficha

**Status:** fundação implementada

## Objetivo

Permitir que um Traço adquirido materialize elementos canônicos que não existiam na ficha antes da aquisição. O primeiro caso é um Traço que declara uma arma/ataque pronto, como **Ataque Inato**.

O fluxo canônico é:

```text
Traço adquirido
  -> declaração `weapons`
  -> Construction/Effects projection
  -> Attack canônico
  -> projeção da tabela de Ataques
  -> UI
```

A UI não cria `<tr>`, não calcula dano e não infere a origem.

## Implementação atual

`src/domain/character/TraitAttackEffects.js` materializa as declarações `trait.weapons` por meio de `createAttack()`.

Cada ataque derivado recebe um identificador determinístico:

```text
trait-attack:<traitId>:<weaponIndex>
```

e origem canônica:

```js
{
  kind: "trait",
  id: trait.id,
}
```

O `id` do Traço identifica a instância adquirida. Portanto, duas instâncias do mesmo Traço podem gerar ataques com o mesmo nome sem serem confundidas.

## Projeção da tabela

`src/domain/character/CharacterAttackProjection.js` combina:

1. `character.attacks` — ataques declarados/manuals;
2. `constructTraitAttacks(character.traits)` — ataques derivados dos Traços.

A coleção `character.attacks` **não é alterada** pela projeção. Isso preserva a distinção entre estado declarado e elementos derivados.

Consequências:

- adicionar um Traço com arma acrescenta o ataque à projeção;
- remover o Traço remove somente o ataque derivado na próxima projeção;
- ataques manuais permanecem;
- duas instâncias distintas permanecem distintas;
- a origem do ataque é preservada no modelo canônico;
- a declaração original é preservada em `attack.raw`.

## Limite deliberado desta etapa

Esta etapa não transforma ainda toda a pipeline de comandos/UI para usar automaticamente a projeção. Também não inventa regras mecânicas para converter formatos GCS arbitrários em dano, alcance, NH ou demais campos de combate.

A declaração precisa fornecer os campos portáteis aceitos pelo modelo `Attack`. A interpretação mecânica continua pertencendo aos motores apropriados.

## Testes

A cobertura específica está em:

- `TraitAttackEffects.test.js`
- `CharacterAttackProjection.test.js`

Casos protegidos:

- criação de ataque por Traço;
- proveniência `trait`;
- IDs distintos para duas instâncias;
- remoção do Traço removendo somente o derivado;
- preservação de ataques manuais;
- preservação da declaração original em `raw`.
