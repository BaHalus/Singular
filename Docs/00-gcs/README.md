# Índice mestre — engenharia reversa do GCS

Status dos documentos:

- [ ] Não iniciado
- [~] Em análise
- [x] Consolidado

## Critério de evidência

- **Confirmada:** comportamento observado diretamente na implementação citada.
- **Indicação:** evidência observada aponta para o comportamento, mas a implementação necessária para fechar a conclusão ainda não foi integralmente rastreada.
- **Não confirmada:** questão explicitamente mantida em aberto; não deve ser tratada como comportamento do GCS.

Toda conclusão deve preservar rastreabilidade para arquivo e tipo, método ou função do código-fonte. Ausência de evidência observada não é preenchida por inferência.

## Dependências

- `GCS-Character.md` é a base estrutural para todos os demais documentos.
- `GCS-Traits.md` depende de `GCS-Character.md` e alimenta a investigação de modificadores, features e bônus.
- `GCS-Trait-Modifiers.md` registra a estrutura e semântica diretamente confirmadas de `TraitModifier`.
- `GCS-Trait-Pricing.md` registra o pipeline de custo confirmado de Traits e referencia `TraitModifier` sem duplicar sua estrutura completa.
- `GCS-Skills.md` e `GCS-Spells.md` dependem de `GCS-Character.md` e do pipeline de recálculo.
- `GCS-Equipment.md` depende de `GCS-Character.md` e da investigação de features.
- `GCS-Construction.md`, `GCS-Pricing.md` e `GCS-Importer.md` dependem de múltiplos documentos estruturais.

## Ordem de análise

1. `GCS-Character.md`
2. `GCS-Traits.md`
3. `GCS-Trait-Modifiers.md`
4. `GCS-Trait-Pricing.md`
5. `GCS-Modifiers.md`
6. `GCS-Features.md`
7. `GCS-Bonuses.md`
8. `GCS-Construction.md`
9. `GCS-Pricing.md`
10. `GCS-Templates.md`
11. `GCS-Skills.md`
12. `GCS-Spells.md`
13. `GCS-Equipment.md`
14. `GCS-Importer.md`

## Questões abertas coordenadas

- **Não confirmada:** efeitos posteriores das `Features` de `TraitModifier` além dos pontos já rastreados no fluxo de coleta da `Entity`.

## Questões encerradas por evidência posterior

- **Confirmada:** multiplicadores de `selfctrl.Roll` e `frequency.Roll`, documentados em `GCS-Trait-Pricing.md` a partir de `model/gurps/enums/selfctrl/roll.go` e `model/gurps/enums/frequency/frequency.go`.
- **Confirmada:** classificação e extração de `TraitModifier.CostAdj` por `emweight.ValueFromString()` e `Value.ExtractFraction()`, observadas em `model/gurps/enums/emweight/value.go`; a consolidação detalhada permanece em `GCS-Trait-Pricing.md`.
