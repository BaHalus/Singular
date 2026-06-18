# ADR-0004 — External Identifiers

**Status:** Aprovado  
**Data:** 2026-06-18  
**Decisor:** SINGULAR Architecture  
**Código:** ADR-0004

---

# Contexto

A SINGULAR deve importar e exportar dados de sistemas externos.

O principal alvo inicial é:

- GCS (GURPS Character Sheet)

Mas a arquitetura não deve impedir integrações futuras com:

- GCA
- Foundry
- outras ferramentas
- formatos proprietários

Ao mesmo tempo, a SINGULAR deve possuir identidade própria para todos os seus objetos internos.

---

# Problema

Objetos importados podem possuir identificadores externos.

Exemplos:

- Vantagem
- Qualidade
- Desvantagem
- Peculiaridade
- Perícia
- Equipamento
- Magia
- Template

Esses identificadores não pertencem à SINGULAR.

Eles pertencem ao sistema de origem.

Se a SINGULAR reutilizar diretamente esses identificadores:

- perde independência;
- dificulta migrações;
- dificulta múltiplas integrações;
- dificulta fusões de dados;
- dificulta histórico interno;
- dificulta Undo/Redo confiável.

---

# Decisão

Todo objeto persistente importável deve possuir dois níveis de identificação:

```js
{
  id,
  externalIds
}
```

---

# id

Representa o identificador interno da SINGULAR.

Exemplo:

```js
{
  id: "adv_abc123"
}
```

Regras:

- obrigatório;
- único dentro da SINGULAR;
- gerado pela SINGULAR;
- nunca reutilizado;
- nunca depende de sistemas externos;
- nunca deve ser derivado do nome do item;
- nunca deve ser derivado da posição do item na lista.

---

# externalIds

Representa identificadores externos.

Exemplo:

```js
{
  externalIds: {
    gcs: "advantage-id-from-gcs"
  }
}
```

Regras:

- obrigatório como campo estrutural em objetos importáveis;
- pode estar vazio;
- deve ser um objeto;
- pode conter múltiplas origens;
- não substitui `id`;
- não deve ser usado como identificador interno da SINGULAR.

---

# Exemplo Completo

```js
{
  id: "adv_abc123",

  externalIds: {
    gcs: "adv_001"
  },

  name: "Combat Reflexes"
}
```

---

# Múltiplas Integrações

A estrutura deve permitir múltiplos identificadores externos.

Exemplo:

```js
{
  id: "adv_abc123",

  externalIds: {
    gcs: "adv_001",
    gca: "gca_451",
    foundry: "fd_882"
  }
}
```

---

# Escopo

Esta ADR aplica-se a todos os agregados que possam ser importados ou exportados.

Exemplos:

- Advantages
- Perks
- Disadvantages
- Quirks
- Skills
- Techniques
- Spells
- Powers
- Equipment
- Languages
- Templates

A lista não é exaustiva.

---

# Não Objetivos

Esta ADR não define:

- formato dos arquivos GCS;
- regras de importação;
- regras de exportação;
- sincronização entre sistemas;
- formato completo do GCS Model.

Ela define apenas a estrutura de identificação.

---

# Relação com ADR-0003

A ADR-0003 define a estratégia geral de compatibilidade GCS por preservação e patch.

Esta ADR complementa a ADR-0003 definindo como objetos importáveis preservam identificadores externos.

---

# Consequências

## Benefícios

- independência da SINGULAR;
- compatibilidade com GCS;
- compatibilidade futura com outras ferramentas;
- rastreabilidade de origem;
- estabilidade dos identificadores internos;
- maior segurança para round-trip parcial.

## Custos

- pequeno aumento de armazenamento;
- necessidade de manter dois níveis de identificação;
- validações estruturais adicionais.

O custo é considerado aceitável.
