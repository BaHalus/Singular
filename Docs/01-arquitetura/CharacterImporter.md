# CharacterImporter

**Código:** DOM-IMP-1.11  
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
- importa agrupamentos de Powers por ancestralidade explícita de IDs;
- vincula Forma Alternativa somente quando a relação é segura;
- resolve políticas de continuidade;
- resolve regras declarativas de transição por forma;
- não executa cálculos ou ações de jogo.

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
FormTransitionRulesResolver
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
- Powers e vínculos explícitos não resolvidos;
- idiomas;
- familiaridades;
- equipamento;
- templates;
- containers;
- nós desconhecidos;
- documento bruto.

## Powers

```text
GCS trait containers com containerType "power"
↓
TraitsImporter preserva containers e ancestralidade
↓
PowersImporter associa membros pelo Power ancestral mais próximo
↓
ImportSnapshot.powers + unresolvedPowerLinks
↓
Character.powers
```

O `PowersImporter`:

- consome somente Traits e containers já normalizados;
- cria um Power para cada container explicitamente classificado como `power`;
- associa cada Trait ao Power ancestral mais próximo por ID interno;
- preserva a ordem dos Traits membros;
- associa o talento somente quando existe um ID explícito válido;
- preserva referências explícitas de talento não resolvidas em `unresolvedPowerLinks`;
- preserva fonte, modificador declarado, tags editoriais, metadados e dados brutos;
- não associa entidades por nome;
- não duplica Traits dentro de Powers;
- não calcula custos, níveis, efeitos ou regras GURPS.

O modificador de poder importado permanece uma declaração estrutural. Os modificadores canônicos e os custos continuam sob autoridade de Traits.

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

Depois da vinculação, o resolver analisa traits, modificadores, features, templates, regras de campanha e overrides.

O resultado é armazenado no conjunto:

```js
{
  statePolicy,
  statePolicyOverride,
  statePolicyResolution
}
```

Modificadores desabilitados não alteram a política.

A primeira regra interna reconhece `Dano Não-Recíproco` e deriva PV e ferimentos próprios de cada forma.

## FormTransitionRulesResolver

Depois da política de estado, o importador resolve as condições de cada forma separadamente.

O resultado é armazenado na forma:

```js
{
  transitionRules,
  transitionRulesOverride,
  transitionRulesResolution
}
```

A resolução não mistura os modificadores de formas diferentes.

Regras internas iniciais reconhecem:

```text
Custa Fadiga
Gasto Adicional de Tempo
Tempo Reduzido
Gatilho
Preparação Necessária
Impedimento
Incontrolável
```

Modificadores desabilitados são preservados, mas não produzem regras.

As regras resultantes declaram tempo, custos, testes, requisitos, gatilhos, retorno e impedimentos. O importador não executa nenhuma dessas condições.

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
  templateImportReport,
  alternateFormLinkReport,
  formStatePolicyResolutions,
  formTransitionRulesResolutions
}
```

Diagnósticos de Powers ficam em `snapshot.unresolvedPowerLinks`.

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
  },

  formTransitionRulesResolver: {
    rules,
    campaignRules,
    manualOverride,
    manualOverrides,
    overrideId,
    overrideName
  }
}
```

Para transições, `manualOverrides` pode ser organizado por conjunto e forma:

```js
{
  "set-body": {
    "form-wolf": {
      activation: {
        maneuver: "Concentrate"
      }
    }
  }
}
```

Também pode usar diretamente o `formId` como chave.

## Recomposição

As resoluções preservam sua base original.

Quando um modificador é removido ou desabilitado, uma nova resolução retira sua contribuição anterior.

Overrides manuais persistem até serem removidos explicitamente.

## Fora de escopo

O importador não:

- consome custos;
- executa testes;
- verifica requisitos ou impedimentos;
- mede duração;
- ativa gatilhos;
- troca formas;
- calcula atributos finais;
- calcula máximos ou proporção de dano;
- calcula NH, carga ou ataques;
- aplica modificadores de poder aos Traits;
- diagnostica divergências mecânicas entre Power e Traits;
- implementa limites de Morfo.

## Checklist

- [x] ImportSnapshot
- [x] IdentityImporter
- [x] AttributesImporter
- [x] TraitsImporter
- [x] SkillsImporter
- [x] TechniquesImporter
- [x] SpellsImporter
- [x] PowersImporter
- [x] Integrar Powers ao ImportSnapshot
- [x] Integrar Powers ao CharacterImporter
- [x] Preservar vínculos explícitos de Powers não resolvidos
- [x] LanguagesImporter
- [x] FamiliaritiesImporter
- [x] EquipmentImporter
- [x] TemplatesImporter
- [x] AlternateFormsLinker
- [x] FormStatePolicyResolver
- [x] FormTransitionRulesResolver
- [x] Diagnósticos de vínculo
- [x] Diagnósticos de continuidade
- [x] Diagnósticos de transição
- [x] Regras de campanha
- [x] Overrides manuais persistentes
