# Attributes

**Código:** DOM-ATTR-1.0 a 1.1  
**Status:** Estrutura canônica e nível efetivo implementados  
**Camada:** Domain + Engine  
**Tipo:** Agregado estrutural com projeção mecânica derivada

Attributes representa os quatro atributos básicos de GURPS 4ª Edição: ST, DX, IQ e HT.

## Autoridade estrutural

`Character.attributes` é a fonte persistente canônica.

`src/domain/character/Attributes.js` cria, valida e serializa a estrutura:

```js
{
  ST: { base: 10, override: null },
  DX: { base: 10, override: null },
  IQ: { base: 10, override: null },
  HT: { base: 10, override: null }
}
```

O domínio estrutural:

- preserva `base`;
- preserva `override`;
- garante a presença dos quatro atributos;
- garante tipos numéricos mínimos;
- não calcula custo, derivados ou regras de GURPS.

## Semântica de override

`override` substitui somente o resultado final do atributo.

Ele:

- não altera `base`;
- não é somado ao valor-base;
- não modifica fórmulas;
- é considerado presente quando não é `null`;
- pode ser zero.

A regra de precedência é:

```text
nível efetivo = override, quando override não é null
nível efetivo = base, caso contrário
```

## Autoridade mecânica

`src/engine/attributes/AttributeLevelResolver.js` é a autoridade do nível efetivo.

API:

```js
resolveAttributeLevel({ attributeKey, attribute })
resolveAttributeLevels(attributes)
createAttributeLevelResult(input)
validateAttributeLevelResult(result)
serializeAttributeLevelResult(result)
validateAttributeLevelsReport(report)
serializeAttributeLevelsReport(report)
```

O resultado unitário contém:

```js
{
  schemaVersion: 1,
  attribute: "DX",
  status: "resolved",
  level: 12,
  source: "override",
  diagnostics: []
}
```

Valores efetivos não finitos produzem resultado bloqueado com diagnóstico portátil. Um atributo bloqueado não impede que o relatório dos outros atributos seja produzido.

## Infraestrutura compartilhada

A portabilidade e a imutabilidade usam `src/engine/EnginePortableValue.js`.

O caminho histórico `src/engine/skills/SkillMechanicsPortableValue.js` permanece como reexport compatível da mesma implementação, sem criar validador paralelo.

## Não responsabilidades

Attributes e seu resolvedor não:

- calculam custo em pontos;
- calculam dano, carga ou características secundárias;
- aplicam modificadores de Traits, Templates, equipamentos ou condições;
- validam pré-requisitos;
- resolvem Skills ou Techniques;
- alteram o Character;
- persistem valores derivados;
- projetam UI.

## Relação com Skills e Techniques

A resolução global futura poderá consumir somente resultados `resolved` de `resolveAttributeLevels`.

Skills e Techniques não devem ler `base` e `override` diretamente nem reproduzir sua precedência.

## Invariantes

1. ST, DX, IQ e HT sempre existem na estrutura canônica.
2. `base` permanece preservado.
3. `override` permanece `null` ou numérico na estrutura.
4. O motor decide o nível efetivo.
5. Override zero é válido.
6. Resultados derivados não são persistidos no Character.
7. A aplicação orquestra; não decide precedência.
8. A UI apresenta; não calcula.

## Cobertura de regressão

A cobertura protege:

- criação e serialização estrutural;
- uso do valor-base;
- precedência do override;
- override zero e normalização de zero negativo;
- valores não finitos;
- resolução agregada de ST, DX, IQ e HT;
- resultados parcialmente bloqueados;
- validação, serialização e imutabilidade;
- compatibilidade do helper de portabilidade usado por Skills.

Checklist:

- [x] Criar Attributes.md
- [x] Criar Attributes.js
- [x] Criar Attributes.test.js
- [x] Integrar com Character
- [x] Definir autoridade do nível efetivo
- [x] Implementar resolução de base e override
- [x] Cobrir relatório dos quatro atributos
- [ ] Aplicar modificadores canônicos externos
- [ ] Calcular custos em pontos
- [ ] Integrar ao plano global de Skills e Techniques
- [ ] Projetar no Application Read Model
- [ ] UI
