# ADR-0041 — Point Ledger soberano e derivado

**Status:** Aprovado  
**Data:** 2026-06-22  
**Bloco:** DOM-POINTS-1.0

## Contexto

Após o fechamento de DOM-TRAIT, o Character passou a possuir uma autoridade final de custo para Traits. Os demais domínios ainda amadurecerão em etapas próprias.

Era necessário criar uma visão total de pontos sem:

- mover cálculos mecânicos para um agregador central;
- somar valores incompletos como se fossem definitivos;
- apagar diferenças entre declaração, importação e cálculo;
- contar Templates duas vezes;
- tornar a UI responsável por compor totais.

## Decisão

### Ledger derivado

O Point Ledger será uma projeção derivada do Character.

```js
evaluateCharacterPointLedger(character)
```

recalcula o estado atual, mas o ledger não é persistido.

A autoridade persistente do orçamento será:

```text
Character.pointBudget
```

### Protocolo por domínio

Cada domínio proprietário entrega um `PointDomainReport` composto por `PointContribution`.

O agregador:

- valida identidades;
- soma contribuições prontas;
- preserva contribuições pendentes ou não suportadas;
- calcula totais completos somente quando todos os domínios obrigatórios estiverem completos;
- produz diagnósticos e discrepâncias.

Ele não reproduz regras internas dos domínios.

### Estados incompletos

```text
knownSpentPoints
```

pode existir mesmo quando o gasto total ainda não estiver completo.

```text
totalSpentPoints
```

permanece `null` enquanto houver domínio obrigatório incompleto.

Contribuição `unsupported` possui precedência sobre `partial` e bloqueia o ledger. Isso evita que uma impossibilidade mecânica seja apresentada apenas como dado pendente.

### Orçamento e reconciliação

O orçamento preserva independentemente:

```text
declaredPoints
importedPoints
importedUnspentPoints
```

Estados:

```text
unknown
declared-only
imported-only
reconciled
divergent
conflict
```

`effectivePoints` só é produzido quando não existe divergência.

Campos vazios ou contendo apenas espaços significam ausência, não zero.

### Templates

Templates não geram contribuição direta ao gasto total.

Aplicações de Template materializam componentes nos domínios proprietários. Somar também o custo do Template causaria dupla contagem.

Valores de catálogo continuam disponíveis como discrepâncias informativas.

### Equipamento

Equipamento não consome pontos de personagem e será explicitamente excluído.

### Traits

Traits entram por sua autoridade já fechada:

```text
Trait.pointValue.finalCostAuthority
Trait.pointValue.calculatedPoints
```

O ledger não recalcula modificadores, autocontrole, frequência ou grupos alternativos.

### Domínios ainda sem autoridade

Atributos, características secundárias, perícias, técnicas, magia, idiomas, cultura e Poderes produzem estados pendentes quando possuem conteúdo ainda não calculável.

Coleções vazias podem ser consideradas completas com custo zero.

### Importação

O orçamento importado do GCS preserva todas as candidatas conhecidas e seus caminhos.

Candidatas divergentes produzem conflito; o importador não escolhe silenciosamente uma delas.

## Consequências

- o total nunca parece completo quando há custos desconhecidos;
- domínios podem ser integrados progressivamente sem alterar a arquitetura do ledger;
- valores conhecidos permanecem úteis durante estados parciais;
- discrepâncias ficam auditáveis;
- Templates não são contados duas vezes;
- a UI permanece passiva;
- save/load persiste apenas o orçamento e as autoridades proprietárias, não a projeção derivada.

## Alternativas rejeitadas

### Somar diretamente campos `points` do Character

Rejeitado porque mistura declarações, importações, cálculos e campos ainda não soberanos.

### Persistir o ledger no Character

Rejeitado porque criaria estado derivado obsoleto e exigiria sincronização paralela.

### Considerar valores importados como custo final

Rejeitado porque importação é evidência, não autoridade mecânica universal.

### Somar o custo do Template

Rejeitado porque aplicações já materializam seus componentes, causando dupla contagem.

### Tratar `unsupported` como simples pendência

Rejeitado porque esconde uma lacuna de suporte que impede cálculo confiável.

### Resolver divergências automaticamente

Rejeitado porque o domínio não possui autorização para escolher entre fontes conflitantes.

## Invariantes

1. Cada domínio calcula apenas suas próprias regras.
2. O ledger agrega somente contribuições autorizadas.
3. Contribuições prontas, pendentes e não suportadas permanecem distintas.
4. `knownSpentPoints` não implica `totalSpentPoints`.
5. Domínio obrigatório com contribuição não suportada bloqueia o ledger.
6. Divergência de orçamento não produz `effectivePoints`.
7. Campo vazio não equivale a zero.
8. Templates e equipamentos não entram diretamente no gasto total.
9. O ledger derivado não é persistido.
10. A UI não calcula.
11. Novos domínios integram-se pelo protocolo de relatórios e contribuições.
12. Nenhuma autoridade fechada de Traits, Templates, Morfose ou Forma Alternativa é reaberta.
