# ADR-0046 — Progressão treinada de Skills

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-SKILL-1.5

## Contexto

A ADR-0045 definiu o Skill Mechanics Engine como autoridade exclusiva para NH, defaults, limites de técnicas e diagnósticos. A primeira entrega executável do motor foi o contrato portátil `SkillMechanicsResult`.

A próxima etapa precisa calcular apenas perícias treinadas, sem antecipar defaults, Techniques, modificadores externos ou leitura direta do `Character`.

## Decisão

Será criado um resolvedor puro de perícia treinada.

Entrada conceitual:

```js
{
  skill,
  attributeLevel
}
```

Saída:

```js
SkillMechanicsResult
```

O resolvedor:

- valida a estrutura da Skill pela autoridade existente;
- recebe explicitamente o nível do atributo-base;
- calcula NH relativo a partir de dificuldade e pontos;
- soma o NH relativo ao nível do atributo-base;
- registra base `trained` e o atributo declarado;
- compara, sem promover a autoridade, valores importados existentes;
- produz diagnósticos bloqueantes ou de divergência;
- não altera a Skill recebida.

## Dificuldades canônicas

O motor aceita apenas os códigos mecânicos canônicos:

| Código | Dificuldade | NH relativo com 1 ponto |
|---|---|---:|
| `E` | Easy / Fácil | Atributo +0 |
| `A` | Average / Média | Atributo −1 |
| `H` | Hard / Difícil | Atributo −2 |
| `VH` | Very Hard / Muito Difícil | Atributo −3 |

Rótulos traduzidos pertencem à apresentação. O motor não aceita `F`, `M`, `D` ou `MD` como códigos mecânicos.

## Progressão por pontos

A progressão treinada usa os seguintes patamares:

| Pontos investidos | Avanço sobre o patamar de 1 ponto |
|---:|---:|
| 1 | +0 |
| 2–3 | +1 |
| 4–7 | +2 |
| 8–11 | +3 |
| 12–15 | +4 |
| cada +4 pontos | +1 adicional |

Exemplos:

| Dificuldade | 1 ponto | 2 pontos | 4 pontos | 8 pontos |
|---|---:|---:|---:|---:|
| `E` | A+0 | A+1 | A+2 | A+3 |
| `A` | A−1 | A+0 | A+1 | A+2 |
| `H` | A−2 | A−1 | A+0 | A+1 |
| `VH` | A−3 | A−2 | A−1 | A+0 |

Pontos intermediários continuam investidos, mas não elevam o NH até alcançar o próximo patamar.

## Entradas bloqueantes

A resolução retorna `blocked`, sem NH, quando ocorrer qualquer uma destas condições:

- Skill sem atributo-base declarado;
- dificuldade ausente ou não suportada;
- pontos iguais a zero;
- pontos negativos, fracionários ou não finitos;
- nível do atributo-base ausente ou não finito.

Zero pontos significa que a perícia não possui nível treinado. Defaults serão tratados em etapa posterior.

## Valores importados

`importedLevel` e `importedRelativeLevel` continuam sendo evidências externas.

Quando divergirem do resultado calculado, o motor adiciona diagnósticos de aviso com os valores importado e calculado. A divergência não substitui o cálculo soberano nem bloqueia um resultado treinado válido.

## Fora de escopo

- resolução de defaults;
- escolha entre nível treinado e default;
- Techniques e seus limites;
- modificadores provenientes de Traits, equipamentos ou outras fontes;
- cálculo do valor do atributo a partir do `Character`;
- contribuição para Point Ledger;
- cache persistente de NH;
- apresentação localizada de dificuldade.

## Alternativas rejeitadas

### Receber o Character inteiro

Rejeitada porque aumentaria acoplamento e permitiria que esta etapa assumisse resolução de atributos, modificadores e referências ainda não contratados.

### Aceitar rótulos localizados como códigos

Rejeitada porque misturaria apresentação com mecânica e criaria múltiplas identidades para a mesma dificuldade.

### Usar nível importado como fallback

Rejeitada porque transformaria evidência externa em autoridade mecânica silenciosa.

### Arredondar pontos fracionários

Rejeitada porque inventaria política não declarada. Pontos mecânicos de Skill devem ser inteiros nesta etapa.

## Invariantes

1. O resolvedor é puro e determinístico.
2. A Skill recebida não é alterada.
3. O nível do atributo-base é entrada explícita.
4. A dificuldade mecânica usa apenas `E`, `A`, `H` e `VH`.
5. Zero pontos não produz nível treinado.
6. Valores importados são comparados, nunca promovidos.
7. O resultado usa exclusivamente `SkillMechanicsResult`.
8. Defaults, Techniques e modificadores permanecem fechados.
9. O Character não recebe NH persistido.
10. A UI não calcula nem traduz códigos dentro do motor.
