# AlternateForms

**Código:** DOM-FORM-1.7  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Agregado, linker, resolvers, planner, executor e runtime

AlternateForms controla transformações reversíveis entre formas vinculadas a templates.

A arquitetura segue ADR-0011 a ADR-0018.

## Conceitos separados

```text
template importado
template permanentemente incorporado
vínculo entre vantagem e template
forma temporariamente ativa
snapshot transitório de cada forma
política derivada de continuidade
regras declarativas por forma
plano de transição
execução atômica
runtime da sessão ativa
```

Templates permanentes podem coexistir. Somente formas do mesmo conjunto são mutuamente exclusivas.

## AlternateFormSet

```js
{
  id,
  name,
  mechanism,
  sourceTraitId,

  baseFormId,
  activeFormId,
  activeActivationId,
  activeSince,
  transitionRuntime,

  statePolicy,
  statePolicyOverride,
  statePolicyResolution,

  transitionRules,
  forms,

  notes,
  tags,
  importMeta,
  raw
}
```

`transitionRuntime` acompanha apenas a sessão da forma ativa. Ele é nulo na forma-base e é substituído quando a forma muda.

Conjuntos independentes, como Corpo e Revestimento, mantêm runtimes independentes.

## AlternateForm

```js
{
  id,
  name,
  templateId,
  sourceTraitId,

  state,
  runtimeState,

  transitionRules,
  transitionRulesOverride,
  transitionRulesResolution,

  notes,
  tags,
  importMeta,
  raw
}
```

`runtimeState` é o snapshot persistente da forma quando ela fica inativa. Não deve ser confundido com `AlternateFormSet.transitionRuntime`, que acompanha relógio, manutenção e retorno da sessão atualmente ativa.

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

`statePolicy` declara `shared` ou `perForm` para:

- PV;
- PF;
- Reserva de Energia;
- ferimentos;
- condições;
- efeitos;
- equipamento.

`FormStatePolicyResolver` deriva a política de traits, modificadores, features, templates, regras de campanha e overrides.

## Regras de transição

As regras de cada forma podem declarar:

- tempo-base;
- passos relativos de tempo;
- manobra;
- custos;
- testes;
- requisitos;
- gatilhos;
- ativação involuntária;
- interrupção;
- duração;
- retorno;
- impedimentos.

O conjunto fornece defaults. A forma armazena as regras efetivas.

`FormTransitionRulesResolver` resolve cada forma separadamente, evitando vazamento entre construções diferentes.

## Planner

```js
planFormTransition(character, setId, targetFormId, context)
planFormReturn(character, setId, context)
```

Status:

```text
ready
pending
blocked
already-active
```

Uma troca entre formas alternativas possui duas fases:

```text
desativação da forma atual
+
ativação da forma de destino
```

O planner não modifica o Character.

## Executor

```js
executeFormTransition(character, plan, options)
```

O executor:

1. aceita somente plano `ready`;
2. confirma `characterId` e forma de origem;
3. replaneja com o estado atual;
4. compara a impressão digital;
5. consome custos atomicamente;
6. chama `activateAlternateForm`;
7. inicializa o runtime da forma de destino;
8. devolve Character novo, plano revalidado e recibo.

Ao retornar à forma-base, o runtime fica nulo.

## FormTransitionRuntime

O runtime mantém:

```js
{
  activationId,
  formId,
  startedAt,
  observedAt,
  elapsedSeconds,
  status,
  maintenance,
  duration,
  returnRequest
}
```

Operações:

```js
initializeFormTransitionRuntime(character, setId, options)
clearFormTransitionRuntime(character, setId, options)
evaluateFormTransitionRuntime(character, setId, context)
advanceFormTransitionRuntime(character, setId, context)
advanceAllFormTransitionRuntimes(character, context)
```

### Duração

O runtime calcula tempo decorrido e registra se a duração mínima ou máxima foi atingida.

A duração máxima prepara retorno automático ou involuntário, sem executá-lo.

### Manutenção

Custos periódicos registram intervalo, quantidade já cobrada e próxima cobrança.

Todos os intervalos vencidos são cobrados atomicamente. Repetir o avanço no mesmo instante não cobra novamente.

Quando a manutenção não pode ser paga:

- nenhum débito parcial é aplicado;
- os contadores permanecem inalterados;
- o runtime entra em `maintenance-unpaid`;
- um pedido de retorno é preparado.

### Gatilhos e retorno

Gatilhos ativos em modos `automatic` ou `involuntary` produzem `returnRequest`.

O pedido persiste até a forma mudar.

O runtime chama apenas `planFormReturn`. A transição continua dependendo do executor.

Retornos forçados por duração máxima ou manutenção não paga não dependem de um gatilho adicional configurado.

## Fluxo completo

```text
linker vincula trait e template
↓
resolvers produzem política e regras
↓
planner verifica a tentativa
↓
executor consome e troca atomicamente
↓
runtime acompanha duração e manutenção
↓
runtime detecta retorno
↓
planner prepara retorno
↓
executor realiza retorno
```

## Operação estrutural

`activateAlternateForm` continua responsável por:

```text
capturar estado da forma atual
remover componentes temporários
adicionar componentes da nova forma
restaurar snapshot da forma de destino
atualizar forma ativa
limpar runtime da sessão anterior
```

## Morfo

`mechanism` aceita `alternateForm` e `morph`.

A infraestrutura de forma, estado, transição e runtime será reutilizada por Morfo. Aquisição dinâmica, catálogo conhecido, limites de pontos e improvisação permanecem fora deste módulo.

## Não responsabilidades

O subsistema atual não:

- realiza rolagens;
- decide fatos ausentes do mundo;
- avança o relógio global da campanha;
- executa silenciosamente retornos preparados;
- agenda tarefas externas;
- persiste histórico definitivo de recibos;
- calcula atributos, secundárias, NH, RD, carga ou ataques;
- implementa os limites de Morfo.
