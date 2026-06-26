# ADR-0045 — Autoridade mecânica de Skills e Techniques

**Status:** Proposto para revisão  
**Data:** 2026-06-26  
**Bloco:** DOM-SKILL-1.3

## Contexto

A auditoria estrutural de DOM-SKILL confirmou que:

- `Character.skills` e `Character.techniques` são as coleções persistentes canônicas;
- `Skills.js` e `Techniques.js` normalizam, validam e serializam estrutura;
- as operações atuais alteram dados declarados sem calcular NH;
- `importedLevel`, `importedRelativeLevel`, defaults e limites importados são dados preservados, não resultados soberanos;
- a UI, o importador e o schema não podem se tornar autoridades mecânicas temporárias.

Ainda falta definir uma autoridade única para NH final, resolução de defaults, limites de técnicas e diagnósticos mecânicos.

## Decisão

A autoridade mecânica será um módulo puro do motor, denominado conceitualmente **Skill Mechanics Engine**.

Ele consumirá dados canônicos validados e produzirá resultados derivados efêmeros. Não persistirá NH calculado no `Character` e não alterará as coleções de Skills ou Techniques.

```text
Character canônico
+ regras/tabelas do motor
+ modificadores canônicos explicitamente resolvidos
→ Skill Mechanics Engine
→ resultados derivados + diagnósticos
→ Application Read Model
→ UI
```

O nome físico dos arquivos e funções poderá ser refinado durante a implementação, mas a autoridade e as fronteiras desta ADR permanecem obrigatórias.

## Autoridades

### Skills e Techniques

O domínio estrutural continua autoridade para:

- identidade interna e externa;
- atributo-base e dificuldade declarados;
- pontos investidos;
- referências explícitas entre técnica e perícia;
- defaults, limites e metadados declarados ou importados;
- validação, criação, serialização e operações imutáveis.

O domínio estrutural não calcula NH final.

### Skill Mechanics Engine

O motor será autoridade exclusiva para:

- converter atributo, dificuldade e pontos em nível-base;
- aplicar regras mecânicas de progressão;
- resolver defaults por identidade explícita;
- resolver técnicas a partir de sua perícia-base explícita;
- aplicar limites mecânicos de técnica;
- compor modificadores canônicos já resolvidos por seus domínios proprietários;
- detectar referências ausentes, ambiguidades, ciclos e entradas mecanicamente inválidas;
- produzir NH final, NH relativo, origem do resultado e diagnósticos.

### Point Ledger

O Point Ledger permanece autoridade contábil.

Ele contabiliza os pontos declarados e validados de Skills e Techniques. O motor mecânico não altera custos, não cria pontos e não mantém contabilidade paralela.

### Aplicação

A aplicação:

- coordena comandos estruturais;
- solicita resolução mecânica ao motor;
- publica resultados no read model;
- mantém histórico, revisão, persistência e atomicidade;
- não replica fórmulas de GURPS.

### Importadores

Importadores preservam dados externos e identidades, mas não certificam NH calculado.

`importedLevel` e campos semelhantes permanecem disponíveis para comparação, auditoria e diagnóstico de divergência.

### UI

A UI apresenta:

- dados declarados;
- NH e NH relativo calculados pelo motor;
- origem do resultado;
- defaults considerados;
- limites aplicados;
- avisos e bloqueios.

A UI não executa tabelas, fórmulas, resolução de defaults ou limites.

## Resultado mecânico portátil

O contrato inicial deverá produzir um resultado serializável semelhante a:

```js
{
  entityId: "skill-001",
  entityType: "skill",
  status: "resolved" | "blocked",
  level: 12,
  relativeLevel: 1,
  basis: {
    kind: "trained" | "default",
    sourceId: null,
    attribute: "DX"
  },
  appliedModifierIds: [],
  diagnostics: []
}
```

Esse objeto é projeção derivada. Ele não é persistido como autoridade no `Character`.

## Identidade e referências

Defaults e vínculos de técnica devem usar identidade explícita.

Ordem de preferência:

1. ID canônico da entidade no `Character`;
2. identidade externa preservada e resolvida explicitamente durante importação ou composição;
3. diagnóstico bloqueante ou não resolvido.

Associação mecânica nova por nome é proibida.

O fallback legado `resolvedByName` do importador não se torna contrato do motor e deve ser eliminado ou confinado por etapa própria.

## Ordem de resolução

A implementação deverá respeitar, no mínimo:

1. validar entradas estruturais;
2. resolver referências explícitas;
3. detectar ausências e ciclos antes do cálculo final;
4. calcular a base treinada quando aplicável;
5. avaliar defaults permitidos;
6. selecionar o resultado válido conforme as regras do sistema;
7. resolver técnicas e aplicar seus limites;
8. aplicar modificadores canônicos autorizados;
9. emitir resultado e diagnósticos.

As fórmulas e tabelas exatas serão introduzidas em contratos e testes próprios, não nesta ADR.

## Atomicidade e determinismo

Para o mesmo snapshot canônico e o mesmo conjunto de regras, o resultado deve ser determinístico.

Falha ao resolver uma entidade não pode alterar dados persistentes. A resolução completa pode retornar resultados parciais somente quando o contrato distinguir explicitamente entidades resolvidas e bloqueadas.

## Compatibilidade

- campos importados continuam preservados;
- valores importados podem ser comparados com resultados calculados;
- divergência gera diagnóstico, não substituição silenciosa;
- nenhum cache persistente de NH será criado como segunda autoridade;
- nenhum normalizador ou resolver paralelo será introduzido na UI, aplicação ou importador.

## Alternativas rejeitadas

### Persistir NH final em cada Skill ou Technique

Rejeitada porque criaria estado derivado sujeito a obsolescência quando atributos, pontos, Traits, equipamentos ou regras mudassem.

### Calcular durante criação ou validação estrutural

Rejeitada porque misturaria schema persistente com regras mecânicas e tornaria validação dependente do personagem completo.

### Calcular na aplicação

Rejeitada porque duplicaria o motor e dificultaria testes determinísticos e reutilização.

### Calcular na UI

Rejeitada porque violaria a arquitetura central e produziria divergência entre telas, importação e persistência.

### Resolver referências por nome

Rejeitada porque nomes são editoriais, podem se repetir e não constituem identidade mecânica.

## Invariantes

1. `Character.skills` e `Character.techniques` permanecem as fontes persistentes canônicas.
2. NH final é derivado pelo motor e não persistido como autoridade.
3. O Point Ledger continua sendo a única autoridade contábil.
4. Importadores preservam; não calculam nem certificam regras.
5. A aplicação orquestra; não replica fórmulas.
6. A UI apresenta; não calcula.
7. Defaults e técnicas usam referências explícitas.
8. Associação mecânica por nome é proibida.
9. Resultados mecânicos são determinísticos e diagnosticáveis.
10. Alterar fórmulas, tabelas ou precedências exige testes normativos e atualização documental própria.

## Consequências

A implementação mecânica poderá avançar em blocos pequenos:

1. contrato de resultado e diagnósticos;
2. progressão treinada de Skills;
3. resolução de defaults;
4. resolução e limites de Techniques;
5. integração com modificadores canônicos;
6. projeção no Application Read Model;
7. comparação não autoritativa com valores importados.

Nenhum desses blocos deve mover cálculo para o schema, aplicação ou UI.
