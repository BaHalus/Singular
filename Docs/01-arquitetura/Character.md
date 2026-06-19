# Character

**Código:** DOM-CHAR-1.4  
**Status:** Aprovado  
**Camada:** Domain  
**Tipo:** Aggregate Root

Character é o Aggregate Root da SINGULAR.

Ele representa a unidade fundamental de persistência, serialização e manipulação de um personagem.

## Responsabilidades

Character mantém:

- identidade;
- atributos e secundárias;
- pools;
- traits;
- perícias, técnicas, mágicas e poderes;
- equipamentos e ataques;
- idiomas e familiaridades;
- templates importados;
- histórico de incorporação;
- conjuntos de formas;
- forma ativa;
- estado transitório atual;
- snapshots das formas inativas;
- políticas de continuidade;
- regras declarativas de transição por forma;
- metadados.

Character garante apenas invariantes estruturais.

## Não responsabilidades

Character não:

- calcula regras de GURPS;
- calcula custos, dano, cura, carga, movimento ou NH;
- interpreta pré-requisitos;
- calcula máximos de pools;
- converte dano entre formas;
- consome custos de transformação;
- executa testes;
- verifica requisitos, gatilhos ou impedimentos;
- avança tempo;
- ativa automaticamente uma transformação;
- implementa limites de Morfo.

Essas responsabilidades pertencem a Rules e aos serviços operacionais apropriados.

## Composição

```text
Character
├── Identity
├── Attributes
├── SecondaryCharacteristics
├── Pools
├── Advantages
├── Perks
├── Disadvantages
├── Quirks
├── Skills
├── Techniques
├── Spells
├── Powers
├── Equipment
├── Attacks
├── Languages
├── Familiarities
├── Templates
├── TemplateApplications
├── AlternateFormSets
├── State
└── Metadata
```

## Templates

`templates` contém pacotes importados e independentes.

`templateApplications` registra incorporações permanentes.

Importar e incorporar são operações distintas.

Uma aplicação removida permanece no histórico com status `removed`.

## Formas Alternativas

`alternateFormSets` contém conjuntos de formas mutuamente exclusivas.

Cada conjunto possui:

- forma-base;
- forma ativa;
- formas disponíveis;
- mecanismo;
- política de continuidade;
- regras de transição compartilhadas como defaults;
- proveniência da ativação atual.

Cada forma pode possuir:

- template vinculado;
- trait de origem;
- snapshot transitório;
- regras de transição efetivas;
- override de transição;
- resolução explicável das regras.

Somente uma forma fica ativa dentro de cada conjunto.

Conjuntos independentes podem coexistir.

Templates permanentes como Elfo, Vampiro, Orc, Lich, Anão ou Licantropo não são removidos quando uma forma temporária muda.

## Continuidade de estado

O estado atualmente ativo permanece em:

```text
Pools
State
Equipment
```

Formas inativas preservam snapshots em:

```text
AlternateForm.runtimeState
```

`AlternateFormSet.statePolicy` define se cada categoria é:

```text
shared
perForm
```

A política pode controlar PV, PF, Reserva de Energia, ferimentos, condições, efeitos e equipamento.

## Regras de transição

`AlternateFormSet.transitionRules` contém padrões compartilhados.

`AlternateForm.transitionRules` contém as regras efetivas daquela forma.

Essas regras podem declarar:

- tempo-base;
- passos relativos de tempo;
- manobra;
- custos;
- testes;
- requisitos;
- gatilhos;
- ativação involuntária;
- possibilidade de interrupção;
- duração;
- retorno;
- impedimentos.

Character armazena essas declarações, mas não as executa.

## Dados permanentes

São permanentes estruturalmente:

- identidade;
- atributos e secundárias;
- traits;
- perícias, técnicas e mágicas;
- equipamentos cadastrados;
- idiomas e familiaridades;
- templates;
- histórico de aplicações;
- definição dos conjuntos de formas;
- políticas e regras declaradas;
- metadados.

Componentes temporários da forma ativa permanecem serializados enquanto estiverem ativos, com proveniência explícita.

## Dados transitórios

Incluem:

- valores atuais de pools;
- ferimentos;
- condições;
- efeitos;
- estado de combate;
- estado e usos de equipamentos;
- forma ativa;
- snapshots das formas inativas.

## Invariantes

Um Character válido deve possuir:

- Identity com `id` e `name`;
- Attributes com ST, DX, IQ e HT;
- Pools válidos;
- State válido;
- coleções estruturais válidas;
- templates válidos;
- histórico de aplicações válido;
- conjuntos de formas válidos.

Cada conjunto de formas deve possuir:

- pelo menos uma forma;
- forma-base existente;
- forma ativa existente;
- IDs únicos;
- política de estado válida;
- regras de transição default válidas.

Cada forma deve possuir:

- `runtimeState` válido;
- regras de transição nulas ou válidas;
- `return.targetFormId`, quando informado, apontando para uma forma do mesmo conjunto.

Essas invariantes não executam regras de GURPS.

## Serialização

Character deve ser serializável para JSON sem perda estrutural.

A serialização inclui:

- templates;
- aplicações;
- conjuntos de formas;
- forma ativa;
- políticas e suas resoluções;
- regras de transição e suas resoluções;
- overrides manuais;
- snapshots de estado.

Ela não inclui métodos, referências circulares, estado de interface ou dependências externas.

## Direção de implementação

A implementação privilegia:

- composição;
- objetos simples;
- funções puras;
- imutabilidade quando viável;
- operações reversíveis;
- proveniência explícita;
- separação entre dados, regras e apresentação.

## Checklist

- [x] Criar Character.js
- [x] Validar invariantes
- [x] Validar serialização
- [x] Integrar templates
- [x] Integrar histórico de aplicações
- [x] Integrar conjuntos de formas
- [x] Integrar linker seguro
- [x] Integrar política de continuidade
- [x] Integrar snapshots por forma
- [x] Integrar regras de transição por forma
- [x] Integrar overrides e resoluções explicáveis
- [x] Aprovar Character v1.4
