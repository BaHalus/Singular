# AlternateForms

**Código:** DOM-FORM-1.4  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado, operações, linker e resolvers

AlternateForms controla transformações reversíveis entre formas vinculadas a templates.

A arquitetura segue ADR-0011 a ADR-0015.

## Conceitos separados

```text
template importado
template permanentemente incorporado
vínculo entre vantagem e template
forma temporariamente ativa
estado transitório da forma
política derivada de continuidade
regras declarativas de transição por forma
```

Essa separação permite combinações como Elfo Vampiro, Orc Lich e Anão Lobisomem sem confundir templates permanentes com formas corporais momentâneas.

## AlternateFormSet

```js
{
  id: "set-body",
  name: "Formas Vampíricas",
  mechanism: "alternateForm",
  sourceTraitId: null,

  baseFormId: "form-humanoid",
  activeFormId: "form-bat",
  activeActivationId: "activation-bat",
  activeSince: "2026-06-19T12:00:00.000Z",

  statePolicy,
  statePolicyOverride,
  statePolicyResolution,

  transitionRules,

  forms: []
}
```

Somente uma forma fica ativa dentro de cada conjunto.

Conjuntos independentes podem coexistir, por exemplo Corpo e Revestimento.

`transitionRules` no conjunto contém somente padrões compartilhados.

## AlternateForm

```js
{
  id: "form-bat",
  name: "Morcego",
  templateId: "template-bat",
  sourceTraitId: "adv-forma-morcego",

  state: {},
  runtimeState: {},

  transitionRules,
  transitionRulesOverride,
  transitionRulesResolution
}
```

A forma-base normalmente usa `templateId: null`.

Cada forma alternativa conserva suas próprias regras de entrada, permanência e retorno.

## Linker

`AlternateFormsLinker` vincula vantagens Forma Alternativa a templates somente quando a relação é determinística.

Prioridade:

1. ID explícito;
2. nome explícito;
3. nome entre parênteses;
4. nome após dois-pontos;
5. notas;
6. equivalência canônica exata.

Casos ambíguos permanecem sem vínculo automático.

## Continuidade de estado

Cada campo de `statePolicy` aceita:

```text
shared
perForm
```

`shared` mantém o valor atual no Character.

`perForm` captura o estado da forma de saída e restaura o estado salvo quando ela volta a ser ativada.

A política pode controlar:

- PV atuais;
- PF atuais;
- Reserva de Energia atual;
- ferimentos;
- condições;
- efeitos;
- estado, usos e quantidade de equipamentos.

## FormStatePolicyResolver

`FormStatePolicyResolver` deriva a política a partir de:

- traits de origem;
- modificadores habilitados;
- features habilitadas;
- templates vinculados;
- regras de campanha;
- override manual.

Precedência:

```text
política-base
regras internas
regras de campanha
diretivas explícitas
override manual
```

A primeira regra interna reconhece `Dano Não-Recíproco` e deriva PV e ferimentos próprios de cada forma.

## FormTransitionRules

As regras de transição descrevem:

- tempo-base;
- passos relativos de tempo;
- manobra;
- custos;
- testes;
- requisitos;
- gatilhos;
- ativação involuntária;
- possibilidade de interrupção;
- duração;
- retorno;
- impedimentos.

O conjunto fornece defaults. A forma armazena as regras efetivas.

Isso evita vazamento entre formas:

```text
Lobo: Custa Fadiga 2
Morcego: Gatilho — Escuridão total
```

## FormTransitionRulesResolver

A resolução é feita para uma forma de destino específica:

```js
analyzeFormTransitionRules(character, setId, formId, options)
resolveFormTransitionRules(character, setId, formId, options)
applyResolvedFormTransitionRules(character, setId, formId, options)
applyResolvedFormTransitionRulesToAll(character, options)
```

O resolver analisa apenas o trait e o template daquela forma.

A forma-base não herda automaticamente os modificadores de outra forma.

Regras internas iniciais:

```text
Custa Fadiga
Gasto Adicional de Tempo
Tempo Reduzido
Gatilho
Preparação Necessária
Impedimento
Incontrolável
```

Modificadores desabilitados não produzem regras.

## Resoluções explicáveis

Tanto a política de estado quanto as regras de transição preservam:

```text
base original
resultado
fonte de cada decisão
evidências
conflitos
override manual
momento da resolução
```

Recomposições partem da base preservada. Remover ou desabilitar um modificador desfaz sua contribuição anterior.

## Regras de campanha

Regras declarativas podem filtrar por:

```text
setIds
formIds
mechanisms
modifierNames
featureTypes
traitNames
templateIds
```

As comparações são exatas após normalização de caixa e acentos.

## Transição estrutural

```text
capturar estado da forma atual
↓
remover seus componentes temporários
↓
adicionar componentes da nova forma
↓
restaurar o estado salvo
↓
atualizar a forma ativa
```

As condições declaradas em FormTransitionRules ainda não são executadas por essa operação estrutural.

## Operações principais

```js
analyzeAlternateFormLinks(character)
linkAlternateForms(character)

analyzeFormStatePolicy(character, setId, options)
resolveFormStatePolicy(character, setId, options)
applyResolvedFormStatePolicy(character, setId, options)
applyResolvedFormStatePolicies(character, options)

analyzeFormTransitionRules(character, setId, formId, options)
resolveFormTransitionRules(character, setId, formId, options)
applyResolvedFormTransitionRules(character, setId, formId, options)
applyResolvedFormTransitionRulesToAll(character, options)

activateAlternateForm(character, setId, formId)
switchAlternateForm(character, setId, formId)
deactivateAlternateForm(character, setId)
```

## Morfo

`mechanism` aceita `alternateForm` e `morph`.

A estrutura está preparada para Morfo, mas aquisição dinâmica, limites de pontos e improvisação permanecem fora do escopo.

## Não responsabilidades

AlternateForms não:

- consome custos de transformação;
- executa testes;
- verifica ambiente;
- avança tempo;
- dispara transformações involuntárias;
- calcula custo da vantagem;
- calcula máximos ou proporção de dano;
- calcula atributos, secundárias, NH, RD, carga ou ataques;
- implementa os limites de Morfo.
