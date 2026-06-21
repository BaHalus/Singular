# Traits — Fundação soberana

**Código:** DOM-TRAIT-1.0  
**Status:** Em implementação  
**Camada:** Domain  
**Tipo:** Agregado canônico, identidade, papéis e compatibilidade  
**Decisão:** ADR-0035

Traits representa vantagens, qualidades, desvantagens, peculiaridades e futuras categorias compatíveis sem manter quatro autoridades persistentes independentes.

## Regra central

```text
Trait declara sua identidade, seu papel e seus dados.
O domínio de Traits interpreta modificadores e custo em blocos posteriores.
O Point Ledger apenas agrega resultados já autorizados.
A UI apresenta e despacha intenção.
```

DOM-TRAIT-1.0 não calcula custo, não resolve pré-requisitos e não cria efeitos derivados.

## Autoridade canônica

```text
Character.traits
```

é a autoridade persistente.

As coleções históricas:

```text
Character.advantages
Character.perks
Character.disadvantages
Character.quirks
```

permanecem temporariamente como projeções derivadas por `role`.

Elas não constituem quatro agregados independentes.

## Estrutura

```js
{
  id,
  externalIds,
  role,
  source,
  name,
  notes,
  tags,
  points,
  levels,
  modifiers,
  features,
  weapons,
  prereqs,
  importMeta,
  power,
  alternateGroupId,
  isPrimaryAlternative,
  raw,
}
```

## Identidade

`id` é soberano em toda a coleção de Traits.

O mesmo ID não pode aparecer em papéis diferentes.

```text
nome ≠ identidade
posição ≠ identidade
papel ≠ identidade
```

`externalIds` preserva identidades externas sem substituir o ID soberano.

## Papéis

Papéis conhecidos:

```text
advantage
perk
disadvantage
quirk
```

O vocabulário permanece aberto. Papel desconhecido é preservado no agregado canônico e não é forçado para uma das quatro projeções históricas.

```text
não reconhecido ≠ inválido
```

## Origem

Cada Trait possui:

```js
source: {
  kind,
  provider,
  format,
  reference,
  version,
}
```

Traits criados na SINGULAR usam `kind: "singular"`.

Dados importados preservam provedor e referência quando disponíveis. `importMeta` e `raw` continuam intactos para evidência e retrocompatibilidade.

## Compatibilidade

Entradas antigas que fornecem somente as quatro coleções são convertidas para `traits`.

Quando uma representação canônica e suas projeções equivalentes aparecem juntas, a representação canônica permanece autoridade.

Durante a migração, uma coleção histórica explicitamente alterada substitui apenas o papel correspondente ao reconstruir o Character. Isso mantém operações anteriores funcionais sem criar um segundo estado persistente.

Depois da reconstrução:

```text
traits
→ projeções novamente derivadas
```

Divergência posterior causada por mutação direta é detectada por validação.

## Imutabilidade

Traits canônicos são profundamente imutáveis e clonam os dados recebidos.

Operações futuras deverão produzir novo agregado ou novo Character, nunca modificar o Trait original.

## Serialização

`serializeCharacter` persiste:

```text
traits                → autoridade canônica
advantages            → projeção de compatibilidade
perks                  → projeção de compatibilidade
disadvantages         → projeção de compatibilidade
quirks                 → projeção de compatibilidade
```

No round trip, representações equivalentes são unificadas.

A remoção das projeções persistidas exige migração explícita e não pertence ao DOM-TRAIT-1.0.

## Relação com Templates

Templates declaram contribuições de domínio `trait`.

Quando um Template é aplicado, os componentes atualmente projetados nas coleções históricas são absorvidos por `Character.traits` durante a reconstrução do agregado.

DOM-TEMPLATE permanece fechado. A interpretação mecânica do Trait pertence a DOM-TRAIT.

## Relação com Morfose e Forma Alternativa

Resolvers existentes podem continuar lendo `Character.advantages` como projeção estável.

Nenhum vínculo passa a ser realizado por nome além das regras já congeladas nesses domínios.

## Relação com Point Ledger

O Point Ledger não deve ser aberto antes de Traits possuir autoridades claras para:

- custo declarado e calculado;
- níveis;
- modificadores;
- grupos alternativos;
- divergências importadas.

DOM-TRAIT-1.0 apenas estabiliza o agregado sobre o qual essas regras serão implementadas.

## Não responsabilidades

DOM-TRAIT-1.0 não:

- calcula custo final;
- interpreta enhancements ou limitations;
- resolve autocontrole;
- resolve pré-requisitos;
- aplica features a atributos ou perícias;
- cria ataques derivados;
- calcula grupos alternativos;
- agrega o total de pontos do Character;
- altera DOM-TEMPLATE, Morfose ou Forma Alternativa;
- calcula na UI.

## Critério de conclusão

- `Character.traits` como autoridade canônica;
- quatro projeções históricas derivadas;
- IDs únicos entre todos os papéis;
- origem e IDs externos preservados;
- papéis desconhecidos preservados;
- imutabilidade profunda;
- compatibilidade com operações antigas;
- save/load sem perda;
- suíte integral verde.
