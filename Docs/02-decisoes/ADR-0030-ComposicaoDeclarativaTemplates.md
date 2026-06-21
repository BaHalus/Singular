# ADR-0030 — Composição declarativa de Templates

**Status:** Aprovado  
**Data:** 2026-06-20  
**Bloco:** DOM-TEMPLATE-1.1

## Contexto

DOM-TEMPLATE-1.0 estabeleceu `Template.entries` como autoridade única para contribuições conhecidas e desconhecidas. O próximo passo precisa permitir que um pacote declare efeitos sobre atributos, características secundárias, traits, perícias, técnicas, idiomas, culturas, equipamentos, outros templates e regras especiais.

Essa expansão não pode:

- transferir cálculos para Templates;
- duplicar os futuros domínios proprietários;
- introduzir outra coleção persistente de contribuições;
- inferir referências por nome;
- resolver dependências antes do DOM-TEMPLATE-1.2;
- quebrar snapshots inline importados;
- alterar Forma Alternativa ou Morfose.

## Decisão

### `entries` permanece soberano

Nenhuma coleção de composição será persistida ao lado de `Template.entries`.

```text
Template.entries
→ classificação declarativa derivada
→ interpretação futura pelo domínio proprietário
```

### Domínios abertos

A SINGULAR padroniza inicialmente:

```text
attribute
secondaryCharacteristic
trait
skill
magic
language
culture
equipment
template
rule
unknown
```

O vocabulário permanece extensível. Domínios desconhecidos são preservados em vez de rejeitados.

### Referências explícitas

Contribuições que apontam para outra identidade usam `referenceId`.

```js
{
  domain: "skill",
  entryType: "skillReference",
  referenceId: "skill:bow",
  payload: {
    points: 2,
  },
}
```

Nunca serão usadas como autoridade de vínculo:

```text
nome
posição
índice
ordem
texto do payload
```

Tipos de referência conhecidos exigem `referenceId` não vazio.

### Declarações inline

Os snapshots já importados permanecem declarações inline válidas. Eles são compatibilidade estrutural e dados declarativos, não uma segunda autoridade.

### Regras especiais

Regras especiais usam o domínio `rule` e payload opaco. Templates preserva a declaração, mas não a executa.

### Projeção derivada

`createTemplateComposition(template)` produz uma projeção imutável com:

- agrupamento por domínio;
- referências explícitas;
- entradas inline;
- regras especiais;
- entradas opacas.

Cada entrada é classificada exatamente uma vez. A projeção não é persistida e pode ser reconstruída após save/load.

### Ausência de resolução

DOM-TEMPLATE-1.1 permite declarar inclusive:

- referência ausente;
- autorreferência;
- possível ciclo;
- relação desconhecida;
- payload de módulo ainda não implementado.

A existência dos alvos, os ciclos, a ordem, os conflitos e a explicação de dependências pertencem ao DOM-TEMPLATE-1.2.

### Ausência de cálculo

O domínio proprietário continua soberano:

```text
atributos → autoridade futura de atributos
traits → DOM-TRAIT
perícias e técnicas → DOM-SKILL
idiomas e culturas → seus domínios
itens → DOM-EQUIPMENT
pontos → DOM-POINTS
```

Template não interpreta `operation`, `amount`, `points`, fórmulas ou parâmetros de regras.

## Consequências

- Templates pode representar pacotes completos sem conhecer as fórmulas de cada domínio;
- referências são auditáveis e independentes de nomes;
- importações atuais continuam válidas como snapshots inline;
- módulos futuros podem introduzir novos domínios;
- a composição pode ser inspecionada sem ser executada;
- save/load continua baseado somente em `entries`;
- DOM-TEMPLATE-1.2 recebe uma base explícita para resolver grafos;
- Forma Alternativa e Morfose permanecem congeladas.

## Invariantes

1. `entries` é a única autoridade persistente.
2. Cada contribuição possui identidade própria.
3. Referência conhecida exige `referenceId` explícito.
4. Nomes nunca resolvem vínculos.
5. Toda entrada aparece em exatamente um domínio da projeção.
6. Toda entrada recebe exatamente uma classificação.
7. Payloads permanecem inalterados pelo compositor.
8. Entradas desconhecidas permanecem opacas e preservadas.
9. A projeção é imutável e reconstruível.
10. Nenhum cálculo ocorre em TemplateComposition.

## Alternativas rejeitadas

### Coleções separadas por domínio no Template

Rejeitada porque restauraria autoridades paralelas e repetiria o problema encerrado no DOM-TEMPLATE-1.0.

### Interpretar modificadores de atributos neste bloco

Rejeitada porque duplicaria fórmulas e regras pertencentes aos domínios proprietários.

### Resolver referências durante a criação do Template

Rejeitada porque impediria importações parciais, dados externos não resolvidos e diagnóstico completo do grafo no bloco seguinte.

### Inferir referências por nome

Rejeitada por ambiguidade, instabilidade em renomeações e violação da política de IDs.

## Continuidade

```text
DOM-TEMPLATE-1.2 — Dependências e composição
```
