# Gate — DOM-POINTS-1.0

## Entrada

- DOM-TRAIT-1.5 integrado à `main`;
- CI canônica do bloco anterior verde;
- autoridade final de custo de Traits fechada;
- orçamento de pontos e agregação total ainda ausentes.

## Escopo autorizado

- `Character.pointBudget` como autoridade persistente do orçamento;
- importação de orçamento e pontos não gastos do GCS;
- contribuições identificadas e explicáveis;
- relatórios por domínio;
- discrepâncias importado × calculado;
- totais conhecidos e completos;
- agregação por domínio e categoria;
- integração soberana de Traits;
- estados pendentes para domínios ainda sem autoridade;
- exclusão explícita de Templates e equipamento;
- documentação e ADR-0041;
- encerramento formal de DOM-POINTS-1.0.

## Fora do escopo

- cálculo de atributos e características secundárias;
- cálculo de perícias, técnicas ou magia;
- cálculo de idiomas, cultura ou Poderes;
- alteração das autoridades de Traits;
- custo direto de Templates;
- pontos de equipamento;
- persistência do ledger derivado;
- resolução automática de divergências;
- cálculo na UI.

## Critérios obrigatórios

- [x] `Character.pointBudget` é a autoridade persistente do orçamento;
- [x] declaração, importação e pontos não gastos importados permanecem separados;
- [x] campos vazios ou contendo espaços permanecem desconhecidos;
- [x] orçamento divergente não produz valor efetivo;
- [x] orçamento importado preserva candidatas, caminhos e valores brutos;
- [x] candidatas importadas divergentes geram conflito;
- [x] o ledger é derivado e não é persistido;
- [x] cada contribuição possui identidade, domínio, categoria, fonte e proveniência;
- [x] IDs de contribuição são únicos;
- [x] relatórios pertencem ao mesmo Character;
- [x] cada domínio possui no máximo um relatório;
- [x] `knownSpentPoints` soma apenas contribuições prontas;
- [x] `totalSpentPoints` só existe quando domínios obrigatórios estão completos;
- [x] contribuição não suportada bloqueia o domínio e o ledger;
- [x] contribuições prontas continuam visíveis em estado bloqueado;
- [x] Traits consomem apenas `finalCostAuthority` e `calculatedPoints`;
- [x] o ledger não recalcula custo de Traits;
- [x] discrepâncias de Traits preservam importado × calculado;
- [x] atributos e secundárias permanecem pendentes até suas autoridades próprias;
- [x] coleções vazias de outros domínios são completas com custo zero;
- [x] coleções preenchidas sem autoridade permanecem pendentes;
- [x] Poderes permanecem pendentes;
- [x] Templates são excluídos para impedir dupla contagem;
- [x] valores de catálogo de Templates permanecem como discrepâncias informativas;
- [x] equipamento é explicitamente excluído;
- [x] totais por domínio e categoria são produzidos;
- [x] pontos não gastos calculados só existem com orçamento e gasto completos;
- [x] divergência de pontos não gastos gera diagnóstico e discrepância;
- [x] objetos do domínio são profundamente imutáveis;
- [x] save/load preserva `pointBudget`;
- [x] importação GCS → Character → ledger está coberta;
- [x] regressão de campos em branco está coberta;
- [x] regressão de contribuição mista pronta/não suportada está coberta;
- [x] nenhuma regra foi movida para a UI;
- [x] nenhuma autoridade fechada foi reaberta;
- [x] ADR-0041 registra as decisões;
- [x] documento arquitetural público foi criado;
- [ ] suíte integral verde no head documental final;
- [ ] CI canônica verde no head documental final;
- [ ] nenhuma revisão bloqueante, comentário ou thread aberta;
- [ ] PR integrada à `main`;
- [ ] `main` confirmada idêntica ao merge final.

## APIs a congelar ao encerrar

```text
PointBudget.js
PointContribution.js
PointDomainReport.js
PointDiscrepancy.js
PointFingerprint.js
PointLedger.js
TraitPointDomain.js
CharacterPointDomains.js
CharacterPointLedger.js
```

Novos domínios devem fornecer relatórios e contribuições. Não deve surgir outro agregador total, outro orçamento persistente ou cálculo mecânico paralelo dentro do ledger.

## Estado pretendido após o gate

```text
DOM-POINTS-1.0 — fechado, em manutenção
Próxima frente — APP-CORE-1.0
```

## Evidências pendentes

- PR funcional: `#36`;
- head final: pendente após documentação;
- CI final: pendente;
- revisões finais: pendentes;
- merge: pendente;
- comparação pós-merge: pendente.
