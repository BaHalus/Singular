# A7 — escopo operacional da próxima fatia Alpha

Esta fatia começa a partir da `main` atual após a integração de A6.

## Objetivo

Continuar a validação operacional concreta da Alpha Mobile escolhendo uma única superfície vertical ainda não coberta por regressão integrada pós-A6 e provando que ela permanece estável no composition root canônico.

A7 deve produzir evidência executável mínima de que a superfície escolhida continua funcionando após render, remount, troca de modo e persistência sem criar caminhos paralelos.

## Superfície A7 escolhida

A superfície operacional concreta de A7 é **Idiomas/Culturas — controles base de criação**.

A7 não reabre S4 como fatia ampla. O foco é retirar o último mecanismo operacional legado da superfície base de Idiomas/Culturas e provar que seus controles de adicionar, remover e reordenar entram pelo `postRenderLifecycle` canônico, sem `MutationObserver` e sem scheduler paralelo.

## Entradas obrigatórias

- `main` após PR #270: `2fb55ebe000a8e901864566ca89e51a6ae112994`.
- S4 Idiomas/Culturas integrada pela PR #262.
- S4 Traços integrada pela PR #263.
- S4 Perícias/Técnicas integrada pela PR #264.
- S5 integrada pela PR #265.
- A2 integrada pela PR #266.
- A3 integrada pela PR #267.
- A4 integrada pela PR #268.
- A5 integrada pela PR #269.
- A6 integrada pela PR #270.
- Nenhuma outra PR escritora aberta ao iniciar A7.

## Escopo permitido

- Definir uma única superfície vertical concreta para A7 antes de qualquer expansão.
- Reutilizar exclusivamente o composition root mobile canônico e o `postRenderLifecycle` existente quando aplicável.
- Acrescentar regressão focada de comportamento executável para a superfície A7.
- Confirmar que render repetido, remount, troca de modo e persistência não duplicam editores, listeners ou registros.
- Corrigir apenas falhas demonstradas por teste, CI, thread P1/P2 ou auditoria.
- Atualizar a documentação de continuidade da Alpha quando houver evidência nova.

## Fora de escopo

- Reabrir S4, S5, A2, A3, A4, A5 ou A6 sem regressão nova demonstrada.
- Iniciar A8 antes de A7 passar no gate.
- Alterar regras GURPS, domínio, sessão, executor, command registry ou persistência.
- Criar pipeline, registry, normalizador, executor, sessão, persistência ou composition root paralelo.
- Resolver múltiplas superfícies verticais na mesma PR.
- Fazer mudança visual ampla sem regressão operacional mínima.

## Evidência executável A7

- `CharacterMobileLanguageCultureApp` agora registra seus controles base no `postRenderLifecycle` canônico.
- O caminho executável da superfície base não instancia `MutationObserver`, mesmo quando um construtor é fornecido por opção.
- A regressão `A7 language culture base controls mount through post-render lifecycle without observers` cobre registro no lifecycle, idempotência e teardown local.
- A regressão `A7 language culture base controls survive render, remount and mode changes` cobre render repetido, remount, modo Mesa e retorno ao modo Criação sem duplicar editores ou ações.
- Não houve alteração de regras GURPS, domínio, sessão, executor, command registry, persistência ou pipeline paralelo.

## Gate mínimo

A PR A7 só pode ser integrada quando houver evidência de que:

- há uma única PR escritora aberta;
- a branch nasceu da `main` atual;
- CI `Tests` está verde no head final;
- zero findings P1/P2 permanecem abertos;
- a superfície A7 opera pelo composition root mobile canônico;
- render repetido, remount, troca de modo e persistência não duplicam editores, listeners ou registros;
- nenhum caminho executável da superfície A7 cria regra GURPS, domínio, sessão, executor, command registry, persistência ou pipeline paralelo;
- as invariantes arquiteturais seguem preservadas: motor calcula, schema declara, aplicação orquestra, UI apresenta/coleta intenção e persistência guarda snapshots.

## Próxima ação material

Revalidar CI e threads da PR #271. Com CI verde, zero P1/P2 e head revalidado, integrar A7 e abrir A8 somente depois do merge.
