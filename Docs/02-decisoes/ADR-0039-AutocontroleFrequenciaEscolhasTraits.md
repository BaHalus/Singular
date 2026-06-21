# ADR-0039 — Autocontrole, frequência, escolhas e custo individual de Traits

**Status:** Aceito  
**Data:** 2026-06-21  
**Bloco:** DOM-TRAIT-1.4

## Contexto

DOM-TRAIT-1.3 passou a interpretar adições, percentuais e multiplicadores declarados em `Trait.modifiers`, mas encerrou deliberadamente sua responsabilidade antes de autocontrole, frequência de aparição, escolhas explícitas e autoridade final persistida.

O formato GCS declara:

```text
cr            → teste de autocontrole
cr_adj        → consequência operacional do teste
frequency     → frequência de aparição
round_down    → direção do arredondamento final
replacements  → escolhas explícitas por chave
```

Sem autoridades próprias, consumidores poderiam repetir tabelas de multiplicadores, arredondar em momentos diferentes ou associar escolhas por nome e posição.

## Decisão

### Controles declarativos no agregado

Cada `Trait` passa a declarar estruturas canônicas para:

```text
selfControl
frequency
roundCostDown
choices
```

Aliases externos são consumidos apenas na fronteira de criação/importação. Eles não formam um segundo schema persistente.

### Autocontrole

`TraitControl` reconhece os testes:

```text
0, 1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
```

com os multiplicadores usados pelo GCS:

```text
1, 2.5, 2, 1.83, 1.67, 1.5, 1.33, 1.17, 1, 0.83, 0.67, 0.5
```

O teste `1` representa ausência de resistência. Valores não reconhecidos são preservados com estado `unsupported`; não recebem aproximação.

### Ajustes de autocontrole

`cr_adj` descreve consequências operacionais, como penalidade de ação, reação, teste de pânico ou aumento de custo de vida.

Esses ajustes são derivados e preservados, mas não alteram o custo em pontos. Portanto, um ajuste operacional desconhecido não impede o cálculo de pontos quando o teste de autocontrole e seu multiplicador são conhecidos.

```text
incerteza operacional ≠ incerteza de custo
```

### Frequência

`TraitControl` reconhece:

```text
0, 6, 9, 12, 15, 18
```

com multiplicadores:

```text
1, 0.5, 1, 2, 3, 4
```

Valor desconhecido bloqueia o custo individual com estado `unsupported`.

### Escolhas explícitas

`Trait.choices` é uma coleção canônica de declarações identificadas por `key`:

```js
{
  key,
  value,
  required,
}
```

A chave é identidade. Nome do Trait, rótulo visual e posição não são usados para associar escolhas.

O mapa externo `replacements` é convertido na fronteira para escolhas explícitas. Valores estruturados desconhecidos são rejeitados em vez de receber semântica inventada.

Uma escolha obrigatória sem valor produz avaliação `incomplete`, mas não cria por si só uma fórmula de custo. Esta etapa preserva a decisão para os domínios que efetivamente a consumirem.

### Custo individual final

`TraitFinalCost` compõe as autoridades anteriores na ordem:

```text
1. TraitBaseCost
2. TraitModifierCost sem arredondamento intermediário
3. multiplicador de autocontrole
4. multiplicador de frequência
5. arredondamento final declarado por roundCostDown
```

O resultado é puro, imutável e explicável. Cada parcela, multiplicador e diferença de arredondamento permanece disponível para auditoria.

### Arredondamento

O arredondamento ocorre exatamente uma vez, após todos os multiplicadores:

- `roundCostDown: false` usa direção positiva: positivos para cima, negativos em direção a zero;
- `roundCostDown: true` usa direção negativa: positivos para baixo, negativos para o inteiro inferior.

`TraitModifierCost` é invocado com política `none` dentro desta composição.

### Autoridade persistida

DOM-TRAIT-1.4 não grava o custo individual em `pointValue.calculatedPoints`.

Ainda falta a regra entre Traits para grupos de habilidades alternativas. Promover o custo individual antes dessa etapa criaria uma autoridade final prematura e possivelmente divergente.

```text
custo individual completo ≠ contribuição final do grupo
```

A aplicação persistente será definida junto da autoridade de grupos e reconciliação final.

## Consequências

- tabelas de autocontrole e frequência pertencem ao domínio, não à UI;
- importação preserva declarações GCS sem calcular;
- não há arredondamento intermediário;
- ajustes operacionais não contaminam a matemática de pontos;
- escolhas possuem identidade explícita e estável;
- valores desconhecidos são preservados ou bloqueados conforme sua relevância mecânica;
- grupos alternativos permanecem fora deste bloco;
- nenhuma coleção ou pipeline paralelo é criado.

## Não responsabilidades

DOM-TRAIT-1.4 não:

- calcula a contribuição de grupos alternativos;
- escolhe uma habilidade primária de grupo por heurística;
- grava custo final em `pointValue.calculatedPoints`;
- agrega pontos no Character;
- interpreta escolhas específicas de poderes, perícias ou templates;
- calcula na UI;
- altera DOM-TEMPLATE, Morfose ou Forma Alternativa.

## Critérios de aceitação

- todos os testes e multiplicadores conhecidos de autocontrole cobertos;
- todos os testes e multiplicadores conhecidos de frequência cobertos;
- ajustes operacionais derivados sem afetar pontos;
- escolhas explícitas por chave, com obrigatoriedade auditável;
- aliases GCS consumidos somente na fronteira;
- custo individual composto sem arredondamento intermediário;
- arredondamento final coerente para valores positivos e negativos;
- estados incompleto, conflito e não suportado propagados;
- compatibilidade histórica preservada quando os novos campos estão ausentes;
- suíte integral e CI canônica verdes.
