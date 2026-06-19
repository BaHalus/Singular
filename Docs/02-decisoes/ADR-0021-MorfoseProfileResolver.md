# ADR-0021 — Resolução da vantagem Morfose e de seus modificadores

**Status:** Aprovado  
**Data:** 2026-06-19

## Contexto

A fundação DOM-MORPH-1.0 criou `morphProfile`, mas ainda não vinculava esse perfil à vantagem Morfose do personagem nem interpretava seus modificadores.

A resolução precisa ser explicável, recomponível e conservadora:

- não pode escolher entre vantagens ambíguas;
- não pode aplicar modificadores desabilitados;
- não pode descartar modificadores desconhecidos;
- não pode manter efeitos antigos depois que a evidência é removida;
- deve preservar overrides manuais e regras de campanha;
- deve diferenciar limite ausente de Morfose Ilimitada.

## Decisão

A SINGULAR passa a usar:

```js
analyzeMorphProfile(character, formSetId, options)
resolveMorphProfile(character, formSetId, options)
applyResolvedMorphProfile(character, formSetId, options)
applyResolvedMorphProfiles(character, options)
```

O resolver opera apenas sobre conjuntos:

```js
mechanism: "morph"
```

## Vínculo com a vantagem

Precedência:

1. `AlternateFormSet.sourceTraitId`, quando presente e válido;
2. única vantagem cujo nome normalizado seja `Morfose`;
3. nenhuma associação quando houver zero ou múltiplas candidatas.

O resolver nunca escolhe arbitrariamente entre múltiplas vantagens Morfose.

Resultados possíveis:

```text
existing-link
unique-name-match
not-found
ambiguous
missing-explicit
mismatched-explicit
```

Quando uma resolução válida é aplicada, o `sourceTraitId` é persistido no conjunto.

## Fontes e precedência

```text
perfil-base      prioridade 0
valor importado  prioridade 50
builtin          prioridade 100
campanha         prioridade 200
explícito        prioridade 300
manual           prioridade 10000
```

Em empate de prioridade:

- valores iguais unem evidências;
- valores diferentes geram diagnóstico de conflito;
- o primeiro valor permanece, sem sobrescrita silenciosa.

## Perfil-base e recomposição

A primeira resolução preserva o perfil anterior como:

```text
morphProfileResolution.baseProfile
```

Resoluções posteriores sempre recomeçam desse perfil-base.

Assim, remover ou desabilitar um modificador remove também sua contribuição anterior.

## Limite de pontos

O perfil passa a distinguir:

```text
undeclared
limited
unlimited
```

Estrutura:

```js
{
  pointLimitMode,
  pointLimit,
  pointLimitSource
}
```

Regras estruturais:

- `limited` exige um número não negativo;
- `undeclared` usa `pointLimit: null`;
- `unlimited` usa `pointLimit: null`;
- `null` deixa de significar simultaneamente “não informado” e “ilimitado”.

## Modificadores builtin reconhecidos

Com efeito direto no perfil:

```text
Ilimitada / Unlimited
Formas Improvisadas / Improvised Forms
Cósmica (Para Formas Improvisadas) / Cosmic (For Improvised Forms)
Não Exige Memorização / No Memorization Required
Incapaz de Memorizar Formas / Cannot Memorize Forms
```

Reconhecidos como evidência estrutural, mas sem efeito mecânico inventado nesta etapa:

```text
Cosmética / Cosmetic
Mantém a Forma / Retains Shape
Conservação da Massa / Mass Conservation
Mudança Ativa / Active Change
Imperfeita / Imperfect
Somente Formas Não-Vivas / Only Nonliving Forms
```

Esses modificadores permanecem em `recognizedModifiers`, mesmo quando ainda não há campo correspondente no perfil.

## Modificadores desabilitados

Um modificador é ignorado mecanicamente quando:

```js
disabled === true
```

ou:

```js
enabled === false
```

Ele continua aparecendo em `ignoredModifiers` para auditoria.

## Modificadores desconhecidos

Modificadores ativos sem regra builtin nem diretiva explícita são preservados em:

```text
unresolvedModifiers
```

Nenhum efeito é inventado.

## Diretivas explícitas

Dados importados ou autorais podem declarar:

```js
{
  morphProfile: { ... }
}
```

ou:

```js
{
  morph_profile: { ... }
}
```

A diretiva pode existir diretamente em trait, modificador, feature ou `raw`.

## Regras de campanha

Uma regra pode selecionar por:

```text
setId
sourceTraitId
traitName
modifierName
```

E declarar:

```js
{
  morphProfile: { ... }
}
```

Regras desabilitadas não participam da resolução.

## Override manual

O override manual possui precedência final e é persistido em:

```text
AlternateFormSet.morphProfileOverride
```

A explicação completa fica em:

```text
AlternateFormSet.morphProfileResolution
```

## Diagnósticos

Diagnósticos iniciais:

```text
source-trait-not-found
source-trait-ambiguous
source-trait-missing
source-trait-mismatch
conflict
incompatible-modifiers
```

A combinação `Cosmética` + `Imperfeita` é registrada como incompatível, sem remover automaticamente nenhum modificador.

## Serialização

São persistidos:

- perfil resolvido;
- perfil-base;
- vínculo da vantagem;
- decisões por campo;
- evidências;
- modificadores reconhecidos;
- modificadores ignorados;
- modificadores não resolvidos;
- diagnósticos;
- override manual;
- instante da resolução.

## Não responsabilidades

DOM-MORPH-1.1 não:

- calcula custo da vantagem;
- confirma regras ainda não verificadas no livro;
- seleciona uma forma conhecida;
- materializa template;
- aprende ou esquece formas automaticamente;
- executa testes de transformação;
- interpreta modificadores desconhecidos por aproximação textual.
