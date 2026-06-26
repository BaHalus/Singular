# Pools

**Código:** DOM-POOL-1.1  
**Status:** Proposto para revisão  
**Camada:** Domain  
**Tipo:** Agregado operacional

## Objetivo

`Pools` representa recursos consumíveis e transitórios do personagem durante o jogo.

Diferentemente de Attributes e SecondaryCharacteristics, Pools armazena estado operacional. O agregado não interpreta o significado mecânico das alterações.

## Estrutura canônica

```js
{
  HP: {
    current: null,
    maximum: null
  },
  FP: {
    current: null,
    maximum: null
  },
  EnergyReserve: {
    current: null,
    maximum: null
  }
}
```

`HP` e `FP` são obrigatórios. `EnergyReserve` é opcional. Pools adicionais importados podem ser preservados quando obedecem ao mesmo contrato estrutural.

Todo pool operacional possui:

- `current`: valor atual ou `null`;
- `maximum`: capacidade máxima ou `null`.

Valores numéricos operacionais precisam ser finitos. `null` representa valor ainda desconhecido.

## Responsabilidades

Pools é responsável por:

- armazenar valores atuais;
- armazenar capacidades máximas;
- preservar pools opcionais e importados;
- fornecer serialização consistente;
- oferecer operações puras sobre o estado transitório;
- garantir integridade estrutural mínima.

## Não responsabilidades

Pools não:

- calcula HP, FP ou reservas máximas;
- aplica regras de dano ou cura;
- aplica regras de gasto ou recuperação;
- calcula morte, inconsciência ou exaustão;
- limita o valor atual ao máximo;
- impede valores atuais negativos;
- interpreta a origem de uma alteração.

Essas responsabilidades pertencem a módulos de regras e à orquestração futura.

## Operações DOM-POOL-1.1

`PoolsOperations.js` certifica:

- `setPoolCurrent` — define o valor atual;
- `adjustPoolCurrent` — soma um delta ao valor atual conhecido;
- `setPoolMaximum` — define a capacidade máxima;
- `resetPoolCurrentToMaximum` — copia o máximo conhecido para o atual;
- `addPool` — acrescenta um pool opcional ou importado;
- `removePool` — remove um pool não obrigatório;
- `validateOperationalPools` — valida toda a estrutura operacional.

Todas as operações são imutáveis.

## Ajustes incrementais

Um ajuste exige:

1. pool existente;
2. valor atual conhecido;
3. delta finito;
4. resultado finito.

Não há clamp. Um pool pode ficar abaixo de zero ou acima do máximo. Essa decisão é intencional para impedir que o domínio estrutural antecipe regras mecânicas.

## Pools obrigatórios e opcionais

`HP` e `FP` não podem ser removidos.

`EnergyReserve` e pools importados adicionais podem ser criados e removidos. O domínio não precisa compreender semanticamente cada tipo de reserva para preservar seu estado.

## Relação com Equipment

Pools representa recursos inerentes ou diretamente associados ao personagem.

Fontes externas de energia, como gemas, baterias, cristais ou itens carregáveis, pertencem a Equipment. A camada de apresentação pode agrupá-los visualmente, mas os agregados permanecem distintos.

## Compatibilidade e serialização

Pools deve permanecer composto por objetos simples e valores JSON portáteis.

A serialização não deve conter:

- métodos;
- referências circulares;
- dependências externas;
- números não finitos.

Dados adicionais importados podem ser preservados como pools opcionais quando possuem `current` e `maximum` válidos.

## Relação com Character

Pools pertence ao `Character`, que continua sendo o Aggregate Root:

```text
Character
└── Pools
    ├── HP
    ├── FP
    ├── EnergyReserve (opcional)
    └── outros pools importados (opcionais)
```

## Direção de implementação

A implementação utiliza:

- objetos simples;
- composição;
- funções puras;
- operações imutáveis;
- serialização direta.

Não utiliza classes e não transfere cálculos para a UI.

## Checklist DOM-POOL-1.1

- [x] Agregado `Pools` integrado ao Character.
- [x] Testes estruturais do agregado.
- [x] Operações de definição de atual e máximo.
- [x] Adição e remoção de pools opcionais.
- [x] Ajuste incremental do valor atual.
- [x] Restauração do atual ao máximo conhecido.
- [x] Validação de números finitos.
- [x] Preservação de pools importados adicionais.
- [x] ADR-0057 registrada.
- [ ] CI verde na base vigente.
- [ ] Ausência de revisão bloqueante.
