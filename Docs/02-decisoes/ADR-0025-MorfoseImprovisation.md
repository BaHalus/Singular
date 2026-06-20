# ADR-0025 — Improvisação transitória de formas de Morfose

**Status:** Aprovado  
**Data:** 2026-06-20

## Contexto

GURPS Powers acrescenta a Morfose o modificador **Formas Improvisadas**, que permite construir durante a transformação um modelo racial transitório a partir de características físicas naturais.

Essa capacidade não corresponde a:

- importar um template;
- incorporar um template;
- memorizar uma forma;
- adquirir uma forma conhecida;
- ativar uma forma já pronta.

Também existem dois refinamentos independentes:

- **Cósmica (Para Formas Improvisadas)** remove a exigência de que as características existam no cenário;
- **Ilimitada** remove a restrição contra alteração da composição fundamental.

A arquitetura já possui `Character.templates`, catálogo de formas conhecidas, materialização de formas conhecidas e o pipeline soberano de transições. Criar outro catálogo, builder persistente ou executor de transformação duplicaria autoridades.

## Decisão

### 1. Política de improvisação em eixos

A política será declarada em eixos independentes:

```js
{
  mode,
  pointLimit,
  traitScope,
  availabilityScope,
  compositionScope
}
```

Formas Improvisadas define a política-base:

```js
{
  mode: "allowed",
  traitScope: "physicalNatural",
  availabilityScope: "settingOnly",
  compositionScope: "sameComposition"
}
```

Cósmica refina apenas `availabilityScope` para `unrestricted`.

Ilimitada refina apenas `compositionScope` para `unrestricted`, além de sua consequência já existente no limite geral da Morfose.

Os refinamentos dependentes têm precedência interna maior que a restrição-base, sem ultrapassar regras de campanha, diretivas explícitas ou override manual.

Cósmica sozinha não concede improvisação e produz diagnóstico de dependência.

### 2. Rascunho declarativo

Uma improvisação será descrita por um rascunho puro contendo:

- identidade da intenção;
- snapshot de template de forma;
- evidências sobre escopo físico, existência no cenário e composição;
- notas, tags e dados desconhecidos.

Evidência ausente permanece `null` e produz estado pendente. O motor não infere a natureza das características a partir do nome.

### 3. Plano efêmero

Análise e execução serão separadas por um plano efêmero com fingerprints do rascunho, política e conjunto.

A execução revalida o plano. Alterações relevantes causam rejeição por obsolescência.

O plano não será persistido.

### 4. Projeção transitória no conjunto

Uma improvisação executada cria uma projeção em:

```text
AlternateFormSet.forms
```

Ela não cria entrada em:

```text
Character.templates
morphProfile.knownForms
```

A projeção contém o snapshot completo e sua proveniência em `morphImprovisation`.

Uma forma improvisada não pode simultaneamente ser:

- forma-base;
- materialização de forma conhecida;
- referência a template persistente.

O mesmo `improvisationId` só pode aparecer uma vez por conjunto.

### 5. Ativação pelo pipeline existente

Não será criado executor próprio.

A projeção é entregue ao `FormTransitionPlanner`, que a reavalia. A transformação continua sendo executada exclusivamente pelo `FormTransitionExecutor`.

### 6. Proteção da forma ativa

Uma projeção improvisada ativa não pode ser atualizada nem descartada.

A mesma improvisação inalterada é idempotente. Uma versão alterada pode substituir explicitamente apenas a projeção inativa correspondente.

### 7. Limite em pontos diferido

DOM-MORPH-1.4 registra o custo importado do snapshot e os limites declarados, mas não decide a admissibilidade mecânica pelo custo.

A aplicação do limite permanece no DOM-MORPH-1.5, que será a autoridade única para formas conhecidas e improvisadas.

## Consequências

- não surge um segundo catálogo de formas;
- não surge um segundo repositório de templates;
- a improvisação pode sobreviver a save/load sem virar template persistente;
- a UI apenas declara composição e evidências;
- restrições desconhecidas continuam explícitas;
- Cósmica e Ilimitada mantêm efeitos distintos;
- o planner e executor de Forma Alternativa continuam soberanos;
- o limite em pontos não é aplicado prematuramente;
- múltiplos conjuntos permanecem isolados.

## Alternativas rejeitadas

### Inserir o template em `Character.templates`

Rejeitado porque confundiria composição transitória com importação persistente.

### Inserir a improvisação em `knownForms`

Rejeitado porque improvisar não é observar, adquirir ou memorizar uma forma.

### Ativar diretamente após construir

Rejeitado porque uniria intenção, materialização e transformação, quebrando o planner e a execução atômica existentes.

### Reutilizar `morphMaterialization`

Rejeitado porque essa proveniência exige uma forma conhecida e um `templateId` persistente. A improvisação possui fonte e ciclo de vida distintos.

### Aplicar o limite em pontos neste bloco

Rejeitado porque dividiria a autoridade de limites antes do DOM-MORPH-1.5.
