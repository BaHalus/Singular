# GATE-TEMPLATE-CLOSE — Certificação de encerramento de Templates

**Status:** Aprovado mediante CI canônica verde  
**Domínio:** Templates  
**Decisão final:** ADR-0034

## Objetivo

Certificar que DOM-TEMPLATE-1.0 a 1.5 formam um domínio único, sem pipelines paralelos, desde declaração e importação até aplicação, reconciliação, histórico e save/load.

## Resultado esperado

```text
Templates — fechado
APIs públicas — estáveis
Parser GCT — único
Aplicação automática na importação — proibida
Próxima frente — outro domínio arquitetural
```

## Matriz de certificação

### Fundação soberana

Certificado por:

- `Templates.test.js`;
- `Templates.md`;
- ADR-0029.

Casos:

- identidade única;
- entries canônicas;
- compatibilidade derivada;
- imutabilidade;
- dados desconhecidos;
- round trip.

### Composição declarativa

Certificado por:

- `TemplateComposition.test.js`;
- `TemplateComposition.md`;
- ADR-0030.

Casos:

- domínios conhecidos e futuros;
- referências explícitas;
- snapshots inline;
- regras opacas;
- ausência de cálculo e vínculo por nome.

### Dependências

Certificado por:

- `TemplateDependencyResolver.test.js`;
- `TemplateDependencyResolver.md`;
- ADR-0031.

Casos:

- referências internas e externas;
- ordem determinística;
- dependências ausentes;
- referências pendentes;
- ambiguidade externa;
- ciclos;
- conflitos explícitos;
- proveniência por caminhos.

### Aplicação ao Character

Certificado por:

- `TemplateApplicationOperations.test.js`;
- `TemplateOperations.test.js`;
- `TemplateApplicationOperations.md`;
- ADR-0032.

Casos:

- análise, plano e revalidação;
- aplicação atômica;
- remoção segura;
- atualização de versão;
- escolhas opacas;
- linhagem;
- recibos;
- wrappers retrocompatíveis.

### Custo e reconciliação

Certificado por:

- `TemplatePointReconciliation.test.js`;
- `TemplateCompositionPointReconciliation.test.js`;
- `TemplateCompositionPointReconciliationReadiness.test.js`;
- `TemplatePointReconciliationImmutability.test.js`;
- ADR-0033.

Casos:

- importado e calculado separados;
- valores negativos;
- diferença assinada;
- composição parcial;
- divergência individual e total;
- rejeição de resolução não pronta;
- imutabilidade.

### Importação soberana

Certificado por:

- `TemplatesImporter.test.js`;
- `TemplateImportOperations.test.js`;
- `TemplateImportCatalogMerge.test.js`;
- `TemplateClosureGate.test.js`;
- `TemplateImportOperations.md`;
- ADR-0034.

Casos:

- parser GCT único;
- ID externo preservado;
- ID anônimo determinístico;
- versão ausente ou não suportada;
- nó desconhecido opaco;
- duplicata equivalente;
- conflito soberano;
- conflito de identidade externa;
- plano obsoleto;
- mesclagem explícita de catálogo.

### Fatia vertical

`TemplateClosureGate.test.js` certifica:

```text
GCT
→ Character.templates
→ reconciliação
→ aplicação explícita
→ proveniência
→ recibo
→ save/load
→ remoção
```

Também certifica que pacote desconhecido permanece diagnóstico e não é aplicado.

### Regressão de Forma Alternativa e Morfose

DOM-TEMPLATE continua respeitando:

```text
AlternateFormSet
FormTransitionPlanner
FormTransitionExecutor
MorphProfile
MorphPointLimit
```

Nenhum planner, executor, runtime ou histórico paralelo foi criado.

Certificado pela suíte completa `npm test` e pelos gates anteriores desses domínios.

### CI canônica

```text
npm test
→ node --test
```

A certificação usa descoberta integral e não uma lista reduzida de testes.

## Lacunas fechadas no encerramento

1. pacotes anônimos recebiam IDs aleatórios;
2. nós desconhecidos existiam apenas como diagnóstico bruto;
3. importação não possuía plano revalidável;
4. conflitos de catálogo não tinham política explícita;
5. `CharacterImporter` não expunha relatório canônico;
6. faltava uma regressão vertical única até save/load e remoção.

Correções:

- identidade anônima por hash canônico;
- `opaqueTemplates` preserva pacote desconhecido;
- análise, plano, execução e recibo;
- políticas `reject`, `keep-existing` e `replace`;
- `templateImportReport` no snapshot e diagnóstico;
- `TemplateClosureGate.test.js`.

## Política após fechamento

DOM-TEMPLATE entra em manutenção fechada.

Não abrir:

```text
DOM-TEMPLATE-1.6
```

Reabertura exige ADR próprio, justificativa de domínio e repetição integral deste gate.
