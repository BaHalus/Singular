# ADR-0032 — Aplicação soberana de Templates

**Status:** Aprovado  
**Data:** 2026-06-21  
**Bloco:** DOM-TEMPLATE-1.3

## Contexto

As operações históricas aplicavam e removiam templates diretamente. DOM-TEMPLATE-1.2 já produz uma composição determinística, mas faltavam análise, plano efêmero, revalidação, atualização de versão, recibos e preservação explícita de escolhas.

## Decisão

### Fluxo único

Toda aplicação passa por:

```text
análise
→ plano
→ revalidação
→ execução atômica
→ recibo persistido no ciclo de vida
```

As APIs antigas permanecem apenas como wrappers.

### Uma aplicação por composição-raiz

Uma aplicação representa a raiz e todos os templates alcançados pela composição.

```text
rootTemplateId
resolvedTemplateIds
compositionFingerprint
```

Sobreposição entre composições ativas é bloqueada para impedir duplicação de componentes compartilhados.

### Registro e histórico

`templateApplications` continua sendo a autoridade persistente. Não será criado histórico global paralelo.

Cada aplicação conserva eventos append-only de aplicação, remoção e atualização. Os eventos contêm o recibo e o fingerprint do plano.

### Escolhas

Escolhas do usuário são preservadas como objeto opaco. Templates não interpreta valores pertencentes a outros domínios.

Atualizações preservam as escolhas anteriores por padrão. Um novo snapshot só é usado quando fornecido explicitamente.

### Atualização

Atualização mantém o ID soberano da raiz, substitui o pacote armazenado, remove os componentes da aplicação anterior e cria nova aplicação ligada por:

```text
replacesApplicationId
replacedByApplicationId
```

A aplicação anterior permanece no histórico com estado removido.

### Dependências ativas

Remoção e atualização são bloqueadas quando:

- outra aplicação ativa depende da raiz;
- uma forma ativa utiliza template da composição.

### Atomicidade

A execução constrói o próximo estado em memória e chama `createCharacter` apenas para o resultado completo. Falhas deixam o objeto original intacto.

### Planos obsoletos

A execução refaz a análise e compara fingerprints. Mudanças em templates, aplicações, composição, escolhas ou dependências tornam o plano obsoleto.

## Consequências

- aplicação, remoção e atualização compartilham um pipeline;
- dependências são aplicadas em ordem determinística;
- escolhas sobrevivem a atualizações;
- recibos e linhagem sobrevivem ao save/load;
- componentes manuais não são removidos;
- Forma Alternativa e Morfose permanecem congeladas;
- DOM-TEMPLATE-1.4 pode reconciliar custos sem reabrir o ciclo de aplicação.

## Invariantes

1. Aplicação exige composição pronta.
2. Uma composição ativa não pode sobrepor outra.
3. Componentes carregam proveniência da aplicação e do template de origem.
4. Remoção nunca apaga o registro da aplicação.
5. Atualização cria nova aplicação e preserva a anterior.
6. Escolhas são preservadas sem interpretação.
7. Planos são efêmeros e revalidados.
8. Falha não produz mutação parcial.
9. Nomes nunca resolvem identidade.
10. Não existe pipeline legado paralelo.

## Alternativas rejeitadas

### Mutação direta

Rejeitada porque não permite revalidação nem proteção contra planos obsoletos.

### Reutilizar o mesmo registro na atualização

Rejeitada porque apagaria a linhagem e dificultaria auditoria.

### Inferir escolhas por componentes editados

Rejeitada porque diferenças acidentais não são intenção declarada.

### Histórico global adicional

Rejeitado porque `templateApplications` já é a autoridade do ciclo de vida.

## Continuidade

```text
DOM-TEMPLATE-1.4 — Custo e reconciliação
```
