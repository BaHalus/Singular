# Character

**Status:** Contrato de Domínio  
**Frente:** 18  
**Camada:** Domain  
**Caminho previsto:** `src/domain/character/Character.js`

---

## Definição

`Character` é o Aggregate Root da SINGULAR.

Ele representa o personagem como unidade estrutural persistente.

O `Character` coordena a composição dos principais agregados do personagem, mas não executa regras de GURPS, não calcula valores derivados e não conhece a interface.

---

## Responsabilidades

O `Character` é responsável por:

- manter a identidade do personagem;
- manter a composição estrutural dos agregados;
- preservar dados permanentes;
- preservar estados transitórios associados ao personagem;
- garantir invariantes estruturais mínimas;
- fornecer serialização estável.

---

## Não Responsabilidades

O `Character` não é responsável por:

- calcular custo em pontos;
- calcular dano;
- calcular carga;
- calcular NH;
- validar pré-requisitos de GURPS;
- aplicar modificadores;
- renderizar interface;
- salvar em armazenamento;
- importar ou exportar arquivos;
- decidir regras de apresentação.

Essas responsabilidades pertencem a outras camadas.

---

## Composição

A estrutura canônica inicial do `Character` é:

```js
{
  identity,
  attributes,
  secondaryCharacteristics,
  pools,
  advantages,
  disadvantages,
  quirks,
  skills,
  techniques,
  spells,
  powers,
  equipment,
  attacks,
  languages,
  familiarities,
  templates,
  state,
  metadata
}
