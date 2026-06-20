# ADR-0029 — Fundação soberana de Templates

**Status:** Aprovado  
**Data:** 2026-06-20  
**Bloco:** DOM-TEMPLATE-1.0

## Contexto

Forma Alternativa e Morfose foram encerradas com APIs estáveis. Ambos os domínios já dependem de `Character.templates`, mas o modelo anterior era orientado principalmente à preservação de arquivos GCS e distribuía as contribuições em várias coleções paralelas.

O próximo domínio precisa sustentar raças, modelos raciais, metacaracterísticas, profissões, arquétipos, corpos, formas, pacotes de campanha, composição futura e importação GCS ampla.

Manter cada seção do template como uma autoridade independente criaria divergência entre importação, aplicação, Forma Alternativa e Morfose.

## Decisão

### Template soberano

O template passa a possuir o núcleo canônico:

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
- nomes nunca são usados para criar vínculo;
- renomear um template não altera sua identidade.

### Entradas canônicas

`entries` é a autoridade única das contribuições declaradas.

Cada entrada possui:

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

`entryType` é aberto. Entradas desconhecidas são válidas e preservadas.

`referenceId` só é preenchido quando uma referência explícita existe. Nenhuma ligação por nome é permitida.

### Compatibilidade temporária

As coleções anteriores, como `traits.advantages`, `skills`, `spells` e `equipment`, permanecem como projeções somente leitura reconstruídas a partir de `entries`.

Elas não constituem uma segunda autoridade.

Durante o round trip, payloads que contenham simultaneamente `entries` e projeções legadas precisam ser semanticamente equivalentes. A mesma contribuição equivalente é unificada; uma definição divergente é rejeitada.

### Origem

`source` é estruturado e preserva:

```text
kind
provider
format
reference
version
```

Campos adicionais da fonte são mantidos.

### Pontos

`importedPoints` e `calculatedPoints` são valores distintos.

DOM-TEMPLATE-1.0 não calcula nem reconcilia nenhum deles.

```text
importado divergente calculado
→ preservar ambos
→ não sobrescrever
→ reconciliar somente no DOM-TEMPLATE-1.4
```

### Imutabilidade

Templates e entradas são profundamente imutáveis após a criação.

Operações futuras deverão produzir novos valores em vez de modificar o pacote existente.

### Limites do bloco

DOM-TEMPLATE-1.0 não implementa composição entre templates, dependências, ciclos, aplicação planejada ao Character, reconciliação de custos ou importação GCS final. Essas responsabilidades pertencem aos blocos 1.1 a 1.5.

## Consequências

### Positivas

- uma única estrutura passa a representar contribuições conhecidas e desconhecidas;
- Forma Alternativa e Morfose continuam consumindo `id`, `name`, `templateType` e `importedPoints` sem quebra;
- importadores atuais podem continuar fornecendo as coleções legadas;
- a aplicação atual pode continuar usando projeções conhecidas;
- referências externas não são confundidas com identidade interna;
- save/load preserva dados opacos;
- atualizações acidentais por mutação são impedidas.

### Custos

- durante a migração, a serialização inclui entradas canônicas e projeções de compatibilidade;
- os próximos blocos deverão migrar consumidores para `entries`;
- o payload fica temporariamente mais volumoso;
- conflitos entre representações passam a gerar erro explícito.

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

O próximo bloco é:

```text
DOM-TEMPLATE-1.1 — Composição declarativa
```

Ele deverá definir contribuições para atributos, características secundárias, traits, perícias, técnicas, idiomas, culturas, equipamentos, outros templates e regras especiais, mantendo cada domínio responsável por sua própria interpretação.
