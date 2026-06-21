# ADR-0034 — Importação soberana e fechamento de Templates

**Status:** Aprovado  
**Data:** 2026-06-21  
**Bloco:** DOM-TEMPLATE-1.5

## Contexto

Templates já possui agregado soberano, composição, dependências, aplicação e reconciliação de pontos. O importador GCT existente preserva dados ricos, mas ainda faltavam identidade determinística para pacotes anônimos, relatório canônico, plano revalidável e representação soberana de nós desconhecidos.

## Decisão

### Parser único

`TemplatesImporter` continua sendo o único parser estrutural de GCT. `TemplateImportOperations` consome seu resultado e acrescenta identidade, validação, planejamento, catálogo, diagnóstico e recibo.

Não haverá segundo parser.

### Identidade

Pacotes com identidade externa preservam seu ID. Pacotes anônimos recebem ID por hash canônico do documento.

Nome e posição nunca participam da identidade.

### Nós desconhecidos

Nós desconhecidos permanecem nos diagnósticos e recebem representação canônica opaca. Eles não são adicionados nem aplicados automaticamente.

### Estados

```text
ready
ready-with-warnings
blocked
```

Avisos preservam versões ausentes ou não suportadas e estruturas opacas. Conflitos de identidade bloqueiam.

### Revalidação

A importação usa análise, plano e execução. A fonte é analisada novamente antes da execução. Alteração de conteúdo invalida o plano.

### Catálogo

A mesclagem usa política explícita para conflito do mesmo ID:

```text
reject
keep-existing
replace
```

O padrão é rejeitar. Identidade externa compartilhada por IDs soberanos diferentes sempre bloqueia.

### Integração

`CharacterImporter` utiliza a camada soberana e expõe `templateImportReport`. Um GCT standalone continua apenas armazenado em `Character.templates`; aplicação exige DOM-TEMPLATE-1.3.

## Consequências

- importações anônimas são reproduzíveis;
- dados desconhecidos não são descartados;
- conflitos não são resolvidos silenciosamente;
- planos obsoletos não são executados;
- importação e aplicação permanecem separadas;
- o parser legado continua retrocompatível;
- o domínio pode ser encerrado sem reabrir Forma Alternativa ou Morfose.

## Invariantes

1. Existe um único parser GCT.
2. Identidade nunca depende de nome ou posição.
3. Nó desconhecido permanece preservado.
4. Pacote opaco não é aplicado automaticamente.
5. Conflito de ID divergente bloqueia.
6. Conflito de identidade externa bloqueia.
7. Plano é revalidado antes da execução.
8. Mesclagem destrutiva exige política explícita.
9. Importação não calcula pontos.
10. A UI não calcula.

## Alternativas rejeitadas

### Segundo importador canônico

Rejeitado porque duplicaria normalização e criaria divergência com `TemplatesImporter`.

### ID aleatório para pacote anônimo

Rejeitado porque repetidas importações do mesmo documento produziriam identidades distintas.

### Aplicar automaticamente GCT standalone

Rejeitado porque armazenamento de pacote e aplicação ao personagem são operações diferentes.

### Resolver conflitos por nome

Rejeitado por ambiguidade e instabilidade.

## Fechamento

DOM-TEMPLATE fica encerrado em 1.5. Reabertura exige ADR próprio e repetição do gate integral.
