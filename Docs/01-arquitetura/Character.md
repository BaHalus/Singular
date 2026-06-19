# Character

**Código:** DOM-CHAR-1.11  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Aggregate Root

Character é o Aggregate Root da SINGULAR e a unidade fundamental de persistência, serialização e manipulação de um personagem.

## Responsabilidades

Character mantém:

- identidade;
- atributos, secundárias e pools;
- estado transitório;
- traits;
- perícias, técnicas, mágicas e poderes;
- equipamentos e ataques;
- idiomas e familiaridades;
- templates importados;
- histórico de incorporações permanentes;
- conjuntos de formas;
- perfis, catálogos, overrides e resoluções de Morfose;
- formas conhecidas materializadas e sua proveniência;
- snapshots das formas inativas;
- políticas de continuidade;
- regras declarativas por forma;
- runtime da forma ativa;
- histórico persistente do ciclo de formas;
- metadados.

Character garante invariantes estruturais, mas não executa regras de GURPS.

## Composição

```text
Character
├── Identity
├── Attributes
├── SecondaryCharacteristics
├── Pools
├── State
├── Advantages
├── Perks
├── Disadvantages
├── Quirks
├── Skills
├── Techniques
├── Spells
├── Powers
├── Equipment
├── Attacks
├── Languages
├── Familiarities
├── Templates
├── TemplateApplications
├── AlternateFormSets
│   └── quando mechanism: "morph"
│       ├── MorphProfile
│       ├── MorphProfileOverride
│       ├── MorphProfileResolution
│       └── AlternateForms materializadas
│           ├── morphKnownFormId
│           └── morphMaterialization
├── FormTransitionHistory
└── Metadata
```

## Templates

`templates` contém pacotes importados e independentes.

`templateApplications` registra incorporações permanentes.

Importar, incorporar, materializar uma forma conhecida e ativá-la são operações distintas.

## Formas Alternativas

`alternateFormSets` contém conjuntos de formas mutuamente exclusivas.

Cada conjunto possui:

- forma-base;
- forma ativa;
- mecanismo;
- formas disponíveis;
- política de continuidade;
- regras compartilhadas como defaults;
- proveniência da ativação atual;
- runtime da sessão ativa.

Cada forma pode possuir:

- template vinculado;
- trait de origem;
- vínculo com uma forma conhecida de Morfose;
- proveniência da materialização;
- snapshot transitório;
- regras efetivas;
- override;
- resolução explicável.

Somente uma forma fica ativa dentro de cada conjunto. Conjuntos independentes podem coexistir.

Templates permanentes não são removidos quando uma forma temporária muda.

## Morfose

Um conjunto com:

```js
mechanism: "morph"
```

possui obrigatoriamente:

```text
morphProfile
```

E pode persistir:

```text
morphProfileOverride
morphProfileResolution
```

O perfil mantém:

- modo do limite de pontos: `undeclared`, `limited` ou `unlimited`;
- limite declarado e sua fonte;
- política de catálogo;
- política de memorização;
- política de improvisação;
- formas conhecidas;
- referências externas não resolvidas;
- metadados de importação.

A resolução mantém:

- vínculo com a vantagem Morfose;
- método de vínculo;
- perfil-base;
- perfil resolvido;
- decisões por campo;
- evidências;
- modifiers reconhecidos, ignorados e não resolvidos;
- conflitos e diagnósticos;
- instante da resolução.

Conjuntos de Forma Alternativa mantêm os campos exclusivos de Morfose como `null`.

`templateId` de uma forma conhecida, quando informado, deve apontar para `Character.templates`. Referências importadas ainda não resolvidas permanecem com `templateId: null` e `externalIds` preservados.

O nome visível é **Morfose**; `morph` permanece apenas como identificador técnico. `Metamorfose` é uma entrada distinta.

## Resolução de Morfose

O resolver possui precedência:

```text
perfil-base
→ valor importado
→ builtin
→ campanha
→ explícito
→ manual
```

Um `sourceTraitId` explícito e válido é usado primeiro.

Na ausência dele, o resolver só vincula automaticamente quando existe exatamente uma vantagem chamada Morfose.

Ambiguidades permanecem sem vínculo.

Toda nova resolução parte de `morphProfileResolution.baseProfile`, permitindo retirar contribuições antigas quando modifiers são removidos ou desabilitados.

## Materialização de forma conhecida

Uma entrada disponível do catálogo pode ser projetada em `AlternateFormSet.forms` quando possui template resolvido.

A forma materializada mantém:

```js
{
  morphKnownFormId,
  templateId,
  morphMaterialization: {
    knownFormId,
    templateId,
    templateFingerprint,
    materializedAt,
    sourceName,
    acquisitionMethod,
    externalIds
  }
}
```

A materialização:

- não incorpora o template permanentemente;
- não ativa a forma;
- é idempotente;
- exige atualização explícita quando o template muda;
- não pode ser atualizada enquanto estiver ativa;
- participa do fingerprint do plano de transição;
- é revalidada antes da execução.

A forma-base não pode representar uma entrada materializada.

Uma forma conhecida só pode possuir uma materialização por conjunto.

## Continuidade de estado

O estado ativo permanece em:

```text
Pools
State
Equipment
```

Formas inativas preservam snapshots em:

```text
AlternateForm.runtimeState
```

Uma forma recém-materializada recebe runtime state válido e não inicializado.

`AlternateFormSet.statePolicy` define `shared` ou `perForm` para PV, PF, Reserva de Energia, ferimentos, condições, efeitos e equipamento.

## Regras, planejamento e execução

`AlternateFormSet.transitionRules` contém defaults compartilhados.

`AlternateForm.transitionRules` contém as regras efetivas da forma.

`FormTransitionPlanner` cria um plano sem modificar o Character.

Para alvos materializados de Morfose, o plano também contém:

```text
targetTemplateId
morphSelection
```

O planner bloqueia formas conhecidas indisponíveis, esquecidas, não resolvidas, inconsistentes ou obsoletas.

`FormTransitionExecutor` recebe um plano `ready`, revalida o estado atual, consome custos atomicamente, troca a forma e registra o recibo.

O recibo de Morfose registra:

```text
targetTemplateId
morphKnownFormId
```

Falhas não alteram o Character original.

## Runtime da forma ativa

```text
AlternateFormSet.transitionRuntime
```

O runtime mantém:

- ID da sessão;
- forma associada;
- início e última observação;
- tempo decorrido;
- manutenção e intervalos cobrados;
- duração mínima e máxima;
- pedido de retorno pendente.

A forma-base deve possuir `transitionRuntime: null`.

Uma forma alternativa pode permanecer temporariamente sem runtime quando foi importada ou construída antes da primeira observação. O runtime é inicializado pelo executor ou pelo motor de avanço.

## Histórico persistente

```text
Character.formTransitionHistory
```

Eventos suportados:

```text
transition-executed
maintenance-charged
maintenance-unpaid
return-requested
```

O histórico é append-only, possui IDs únicos e todos os eventos devem pertencer ao `identity.id` do Character.

Recibos e eventos sobrevivem à serialização e restauração.

## FormLifecycle

`FormLifecycle` integra:

```text
runtime
→ planner
→ executor
→ histórico
```

Por padrão, o ciclo apenas prepara o retorno.

A execução depende de opção explícita, preservando a regra de que nenhuma transformação acontece silenciosamente.

## Dados permanentes

Incluem:

- identidade;
- atributos e secundárias;
- traits;
- perícias, técnicas e mágicas;
- equipamentos cadastrados;
- idiomas e familiaridades;
- templates;
- aplicações;
- definição dos conjuntos;
- perfis, overrides e resoluções de Morfose;
- catálogos e proveniência de formas conhecidas;
- vínculos e fingerprints de materializações;
- políticas e regras;
- histórico de transições;
- metadados.

## Dados transitórios persistíveis

Incluem:

- valores atuais dos pools;
- ferimentos, condições e efeitos;
- estado de combate;
- estado e usos de equipamento;
- forma ativa;
- snapshots por forma;
- runtime da sessão ativa;
- manutenção já cobrada;
- pedido de retorno pendente;
- disponibilidade temporária de formas conhecidas de Morfose;
- formas conhecidas já materializadas.

## Invariantes

Um Character válido deve possuir:

- Identity com `id` e `name`;
- atributos, secundárias, pools e estado válidos;
- coleções estruturais válidas;
- templates e aplicações válidos;
- conjuntos de formas válidos;
- perfis de Morfose coerentes com seus mecanismos;
- referências de templates conhecidas válidas;
- materializações de Morfose coerentes;
- histórico de formas válido e pertencente ao Character;
- metadados.

Cada conjunto deve possuir:

- pelo menos uma forma;
- forma-base existente;
- forma ativa existente;
- IDs únicos;
- política válida;
- regras válidas;
- runtime nulo ou vinculado à forma ativa;
- runtime nulo quando a forma-base está ativa.

Cada conjunto de Morfose deve possuir:

- `morphProfile` válido;
- override e resolution como objetos ou nulos;
- modo e valor de limite coerentes;
- IDs únicos no catálogo;
- `templateId` único quando resolvido;
- referências resolvidas apontando para `Character.templates`;
- no máximo uma materialização por entrada conhecida;
- proveniência consistente com entrada e template;
- forma-base sem materialização.

## Serialização

A serialização inclui:

- templates e aplicações;
- conjuntos de formas;
- perfis, overrides e resoluções de Morfose;
- catálogo de formas conhecidas;
- formas materializadas e sua proveniência;
- forma ativa;
- políticas, regras, overrides e resoluções de forma;
- snapshots;
- runtime;
- histórico de transições;
- metadados.

Planos permanecem efêmeros. Recibos bem-sucedidos são persistidos como eventos do histórico.

## Não responsabilidades

Character não:

- calcula regras de GURPS;
- executa testes;
- decide fatos do mundo;
- avança o relógio global;
- agenda tarefas externas;
- executa retornos automaticamente por conta própria;
- calcula o custo ou o limite oficial de Morfose;
- inventa efeitos para modifiers não resolvidos;
- aprende, observa ou improvisa formas automaticamente;
- incorpora templates durante a materialização.

## Checklist

- [x] Character e serialização
- [x] Templates e aplicações
- [x] AlternateFormSets
- [x] Linker seguro
- [x] Continuidade de estado
- [x] Regras por forma
- [x] Planner
- [x] Executor atômico
- [x] Runtime persistente
- [x] Histórico persistente
- [x] Orquestração explícita do ciclo
- [x] Regressão completa de Forma Alternativa
- [x] Perfil e catálogo estrutural de Morfose
- [x] Resolver da vantagem e dos modifiers de Morfose
- [x] Recomposição sem contribuições legadas
- [x] Seleção e materialização de forma conhecida
- [x] Revalidação de catálogo e template
- [x] Proveniência persistente no recibo e histórico
- [x] Aprovar Character v1.11
