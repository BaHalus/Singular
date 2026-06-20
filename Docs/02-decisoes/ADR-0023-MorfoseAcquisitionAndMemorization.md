# ADR-0023 — Aquisição e memorização de formas de Morfose

**Status:** Aprovado  
**Data:** 2026-06-20

## Contexto

DOM-MORPH-1.0 criou o perfil e o catálogo de Morfose. DOM-MORPH-1.1 resolveu a vantagem e seus modificadores. DOM-MORPH-1.2 projetou uma entrada conhecida em Forma Alternativa sem duplicar planner, executor ou runtime.

Faltava modelar como uma forma é observada, memorizada, retida, esquecida, restaurada ou substituída. A implementação anterior possuía mutadores diretos, mas não tinha plano revalidável, recibo persistente nem distinção suficiente entre os modificadores **Não Exige Memorização** e **Incapaz de Memorizar Formas**.

As fontes normativas consultadas foram o GURPS Módulo Básico: Personagens, o GURPS Poderes e a biblioteca de vantagens importada pelo projeto.

## Fatos de GURPS modelados

Para Morfose padrão:

- ver ou tocar a criatura permite copiar sua forma enquanto o original está presente;
- conservar a forma para uso posterior exige um minuto de concentração;
- o número de formas memorizadas é igual à IQ;
- quando todos os espaços estão ocupados, uma forma anterior deve ser escolhida explicitamente para substituição.

Modificadores:

- **Não Exige Memorização:** uma forma assumida entra imediatamente no repertório, salvo escolha explícita em contrário;
- **Incapaz de Memorizar Formas:** nenhuma forma copiada pode ser conservada; o original precisa estar presente em cada uso.

Observação e memorização são eventos diferentes. Observar não implica, por si só, aquisição persistente.

## Decisão

O catálogo existente em `MorphProfile.knownForms` continua sendo a única autoridade de estado. Não será criado um segundo catálogo nem event sourcing.

O fluxo público é:

```text
análise
→ plano efêmero
→ revalidação
→ execução explícita e atômica
→ recibo persistente
```

Operações:

```text
acquire-form
observe-form
memorize-form
forget-form
restore-form
set-availability
replace-memorized-form
```

As operações administrativas de importação ou edição manual continuam disponíveis, mas não são confundidas com o procedimento em jogo de observar e memorizar.

## Política efetiva de memorização

O schema declara:

```js
memorization: {
  mode,
  capacity,
  capacityBasis,
  durationSeconds
}
```

`capacityBasis`:

```text
unknown
fixed
iq
unlimited
notApplicable
```

A capacidade baseada em IQ é calculada pelo motor a partir do atributo efetivo. Ela não é gravada como se fosse um fato importado.

Os dois modificadores deixam de ser tratados como sinônimos:

```text
Não Exige Memorização
→ retenção automática
→ capacidade ilimitada
→ duração 0

Incapaz de Memorizar Formas
→ retenção proibida
→ capacidade não aplicável
```

O resolver continua sendo a autoridade que reconhece modificadores. A política de operação consome os IDs reconhecidos; não cria outro vínculo por nome.

## Forma conhecida

Uma entrada persiste:

```js
{
  id,
  templateId,
  externalIds,
  name,
  acquisitionMethod,
  acquiredAt,
  memorizedAt,
  lastObservedAt,
  state,
  notes,
  tags,
  importMeta,
  raw
}
```

Referências externas não resolvidas permanecem com `templateId: null`. Nenhuma ligação por nome é inventada.

## Capacidade e substituição

Capacidade desconhecida permanece desconhecida.

Catálogo cheio não escolhe automaticamente uma vítima. O plano fica pendente até receber `replacementKnownFormId` explícito.

A substituição é atômica:

1. revalida catálogo, política e forma escolhida;
2. marca a forma anterior como `forgotten`;
3. acrescenta a nova forma;
4. grava um único recibo `form-replaced`.

A entrada substituída não é apagada. Proveniência e histórico permanecem disponíveis.

## Forma ativa

Uma forma conhecida atualmente ativa não pode ser esquecida nem substituída no meio da sessão. Isso preserva a coerência entre catálogo, materialização e runtime.

## Concorrência e atomicidade

O plano contém um fingerprint da forma ativa, catálogo conhecido, política declarada e modificadores reconhecidos. Na execução, qualquer alteração torna o plano obsoleto. Falha, pendência ou bloqueio não altera o `Character` original e não grava histórico.

## Histórico

Cada `MorphProfile` possui `catalogHistory`, uma trilha append-only. O estado atual continua em `knownForms`.

Eventos:

```text
form-acquired
form-observed
form-memorized
form-forgotten
form-restored
form-availability-changed
form-replaced
```

## Recomposição

Operações de catálogo sincronizam apenas `knownForms` e `catalogHistory` no `baseProfile` persistido da resolução. Assim, uma recomposição posterior remove contribuições antigas de modificadores, mas não apaga formas adquiridas depois da resolução.

## Consequências

- aquisição não ocorre silenciosamente;
- observação transitória pode ser registrada sem virar forma conhecida;
- memorização padrão respeita tempo e espaços por IQ;
- substituição exige escolha explícita;
- planos obsoletos são rejeitados;
- falhas são atômicas;
- save/load preserva repertório e histórico;
- DOM-FORM continua sendo reutilizado integralmente;
- limite em pontos permanece reservado ao DOM-MORPH-1.5;
- improvisação permanece reservada ao DOM-MORPH-1.4.
