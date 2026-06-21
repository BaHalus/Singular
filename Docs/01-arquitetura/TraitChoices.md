# TraitChoices — Escolhas explícitas

**Código:** DOM-TRAIT-1.4  
**Camada:** Domain  
**Decisão:** ADR-0039

`TraitChoices` preserva decisões parametrizadas sem associá-las por nome, texto exibido ou posição.

## Forma canônica

```js
{
  key: "especializacao",
  value: "Espadas",
  required: true,
}
```

- `key` é a identidade estável da escolha;
- `value` é escalar ou `null`;
- `required` declara se a ausência de valor torna a avaliação incompleta;
- propriedades adicionais da origem podem ser preservadas como evidência.

## Avaliação

```js
{
  status: "ready" | "incomplete",
  complete,
  missingKeys,
  choices,
}
```

A avaliação não atribui custo, não aplica substituições em texto e não interpreta semânticas pertencentes a poderes, perícias ou templates.

## Compatibilidade

Mapas GCS `replacements` são convertidos na fronteira:

```js
{ Elemento: "Fogo" }
```

vira:

```js
[
  {
    key: "Elemento",
    value: "Fogo",
    required: false,
  },
]
```

A forma externa não permanece como segunda autoridade canônica.
