# CharacterImporter

**Código:** DOM-IMP-1.9  
**Status:** Aprovado  
**Camada:** Domain / Import  
**Tipo:** Import Pipeline

CharacterImporter importa dados externos para um Character válido da SINGULAR.

## Regra central

O importador:

- lê a entrada;
- normaliza campos conhecidos;
- preserva dados desconhecidos;
- cria agregados válidos;
- preserva templates `.gct`;
- vincula Forma Alternativa somente quando a relação é segura;
- resolve políticas de continuidade sem executar cálculos de jogo.

## Pipeline

```text
GCS JSON
↓
ImportSnapshot
↓
Character
↓
AlternateFormsLinker
↓
FormStatePolicyResolver
↓
Character importado + diagnósticos
```

## ImportSnapshot

O snapshot preserva:

- identidade;
- atributos;
- secundárias;
- traits;
- perícias e técnicas;
- mágicas;
- idiomas;
- familiaridades;
- equipamento;
- templates;
- containers;
- nós desconhecidos;
- documento bruto.

## Templates GCT

A extensão original dos templates é `.gct`.

Um GCT standalone entra em `Character.templates`.

Seus componentes não são automaticamente aplicados ao personagem.

## AlternateFormsLinker

O linker procura vantagens como:

```text
Forma Alternativa
Forma Alternativa: Lobo
Forma Alternativa (Morcego)
Alternate Form
```

A resolução utiliza ID explícito, nome explícito, nome declarado, notas e equivalência canônica exata.

Não há correspondência aproximada nem escolha arbitrária entre candidatos.

## FormStatePolicyResolver

Depois da vinculação, o resolver analisa:

- traits de origem;
- modificadores habilitados;
- features habilitadas;
- templates de forma;
- regras de campanha;
- overrides manuais.

O resultado é armazenado em cada conjunto:

```js
{
  statePolicy,
  statePolicyOverride,
  statePolicyResolution
}
```

Modificadores desabilitados não alteram a política.

A primeira regra interna reconhece `Dano Não-Recíproco` e deriva PV e ferimentos próprios de cada forma.

## API

```js
importCharacter(source, options)
```

Retorna somente o Character.

```js
importCharacterWithDiagnostics(source, options)
```

Retorna:

```js
{
  character,
  snapshot,
  alternateFormLinkReport,
  formStatePolicyResolutions
}
```

## Opções

```js
{
  now,

  alternateFormsLinker: {
    defaultGroupKey,
    defaultGroupName,
    baseFormName
  },

  formStatePolicyResolver: {
    rules,
    campaignRules,
    manualOverride,
    manualOverrides,
    overrideId,
    overrideName
  }
}
```

`manualOverrides` permite fornecer uma política específica por `formSetId`.

## Fora de escopo

O importador não calcula:

- custos;
- atributos finais;
- secundárias;
- máximos de pools;
- proporção de dano;
- NH;
- carga;
- ataques finais;
- duração ou teste de transformação;
- limites de Morfo.

## Checklist

- [x] ImportSnapshot
- [x] IdentityImporter
- [x] AttributesImporter
- [x] TraitsImporter
- [x] SkillsImporter
- [x] TechniquesImporter
- [x] SpellsImporter
- [x] LanguagesImporter
- [x] FamiliaritiesImporter
- [x] EquipmentImporter
- [x] TemplatesImporter
- [x] AlternateFormsLinker
- [x] FormStatePolicyResolver
- [x] Diagnósticos de vínculo
- [x] Diagnósticos de política
- [x] Regras de campanha
- [x] Override manual persistente
