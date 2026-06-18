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

Exemplo:

```text
Vantagem
Perícia
Equipamento
Magia
Template
