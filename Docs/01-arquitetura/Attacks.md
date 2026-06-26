# Attacks

**Código:** DOM-ATTACK-1.0  
**Status:** Em validação  
**Camada:** Domain

Attacks é a coleção canônica de ataques declarados do personagem. O domínio preserva identidade, ordem, referências e dados editoriais portáteis, mas não resolve regras de combate.

## Autoridade

```text
O schema declara ataques.
O motor futuro calculará mecânica.
A aplicação orquestrará intenções.
A UI apenas apresentará e coletará entrada.
```

Todo dano, tipo de dano, reach e alcance presentes nesta etapa possuem:

```js
authority: "declared"
```

Esses valores não são resultados mecânicos resolvidos.

## Contrato mínimo

```js
{
  id,
  externalIds,
  name,
  category,
  skillId,
  source: {
    kind,
    id,
  },
  damage: {
    value,
    type,
    authority: "declared",
  },
  reach,
  range,
  notes,
  importMeta,
  raw,
}
```

### Categorias

```text
melee
ranged
```

### Origens

```text
manual
equipment
trait
spell
power
other
```

`skillId` e `source.id` são referências opcionais por identidade canônica. Attacks não copia Skill, Equipment, Trait, Spell ou Power e não verifica a existência dessas entidades nesta etapa isolada.

## Dano e alcance declarados

`damage.value`, `damage.type`, `reach` e `range` são strings portáteis. O domínio não interpreta sua gramática, não converte `thr` ou `sw`, não calcula NH, Aparar, precisão, distância, velocidade, recuo ou dano final.

A escolha deliberada por texto declarado preserva formatos já encontrados em payloads externos sem promover nenhum deles a regra mecânica da SINGULAR.

## Compatibilidade auditada

A `main` anterior a DOM-ATTACK-1.0 possuía `Character.attacks` como array bruto. Skills, Equipment e Spells também preservavam arrays `weapons` externos, além de `raw` e metadados de importação.

Esses arrays externos:

- não são catálogo canônico de ataques;
- não são copiados automaticamente para Attacks;
- não geram ataques derivados;
- podem ser preservados em `raw` durante uma integração externa futura;
- exigirão adapter específico antes de virar entrada canônica.

## Invariantes

1. IDs são strings não vazias e únicas na coleção.
2. Ordem é a ordem declarada no array e permanece determinística.
3. Categoria e origem usam vocabulários fechados.
4. Referências cruzadas são apenas IDs opcionais, nunca nomes ou cópias de entidades.
5. Dano possui sempre autoridade `declared`.
6. Valores preservados precisam ser JSON portáteis, densos e acíclicos.
7. A criação destaca os dados recebidos e congela profundamente o agregado.
8. `serializeAttacks` produz snapshot profundo e independente.
9. Campos mecânicos calculados não pertencem a este contrato.

## Operações

`AttacksOperations.js` oferece somente operações puras e imutáveis:

```text
addAttack
updateAttack
removeAttack
reorderAttack
findAttackById
```

Busca, edição, remoção e reordenação usam exclusivamente `id`.

## Fronteiras

DOM-ATTACK-1.0 não altera `Character.js`, UI, App Core, persistência, Equipment, Skills, Techniques, Traits, Spells, Powers, importadores ou Library core.

A ligação com `Character.attacks` ocorrerá em PR posterior e mínima, após este domínio isolado ser integrado e a concorrência em `Character.js` ser revalidada.

## Fora de escopo

Permanecem fora da Alpha nesta etapa: combate completo, turnos, iniciativa, manobras, hit locations, defesas ativas, cálculo de Aparar/Bloqueio/Esquiva, modificadores de distância, velocidade e alcance, recuo, cadência avançada, munição, recarga, explosões, dispersão, dano por ST, conversão de `thr`/`sw`, ferimentos, DR, choque, knockdown, geração automática por Equipment/Traits/Spells/Powers, UI, biblioteca de armas e importação externa completa.
