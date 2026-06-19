# AlternateForms

**Código:** DOM-FORM-1.6  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado, linker, resolvers, planner e executor

AlternateForms controla transformações reversíveis entre formas vinculadas a templates.

A arquitetura segue ADR-0011 a ADR-0017.

## Conceitos separados

```text
template importado
template permanentemente incorporado
vínculo entre vantagem e template
forma temporariamente ativa
estado transitório da forma
política derivada de continuidade
regras declarativas por forma
plano de transição
execução atômica
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

`FormStatePolicyResolver` deriva a política a partir de traits, modificadores, features, templates, regras de campanha e overrides.

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

## FormTransitionPlanner

O planner responde se a transição pode ocorrer agora, sem alterar o Character:

```js
planFormTransition(character, setId, targetFormId, context)
planFormReturn(character, setId, context)
```

Status possíveis:

```text
ready
pending
blocked
already-active
```

Uma troca entre formas alternativas é planejada como:

```text
desativação da forma atual
+
ativação da forma de destino
```

Custos da mesma reserva são agregados antes da verificação.

Informação desconhecida produz `pending`. Falha confirmada produz `blocked`.

## FormTransitionExecutor

O executor recebe apenas um plano `ready`:

```js
executeFormTransition(character, plan, options)
```

Antes de modificar qualquer estado ele:

1. valida o contrato do plano;
2. confirma que a forma de origem ainda está ativa;
3. replaneja com o Character e contexto atuais;
4. compara a impressão digital das regras;
5. prepara o consumo dos recursos;
6. chama `activateAlternateForm`.

A operação é atômica e imutável.

Se a ativação falhar, o Character original permanece intacto e nenhum débito parcial é retornado.

Uma execução bem-sucedida retorna:

```js
{
  character,
  plan,
  receipt
}
```

O recibo registra recursos consumidos, IDs dos custos, formas, tempo, intenção e impressão digital.

## Resoluções explicáveis

Políticas e regras preservam:

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

## Operação estrutural

`activateAlternateForm` continua responsável pela troca estrutural:

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

O executor prepara custos e revalida o plano antes de chamar essa operação.

## Operações principais

```js
analyzeAlternateFormLinks(character)
linkAlternateForms(character)

analyzeFormStatePolicy(character, setId, options)
resolveFormStatePolicy(character, setId, options)
applyResolvedFormStatePolicy(character, setId, options)

analyzeFormTransitionRules(character, setId, formId, options)
resolveFormTransitionRules(character, setId, formId, options)
applyResolvedFormTransitionRules(character, setId, formId, options)

planFormTransition(character, setId, targetFormId, context)
planFormReturn(character, setId, context)
executeFormTransition(character, plan, options)

activateAlternateForm(character, setId, formId)
switchAlternateForm(character, setId, formId)
deactivateAlternateForm(character, setId)
```

## Morfo

`mechanism` aceita `alternateForm` e `morph`.

A estrutura está preparada para Morfo, mas aquisição dinâmica, limites de pontos e improvisação permanecem fora do escopo.

## Não responsabilidades

O conjunto de serviços atual não:

- realiza rolagens;
- decide fatos ausentes do mundo;
- avança o relógio da campanha;
- agenda retorno automático;
- consome custos de manutenção;
- persiste recibos em histórico;
- calcula atributos, secundárias, NH, RD, carga ou ataques;
- implementa limites de Morfo.
