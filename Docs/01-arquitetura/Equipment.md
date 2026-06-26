# Equipment

**Código:** DOM-EQP-1.3  
**Status:** Aprovado  
**Camada:** Domain

Equipment é o inventário canônico do personagem. Esta etapa reutiliza o agregado existente e não cria um schema paralelo.

## Escopo da Alpha

O domínio cobre:

- item canônico com identidade estável;
- quantidade;
- peso e custo unitários;
- estados `equipped`, `carried`, `stored` e `dropped`;
- recipientes pela hierarquia `children`;
- validação e serialização portátil;
- totais determinísticos de quantidade, peso e custo;
- operações mínimas e testes.

`ignored` permanece apenas para agrupamentos semânticos legados com `containerKind: "group"`.

## Contrato preservado

Os campos existentes do DOM-EQP-1.2 permanecem canônicos. Aliases de entrada já suportados, como `value`, `weight` e `max_uses`, continuam aceitos. A conversão histórica permanece `2 lb = 1 kg`.

A criação preserva as referências legadas dos campos ricos depois de validar sua portabilidade. `serializeEquipment` produz o clone profundo e independente destinado ao transporte.

## Invariantes

1. IDs são strings não vazias e únicas em toda a árvore.
2. Quantidade, peso, custo, usos e máximos são finitos e não negativos.
3. Somente recipientes podem possuir filhos.
4. Arrays precisam ser densos e valores preservados precisam ser JSON portáteis.
5. Ciclos de objeto são rejeitados.
6. Um recipiente não pode ser movido para dentro de si próprio ou de um descendente.
7. O destino de movimentação precisa existir e ser recipiente.

## Totais

`calculateEquipmentTotals(equipment)` devolve:

```js
{
  quantity: 0,
  weightKg: 0,
  cost: 0
}
```

A quantidade é somada por linha. Peso e custo são calculados como quantidade multiplicada pelo valor unitário. Itens aninhados são percorridos uma vez. A agregação decimal evita artefatos usuais de ponto flutuante.

Esses totais são estruturais e não implementam as regras completas de carga.

## Fronteiras

Esta etapa não altera `Character.js`, schemas centrais, App Core, UI, persistência concreta, Library core, importadores não específicos nem outros domínios da ficha.

Qualquer integração nova com arquivos compartilhados exige autorização separada.

## Fora de escopo

Permanecem fora desta etapa catálogo extenso, biblioteca visual, importação completa, moedas avançadas, comércio, fabricação, manutenção, regras detalhadas de consumíveis, derivações de combate, regras completas de carga, interface e persistência de navegador.

## Checklist

- [x] Reutilizar o agregado existente.
- [x] Não criar schema paralelo.
- [x] Preservar aliases e contratos legados.
- [x] Validar portabilidade e números finitos.
- [x] Garantir IDs únicos e hierarquia acíclica.
- [x] Produzir serialização profunda portátil.
- [x] Calcular totais determinísticos.
- [x] Cobrir o MVP com testes próprios.
- [x] Atualizar a branch após os merges da frente principal.
- [x] CI verde sobre a `main` vigente.
- [x] Ausência de revisão bloqueante.
