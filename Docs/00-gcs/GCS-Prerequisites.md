# GCS — pré-requisitos: contrato e avaliação observada

> Escopo: comportamento diretamente observado no código-fonte público de `richardwilkes/gcs`. Este documento não descreve regras inferidas nem decisões da SINGULAR.

## Convenção de evidência

- **Confirmada** — comportamento diretamente observado na implementação citada.
- **Indicação** — evidência parcial observada, insuficiente para afirmar o comportamento completo.
- **Não confirmada** — questão registrada sem evidência suficiente; não é tratada como comportamento do GCS.

## Contrato `Prereq`

**Confirmada.** `Prereq` é uma interface que exige `PrereqType()`, `ParentList()`, `Clone()`, `Satisfied()` e `Hash()`, além de `nameable.Filler`. O método `Satisfied(entity, exclude, buffer, prefix, hasEquipmentPenalty)` recebe a `Entity`, um objeto a excluir da própria busca, buffer opcional para descrição da falha, prefixo textual e ponteiro para sinalização de penalidade de equipamento.

Rastreabilidade: `model/gurps/prereq.go` — interface `Prereq`; método `Prereq.Satisfied`.

## `PrereqList`

**Confirmada.** `PrereqList` também implementa `Prereq`. Persiste `Type`, `All`, `WhenTL` e `Prereqs`; o ponteiro `Parent` é excluído do JSON. `NewPrereqList()` cria uma lista com `Type = prereq.List` e `All = true`.

**Confirmada.** `PrereqList.Satisfied()` retorna `true` imediatamente quando `entity == nil`. Quando `WhenTL.Compare` não é `criteria.AnyNumber`, extrai o TL de `entity.Profile.TechLevel`, converte TL negativo para zero e retorna `true` sem avaliar os filhos se `WhenTL` não corresponder ao TL obtido.

**Confirmada.** Quando a lista é aplicável, `Satisfied()` avalia todos os elementos de `Prereqs` e conta quantos retornam `true`. A lista é satisfeita quando todos os filhos são satisfeitos ou, se `All == false`, quando pelo menos um filho é satisfeito. Portanto uma lista vazia satisfaz a condição `count == len(p.Prereqs)`.

**Confirmada.** A sinalização `hasEquipmentPenalty` produzida pelos filhos é propagada ao chamador somente quando a própria lista termina não satisfeita. Quando há buffer, a falha é agrupada sob `Requires all of:` para `All == true` ou `Requires at least one of:` para `All == false`; o texto produzido pelos filhos é indentado.

**Confirmada.** `CloneAsPrereqList()` clona recursivamente os filhos e fornece a nova lista como `parent` de cada clone. `CloneResolvingEmpty()` pode devolver `nil`, um clone, ou uma nova lista vazia conforme existência da lista, `isContainer` e `pruneIfEmpty`.

Rastreabilidade: `model/gurps/prereq_list.go` — tipo `PrereqList`; `NewPrereqList`, `CloneAsPrereqList`, `CloneResolvingEmpty`, `(*PrereqList).Satisfied`.

## `AttributePrereq`

**Confirmada.** `AttributePrereq` persiste `Type`, `Has`, `CombinedWith`, `QualifierCriteria` e `Which`; `Parent` não é persistido. `NewAttributePrereq()` configura `Type = prereq.Attribute`, comparação `AtLeastNumber`, qualificador `10`, `Which` resolvido a partir de `StrengthID` e `Has = true`.

**Confirmada.** `AttributePrereq.Satisfied()` retorna `true` para `entity == nil`. Caso contrário, obtém `ResolveAttributeCurrent(Which)` e, se `CombinedWith` não estiver vazio, soma `ResolveAttributeCurrent(CombinedWith)`. O valor resultante é testado por `QualifierCriteria.Matches(value)`; quando `Has == false`, o resultado booleano é invertido.

**Confirmada.** O parâmetro `exclude` e a sinalização `hasEquipmentPenalty` não participam dessa implementação. Quando há falha e tooltip, o método escreve a condição usando os nomes dos atributos resolvidos pela entidade e a representação textual de `QualifierCriteria`.

Rastreabilidade: `model/gurps/attribute_prereq.go` — tipo `AttributePrereq`; `NewAttributePrereq`, `(*AttributePrereq).Satisfied`.

## `EquippedEquipmentPrereq`

**Confirmada.** `EquippedEquipmentPrereq` persiste `Type`, `NameCriteria` e `TagsCriteria`; `Parent` não é persistido. O construtor configura `Type = prereq.EquippedEquipment`, `NameCriteria.Compare = criteria.IsText` e `TagsCriteria.Compare = criteria.AnyText`.

**Confirmada.** `EquippedEquipmentPrereq.Satisfied()` retorna `true` para `entity == nil`. Para entidade válida, percorre apenas `entity.CarriedEquipment` e considera satisfeita a condição ao encontrar um Equipment que simultaneamente: não seja o próprio objeto recebido em `exclude`, retorne `true` em `ReallyEquipped()`, corresponda a `NameCriteria` e corresponda a `TagsCriteria`.

**Confirmada.** Se `exclude` implementar `nameable.Accesser`, suas substituições são usadas pelos critérios de nome e tags. A travessia interrompe quando encontra a primeira correspondência.

**Confirmada.** Quando nenhum equipamento correspondente é encontrado, o método define `*hasEquipmentPenalty = true` e, se houver tooltip, escreve a descrição da condição não satisfeita. Nesta implementação não há caminho que marque penalidade de equipamento quando o pré-requisito é satisfeito.

Rastreabilidade: `model/gurps/equipped_equipment_prereq.go` — tipo `EquippedEquipmentPrereq`; `NewEquippedEquipmentPrereq`, `(*EquippedEquipmentPrereq).Satisfied`; `model/gurps/equipment.go` — método `(*Equipment).ReallyEquipped` como chamada consumida pelo pré-requisito.

## Relação com `Entity.Recalculate()`

**Confirmada.** `Entity.processPrereqs()` chama `Prereq.Satisfied()` para Traits, Skills, Spells e Equipment durante o laço de convergência de `Entity.Recalculate()`. Para Skills e Spells, uma falha que propague `hasEquipmentPenalty` causa a criação de bônus negativos específicos no conjunto de features da entidade; esse consumo está documentado em `GCS-Character.md`.

Rastreabilidade: `model/gurps/entity.go` — `(*Entity).Recalculate`, `(*Entity).processPrereqs`; `model/gurps/prereq.go` — `Prereq.Satisfied`.

## Questões em aberto

- **Não confirmada:** avaliação concreta de `TraitPrereq`, `SkillPrereq`, `SpellPrereq`, `ContainedWeightPrereq` e `ScriptPrereq`; seus métodos `Satisfied()` não foram consolidados nesta passagem.
- **Não confirmada:** semântica completa de `Equipment.ReallyEquipped()`; nesta passagem está confirmado apenas que `EquippedEquipmentPrereq` consome seu resultado booleano.
