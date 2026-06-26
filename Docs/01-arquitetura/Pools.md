# Pools

**Código:** DOM-POOL-1.1  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado operacional

## Objetivo

`Pools` representa recursos consumíveis e transitórios do personagem durante o jogo.

Diferentemente de Attributes e SecondaryCharacteristics, Pools armazena estado operacional. O agregado não interpreta o significado mecânico das alterações.

## Estrutura canônica

```js
{
  HP: { current: null, maximum: null },
  FP: { current: null, maximum: null },
  EnergyReserve: { current: null, maximum: null }
}
```

`HP` e `FP` são obrigatórios. `EnergyReserve` é opcional. Pools adicionais importados podem ser preservados quando obedecem ao mesmo contrato estrutural.

Todo pool operacional possui `current` e `maximum`, ambos números finitos ou `null`. `null` representa valor ainda desconhecido.

## Responsabilidades

Pools armazena valores atuais e máximos, preserva pools opcionais/importados, fornece serialização consistente e oferece operações puras sobre o estado transitório.

Pools não calcula máximos, não aplica dano, cura, gasto ou recuperação, não calcula morte, inconsciência ou exaustão e não limita o valor atual ao máximo.

## Operações DOM-POOL-1.1

`PoolsOperations.js` certifica:

- `setPoolCurrent`;
- `adjustPoolCurrent`;
- `setPoolMaximum`;
- `resetPoolCurrentToMaximum`;
- `addPool`;
- `removePool`;
- `validateOperationalPools`.

Todas as operações são imutáveis.

## Ajustes incrementais

Um ajuste exige pool existente, valor atual conhecido, delta finito e resultado finito.

Não há clamp. Um pool pode ficar abaixo de zero ou acima do máximo, pois a interpretação mecânica pertence a módulos de regras futuros.

## Pools obrigatórios e opcionais

`HP` e `FP` não podem ser removidos. `EnergyReserve` e pools importados adicionais podem ser criados e removidos quando possuem `current` e `maximum` válidos.

## Relação com Equipment

Pools representa recursos inerentes ou diretamente associados ao personagem. Fontes externas de energia, como gemas, baterias, cristais ou itens carregáveis, pertencem a Equipment.

## Compatibilidade e serialização

Pools permanece composto por objetos simples e valores JSON portáteis. A serialização não deve conter métodos, referências circulares, dependências externas ou números não finitos.

## Relação com Character

Pools pertence ao `Character`, que continua sendo o Aggregate Root.

## Direção de implementação

A implementação usa objetos simples, composição, funções puras, operações imutáveis e serialização direta. Não utiliza classes e não transfere cálculos para a UI.

## Checklist DOM-POOL-1.1

- [x] Agregado integrado ao Character.
- [x] Testes estruturais do agregado.
- [x] Operações de definição de atual e máximo.
- [x] Adição e remoção de pools opcionais.
- [x] Ajuste incremental do valor atual.
- [x] Restauração do atual ao máximo conhecido.
- [x] Validação de números finitos.
- [x] Preservação de pools importados adicionais.
- [x] ADR-0057 registrada.
- [x] CI verde na base vigente.
- [x] Ausência de revisão bloqueante.
