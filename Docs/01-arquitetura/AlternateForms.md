# AlternateForms

**Código:** DOM-FORM-1.8  
**Status:** Fechado  
**Camada:** Domain  
**Tipo:** Subsistema completo de Forma Alternativa

AlternateForms controla transformações reversíveis entre formas vinculadas a templates. A arquitetura segue ADR-0011 a ADR-0019.

## Estrutura

```text
Character
├── AlternateFormSets
│   ├── formas e forma-base
│   ├── forma ativa
│   ├── política de continuidade
│   ├── regras de transição
│   ├── runtime da sessão ativa
│   └── perfil de Morfose, somente em mechanism: "morph"
└── FormTransitionHistory
```

Templates permanentes podem coexistir. Somente formas do mesmo conjunto são mutuamente exclusivas. Conjuntos como Corpo e Revestimento permanecem independentes.

## Fluxo

```text
linker vincula trait e template
↓
resolvers produzem política e regras
↓
planner verifica tentativa
↓
executor consome e ativa atomicamente
↓
runtime acompanha duração e manutenção
↓
runtime registra eventos e pede retorno
↓
planner prepara retorno
↓
chamador autoriza execução
↓
executor retorna à forma indicada
↓
histórico preserva o ciclo
```

## Componentes

### AlternateFormsLinker

Cria vínculos apenas quando a relação entre trait e template é determinística. Ambiguidades não são adivinhadas.

### FormStatePolicyResolver

Resolve `shared` ou `perForm` para PV, PF, Reserva de Energia, ferimentos, condições, efeitos e equipamento.

### FormTransitionRulesResolver

Resolve tempo, manobra, custos, testes, requisitos, gatilhos, duração, retorno e impedimentos por forma, sem vazamento entre formas diferentes.

### FormTransitionPlanner

```js
planFormTransition(character, setId, targetFormId, context)
planFormReturn(character, setId, context)
```

Produz `ready`, `pending`, `blocked` ou `already-active` sem modificar o Character.

### FormTransitionExecutor

```js
executeFormTransition(character, plan, options)
```

Revalida, consome custos, troca a forma, inicializa ou limpa runtime e persiste recibo. Falhas não alteram o Character original.

### FormTransitionRuntime

Acompanha relógio, duração, manutenção, gatilhos e pedido de retorno. Prepara retorno, mas não o executa silenciosamente.

### FormTransitionHistory

Persiste:

```text
transition-executed
maintenance-charged
maintenance-unpaid
return-requested
```

### FormLifecycle

```js
advanceFormLifecycle(character, setId, context, options)
advanceAllFormLifecycles(character, context, options)
```

Por padrão apenas prepara retornos. Execução exige `executeReadyReturn: true` ou `executeReadyReturns: true`.

## Invariantes finais

- forma-base não possui runtime;
- runtime referencia a forma ativa;
- IDs são únicos;
- templates permanentes não são removidos por troca temporária;
- planos pertencem ao Character que os criou;
- somente planos prontos são executados;
- custos são atômicos;
- mudança de forma limpa runtime anterior;
- histórico pertence ao Character;
- recibos sobrevivem à serialização.

## Morfose

A vantagem **Morfose** reutiliza esta infraestrutura por meio de:

```js
mechanism: "morph"
```

O nome visível e documental é Morfose. O identificador técnico permanece `morph`.

Aquisição dinâmica, catálogo conhecido, memorização, improvisação e limites declarados pertencem à frente DOM-MORPH e não reabrem o subsistema já fechado de Forma Alternativa.

`Metamorfose` é uma entrada distinta e não é tratada como sinônimo automático.

## Status final

```text
DOM-FORM-1.0 a DOM-FORM-1.8: concluídos
Forma Alternativa: fechada
Morfose: infraestrutura compartilhada pronta; domínio próprio iniciado em DOM-MORPH-1.0
```
