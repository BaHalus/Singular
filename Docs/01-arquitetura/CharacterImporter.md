# CharacterImporter

**Código:** DOM-IMP-1.0
**Status:** Aprovado
**Camada:** Domain / Import
**Tipo:** Import Pipeline

CharacterImporter importa dados externos para um Character válido da SINGULAR.

A arquitetura segue ADR-0008 e ADR-0009.

---

## Regra central

O importador não calcula regras.

Ele apenas:

- lê a entrada;
- normaliza campos conhecidos;
- preserva dados desconhecidos;
- cria um Character válido.

Cálculos continuam nos serviços de domínio.

---

## Pipeline

```text
GCS JSON
  ↓
ImportSnapshot
  ↓
Character Aggregate
  ↓
Domain Services
```

---

## ImportSnapshot

ImportSnapshot é a fronteira anti-acoplamento entre formato externo e domínio.

Estrutura inicial:

```js
{
  identity: {},
  attributes: {},
  secondaryCharacteristics: {},
  traits: [],
  skills: [],
  techniques: [],
  languages: [],
  familiarities: [],
  equipment: [],
  raw: {}
}
```

---

## DOM-IMP-1.0

A primeira entrega importa:

- identidade;
- ST, DX, IQ, HT;
- secundárias quando presentes.

---

## Fora de escopo inicial

DOM-IMP-1.0 ainda não importa:

- traits;
- perícias;
- técnicas;
- equipamentos;
- magias;
- poderes;
- templates;
- ataques derivados.

---

## Checklist

- [x] Criar CharacterImporter.md
- [ ] Criar ImportSnapshot.js
- [ ] Criar IdentityImporter.js
- [ ] Criar AttributesImporter.js
- [ ] Criar CharacterImporter.js
- [ ] Criar CharacterImporter.test.js
