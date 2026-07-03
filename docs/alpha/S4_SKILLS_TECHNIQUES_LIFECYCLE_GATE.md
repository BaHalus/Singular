# S4 Perícias/Técnicas — gate de migração para lifecycle canônico

Esta fatia migra Perícias/Técnicas para o `postRenderLifecycle` canônico, preservando a regra arquitetural da Alpha: o motor calcula, o schema declara, a aplicação orquestra, a UI apresenta/coleta intenção e a persistência guarda snapshots.

## Escopo obrigatório

- Remover `MutationObserver` do caminho executável de Perícias/Técnicas.
- Remover reescrita runtime por string como mecanismo de montagem/remontagem.
- Registrar aprimorador DOM idempotente no `postRenderLifecycle` canônico.
- Preservar modo Criação/Mesa, acessibilidade, bootstrap independente e teardown local.
- Manter helpers legados somente quando forem compatibilidade fora do runtime executável.
- Não alterar domínio, sessão, executor, command registry, persistência ou regras GURPS.

## Regressões mínimas

- render canônico com editores de Perícias/Técnicas montados por DOM explícito;
- atualização de perícia e técnica com persistência preservada;
- bloqueio de edição no modo Mesa;
- render repetido sem duplicação de editores;
- remount sem vazamento de listener/registro;
- ausência de construção, observação e desconexão de `MutationObserver` em Perícias/Técnicas.

## Critério de integração

A PR só pode ser integrada com branch baseada na `main` atual, CI verde no head final, zero findings P1/P2 abertos e diffs restritos à fatia de Perícias/Técnicas.
