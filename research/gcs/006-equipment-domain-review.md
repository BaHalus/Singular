# Revisão do domínio Equipment

## Escopo

Este documento registra a revisão da pesquisa do domínio Equipment, conduzida com base exclusiva no projeto GCS durante a etapa de Engenharia Reversa.

## Fatos confirmados

- O tipo principal de domínio é Equipment, definido em model/gurps/equipment.go.
- O domínio também inclui EquipmentModifier, definido em model/gurps/equipment_modifier.go, e Weapon, definido em model/gurps/weapon.go.
- Equipment suporta containers, filhos, quantidade, estado de equipado, valor, peso, usos máximos, prereqs, features, armas e sincronização com uma fonte externa.
- O estado de equipado é transitivo via ReallyEquipped(), que considera o item corrente, sua quantidade e todos os ancestors.
- O cálculo de valor e peso é separado por item e por stack extendido:
  - AdjustedValue()/AdjustedWeight() calculam o valor/peso de uma unidade.
  - ExtendedValue()/ExtendedWeight() calculam o total da stack e dos filhos de containers.
- O cálculo de peso incorpora modificadores e features, inclusive ContainedWeightReduction para containers.
- O cálculo de usos máximos é dinâmico e pode ser alterado por features específicas, com suporte a bônus por nível.
- O domínio possui prereqs específicos para equipamento equipado, representados por EquippedEquipmentPrereq.
- O domínio preserva comportamento de sincronização com source através de SourceMatcher e dos métodos SyncWithSource() em Equipment e EquipmentModifier.

## Hipóteses e observações

- O domínio Equipment é mais rico do que um simples cadastro de itens: ele comporta uma pequena sub-arquitetura de cálculo, composição e regras de dependência.
- A semântica de container é importante para o modelo: o mesmo tipo base representa tanto equipment simples quanto container, com comportamento diferenciado por tipo de TID.
- Weapon não é um sub-tipo de Equipment, mas uma estrutura associada que compartilha contexto de owner e participa da modelagem do equipamento.

## Revisão

- Rastreabilidade: preservada.
- Escopo: respeitado.
- Uso de fontes: GCS como fonte primária; gcs_master_library não foi necessário; SINGULAR não foi usado para descobrir o domínio.
- Resultado: domínio Equipment revisado com sucesso para a fase atual da pesquisa.
