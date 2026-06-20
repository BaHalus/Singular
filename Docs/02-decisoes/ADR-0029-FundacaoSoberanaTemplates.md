# ADR-0029 — Fundação soberana de Templates

**Status:** Aprovado  
**Data:** 2026-06-20  
**Bloco:** DOM-TEMPLATE-1.0

## Contexto

Forma Alternativa e Morfose foram encerradas com APIs estáveis. Ambos dependem de `Character.templates`, mas o modelo anterior era orientado principalmente à preservação de arquivos GCS e distribuía contribuições em coleções paralelas.

O domínio precisa sustentar raças, modelos raciais, metacaracterísticas, profissões, arquétipos, corpos, formas, pacotes de campanha, composição futura e importação ampla.

## Decisão

### Template soberano

```js
{
  id,
  externalIds,
  name,
  templateType,
  source,
  entries,
  importedPoints,
  calculatedPoints,
  notes,
  tags,
  importMeta,
  raw,
}
```

### Identidade

`id` é a identidade própria da SINGULAR.

- IDs são únicos em `Character.templates`;
- IDs externos permanecem em `externalIds`;
- nomes nunca criam vínculo;
- renomear não altera identidade.

### Entradas canônicas

`entries` é a autoridade única das contribuições declaradas.

```js
{
  id,
  domain,
  entryType,
  externalIds,
  referenceId,
  payload,
  notes,
  tags,
  importMeta,
  raw,
}
```

`entryType` é aberto. Entradas desconhecidas são válidas e preservadas. `referenceId` só é preenchido por referência explícita.

### Compatibilidade temporária

Coleções anteriores, como `traits.advantages`, `skills`, `spells` e `equipment`, permanecem como projeções somente leitura reconstruídas a partir de `entries`. Elas não constituem segunda autoridade.

Payloads que contenham as duas representações precisam ser semanticamente equivalentes. A mesma contribuição equivalente é unificada; uma definição divergente é rejeitada.

### Origem

`source` preserva `kind`, `provider`, `format`, `reference` e `version`, além de campos adicionais declarados.

### Pontos

`importedPoints` e `calculatedPoints` são distintos. DOM-TEMPLATE-1.0 não calcula nem reconcilia nenhum deles.

```text
importado divergente calculado
→ preservar ambos
→ não sobrescrever
→ reconciliar somente no DOM-TEMPLATE-1.4
```

### Imutabilidade

Templates e entradas são profundamente imutáveis. Operações futuras produzirão novos valores em vez de modificar pacotes existentes.

### Limites

DOM-TEMPLATE-1.0 não implementa composição, dependências, ciclos, aplicação planejada ao Character, reconciliação de custos ou importação final. Essas responsabilidades pertencem aos blocos 1.1 a 1.5.

## Consequências

- uma estrutura representa contribuições conhecidas e desconhecidas;
- Forma Alternativa e Morfose mantêm seus contratos;
- importadores atuais podem fornecer coleções legadas;
- a aplicação atual pode usar projeções conhecidas;
- referências externas não se confundem com identidade interna;
- save/load preserva dados opacos;
- mutações acidentais são impedidas;
- durante a migração, a serialização inclui forma canônica e compatibilidade;
- conflitos entre representações geram erro explícito.

## Invariantes

1. IDs de templates são únicos por Character.
2. IDs de entradas são únicos por template.
3. `externalIds` nunca substitui `id`.
4. `referenceId` nunca é inferido por nome.
5. entrada desconhecida não é descartada.
6. `importedPoints` não é recalculado localmente.
7. `calculatedPoints` não é preenchido sem autoridade calculadora.
8. projeções legadas derivam de `entries`.
9. templates não são modificados em operações de domínio.
10. a UI não calcula nem reconcilia o pacote.

## Continuidade

```text
DOM-TEMPLATE-1.1 — Composição declarativa
```

O próximo bloco definirá contribuições para atributos, características secundárias, traits, perícias, técnicas, idiomas, culturas, equipamentos, outros templates e regras especiais, mantendo cada domínio responsável pela própria interpretação.
