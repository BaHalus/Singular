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

- [ ] tabelas conhecidas de autocontrole cobertas integralmente;
- [ ] tabelas conhecidas de frequência cobertas integralmente;
- [ ] valores desconhecidos preservados sem aproximação;
- [ ] ajustes operacionais separados da matemática de pontos;
- [ ] escolhas por chave e obrigatoriedade auditável;
- [ ] ausência de associação por nome ou posição;
- [ ] `TraitModifierCost` consumido com arredondamento `none`;
- [ ] autocontrole e frequência aplicados antes do único arredondamento final;
- [ ] semântica positiva e negativa de `roundCostDown` coberta;
- [ ] estados incompleto, conflito e não suportado propagados;
- [ ] importação preserva os campos GCS relevantes;
- [ ] projeções históricas permanecem estáveis com valores neutros;
- [ ] nenhuma autoridade persistente ou pipeline paralelo criado;
- [ ] suíte integral verde;
- [ ] CI canônica verde no head final;
- [ ] nenhuma revisão bloqueante ou thread aberta;
- [ ] integração à `main` somente após validação final.

## Evidências finais

Devem ser registradas na PR:

- SHA final revisado;
- execução canônica de `Tests` concluída com sucesso;
- estado das revisões e threads;
- confirmação de que a base é a `main` atual;
- confirmação de que a PR foi integrada sem commits posteriores não validados.
