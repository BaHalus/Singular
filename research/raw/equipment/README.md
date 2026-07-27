# Equipment — Pesquisa arquitetural resumida

## Escopo

Este registro consolida a investigação do domínio Equipment com base exclusiva no repositório GCS.

## Fontes primárias

- model/gurps/equipment.go
- model/gurps/equipment_modifier.go
- model/gurps/weapon.go
- model/gurps/equipped_equipment_prereq.go
- model/gurps/equipment_max_uses_bonus.go
- model/gurps/contained_weight_reduction.go
- model/gurps/equipment_modifier.go (funções de cálculo de custo/peso)

## Conclusões principais

- Equipment é um nó de árvore/estrutura do domínio GCS, com suporte a containers e itens simples. A forma canônica é um nó com dados editáveis, filhos, modificadores, armas, features e estado de sincronização com origem.
- O modelo distingue claramente entre:
  - Equipment: o item principal, incluindo quantidade, equipado, valor, peso, usos máximos, prereqs, features, armas e filhos.
  - EquipmentModifier: um modificador aplicado ao equipamento, com custo/peso configuráveis, features e suporte a containers.
  - Weapon: uma estrutura associada ao equipamento, com dados de ataque/defesa e defaults, não sendo um tipo de equipamento em si.
- O estado de equipado é semântico e propagado para os pais: a função ReallyEquipped() só retorna verdadeiro quando o item, sua quantidade e todos os ancestors estão equipados e com quantidade positiva.
- Quantidade e valor/peso usam cálculo explícito por item e por stack extendido:
  - AdjustedValue() e AdjustedWeight() tratam do item individual.
  - ExtendedValue() e ExtendedWeight() tratam do stack completo, incluindo filhos de containers.
- O cálculo de peso inclui regras especiais para containers com ContainedWeightReduction, aplicando redução percentual ou fixa aos conteúdos.
- A lógica de features faz parte do domínio: Equipment suporta features próprias e modificadores com features, incluindo max uses bonus e contained weight reduction.
- Max uses é calculado dinamicamente a partir de um valor base, ajustes por features e limites absolutos, com suporte a bônus por nível e seleção de equipamento alvo.
- Prerequisites são representados por PrereqList e por um tipo específico, EquippedEquipmentPrereq, que verifica se existe equipamento equipado com nome/tags compatíveis.
- Sync/source behavior é modelado por SourceMatcher e por métodos GetSource/ClearSource/SyncWithSource, que copiam campos de origem em caso de mismatch.
