# Gate — DOM-TRAIT-1.5

## Entrada

- DOM-TRAIT-1.4 integrado à `main`;
- CI canônica do bloco anterior verde;
- `Character.traits` como autoridade canônica;
- custo individual soberano já disponível;
- grupos alternativos e promoção final ainda pendentes.

## Escopo autorizado

- políticas persistentes de grupos alternativos;
- avaliação de contribuição entre Traits;
- importação de containers GCS `alternative_abilities`;
- autoridade final persistida em `pointValue`;
- análise, plano, revalidação e execução atômica;
- fingerprints de fonte e alvo;
- recibos;
- save/load vertical;
- documentação e ADR-0040;
- encerramento formal de DOM-TRAIT.

## Fora do escopo

- agregação total de pontos do Character;
- Point Ledger;
- pré-requisitos;
- features aplicadas a outros domínios;
- ataques derivados;
- alterações estruturais em Templates;
- reabertura de Morfose ou Forma Alternativa;
- cálculo na UI;
- associação por nome.

## Critérios obrigatórios

- [x] `Character.traitAlternativeGroups` é a única autoridade persistente das políticas;
- [x] membros continuam em `Character.traits` e referenciam o grupo por ID;
- [x] maior custo individual contribui integralmente;
- [x] demais membros usam fator padrão de 1/5;
- [x] arredondamento do grupo é explícito;
- [x] grupos unitários são rejeitados;
- [x] grupos aceitam somente vantagens com custo não negativo;
- [x] primária explícita inválida ou duplicada gera conflito;
- [x] empate sem primária é resolvido deterministicamente sem nome;
- [x] estados incompleto, conflito e não suportado são propagados;
- [x] container GCS `alternative_abilities` é importado por identidade estrutural;
- [x] container alternativo ancestral mais próximo possui o membro;
- [x] IDs externos, referência, `round_down`, metadados e `raw` são preservados;
- [x] importador não calcula nem promove custo;
- [x] escolhas obrigatórias bloqueiam promoção quando incompletas;
- [x] `calculatedPoints` recebe a contribuição final, não o custo individual bruto;
- [x] custo individual permanece no recibo da autoridade;
- [x] pontos declarados e importados não são sobrescritos;
- [x] reconciliação divergente é preservada;
- [x] autoridade final é autovalidável;
- [x] `validateCharacter` confere identidade e contribuição da autoridade;
- [x] análise não altera o Character;
- [x] plano é efêmero, imutável e fingerprintado;
- [x] fonte mecânica e alvo persistente possuem fingerprints distintos;
- [x] mudança de fonte invalida plano;
- [x] mudança somente no alvo também invalida plano;
- [x] execução é atômica;
- [x] recibo preserva operação, plano, fingerprints e autoridades;
- [x] segunda execução coerente resulta em `no-op`;
- [x] execução sem efeito não congela nem altera o Character recebido;
- [x] save/load preserva políticas, valores e autoridades;
- [x] fluxo importação GCS → promoção → reconciliação → save/load está coberto;
- [x] nenhuma coleção ou pipeline paralelo foi criado;
- [x] nenhuma regra foi movida para a UI;
- [x] ADR-0040 registra as decisões;
- [x] documento arquitetural público foi criado;
- [ ] suíte integral verde no head final;
- [ ] CI canônica verde no head final;
- [ ] nenhuma revisão bloqueante ou thread aberta;
- [ ] PR pronta e integrada à `main`;
- [ ] `main` confirmada idêntica ao merge final.

## APIs congeladas ao encerrar

```text
TraitAlternativeGroupPolicies.js
TraitAlternativeGroups.js
TraitCostSourceProjection.js
TraitCostAuthorityAnalysis.js
TraitCostAuthorityPlan.js
TraitCostAuthorityExecutor.js
TraitFinalCostAuthority.js
```

Mudanças futuras nessas APIs exigem correção compatível ou nova decisão arquitetural. Não deve surgir outra autoridade de grupos, outro calculador final ou outro executor de promoção.

## Estado após o gate

```text
DOM-TRAIT — fechado, em manutenção
Próximo domínio — DOM-POINTS-1.0
```

## Evidências finais a registrar na PR

- SHA final revisado;
- execução canônica de `Tests` concluída com sucesso;
- estado de revisões e threads;
- confirmação de alinhamento com `main`;
- SHA do merge;
- confirmação pós-merge de igualdade com `main`.
