# Gate — DOM-TRAIT-1.4

## Entrada

- DOM-TRAIT-1.3 integrado à `main`;
- CI canônica do head integrado verde;
- threads de revisão do bloco anterior resolvidas;
- branch criada a partir da `main` integrada.

## Escopo autorizado

- declarações canônicas de autocontrole e frequência;
- ajustes operacionais de autocontrole sem efeito em pontos;
- `roundCostDown` como declaração do arredondamento final;
- escolhas explícitas identificadas por chave;
- composição do custo individual após modificadores;
- compatibilidade de leitura com `cr`, `cr_adj`, `frequency`, `round_down` e `replacements`;
- testes, documentação e ADR-0039.

## Fora do escopo

- grupos de habilidades alternativas;
- promoção do custo individual a `pointValue.calculatedPoints`;
- agregação de pontos do Character;
- interpretação de escolhas de outros domínios;
- alterações em DOM-TEMPLATE, Morfose ou Forma Alternativa;
- qualquer cálculo na UI.

## Critérios obrigatórios

- [x] tabelas conhecidas de autocontrole cobertas integralmente;
- [x] tabelas conhecidas de frequência cobertas integralmente;
- [x] valores desconhecidos preservados sem aproximação;
- [x] ajustes operacionais separados da matemática de pontos;
- [x] escolhas por chave e obrigatoriedade auditável;
- [x] ausência de associação por nome ou posição;
- [x] `TraitModifierCost` consumido com arredondamento `none`;
- [x] autocontrole e frequência aplicados antes do único arredondamento final;
- [x] semântica positiva e negativa de `roundCostDown` coberta;
- [x] estados incompleto, conflito e não suportado propagados;
- [x] importação preserva os campos GCS relevantes;
- [x] projeções históricas permanecem estáveis com valores neutros;
- [x] nenhuma autoridade persistente ou pipeline paralelo criado;
- [x] suíte integral verde;
- [x] CI canônica verde no head final;
- [x] nenhuma revisão bloqueante ou thread aberta;
- [x] integração à `main` somente após validação final.

## Evidências finais

A PR do bloco registra:

- SHA final revisado;
- execução canônica de `Tests` concluída com sucesso;
- estado das revisões e threads;
- confirmação de que a base é a `main` atual;
- confirmação de que a integração ocorreu sem commits posteriores não validados.
