# A5 — escopo operacional da próxima fatia Alpha

Esta fatia começa a partir da `main` atual após a integração de A4.

## Objetivo

Continuar a validação operacional concreta da Alpha Mobile escolhendo uma única superfície vertical ainda não coberta por regressão integrada pós-A4 e provando que ela permanece estável no composition root canônico.

A5 produz evidência executável mínima de que a superfície escolhida continua funcionando após render, remount, troca de modo e persistência sem criar caminhos paralelos.

## Superfície A5 escolhida

A superfície operacional concreta de A5 é **Poderes**.

A5 migra a montagem dos editores mobile de Poderes para o `postRenderLifecycle` canônico, preservando o helper legado somente como compatibilidade para roots mínimos sem DOM real.

## Entradas obrigatórias

- `main` após PR #268: `2106b2729acd220f1c7b03da9bc3d8d5c9af17a4`.
- S4 Idiomas/Culturas integrada pela PR #262.
- S4 Traços integrada pela PR #263.
- S4 Perícias/Técnicas integrada pela PR #264.
- S5 integrada pela PR #265.
- A2 integrada pela PR #266.
- A3 integrada pela PR #267.
- A4 integrada pela PR #268.
- Nenhuma outra PR escritora aberta ao iniciar A5.

## Escopo permitido

- Definir uma única superfície vertical concreta para A5 antes de qualquer expansão.
- Reutilizar exclusivamente o composition root mobile canônico e o `postRenderLifecycle` existente.
- Acrescentar regressão focada de comportamento executável para a superfície A5.
- Confirmar que render repetido, remount, troca de modo e persistência não duplicam editores, listeners ou registros.
- Corrigir apenas falhas demonstradas por teste, CI, thread P1/P2 ou auditoria.
- Atualizar a documentação de continuidade da Alpha quando houver evidência nova.

## Fora de escopo

- Reabrir S4, S5, A2, A3 ou A4 sem regressão nova demonstrada.
- Iniciar A6 antes de A5 passar no gate.
- Alterar regras GURPS, domínio, sessão, executor, command registry ou persistência.
- Criar pipeline, registry, normalizador, executor, sessão, persistência ou composition root paralelo.
- Resolver múltiplas superfícies verticais na mesma PR.
- Fazer mudança visual ampla sem regressão operacional mínima.

## Evidência executável A5

- `CharacterMobilePowerEditApp` registra aprimorador no `postRenderLifecycle` canônico.
- O caminho DOM canônico de Poderes monta editores por append DOM explícito e idempotente.
- O render composto executa o lifecycle sem duplicar editores após render repetido, remount e troca de modo.
- A regressão `A5 power controls remount through canonical post-render lifecycle without duplication` cobre render composto, render repetido, modo Mesa, retorno ao modo Criação, remount e teardown do registro.

## Gate mínimo

A PR A5 só pode ser integrada quando houver evidência de que:

- há uma única PR escritora aberta;
- a branch nasceu da `main` atual;
- CI `Tests` está verde no head final;
- zero findings P1/P2 permanecem abertos;
- a superfície A5 opera pelo lifecycle canônico e pela montagem DOM explícita;
- render repetido, remount, troca de modo e persistência não duplicam editores, listeners ou registros;
- nenhum caminho executável mobile usa `MutationObserver`, timer, microtask ou string surgery como mecanismo de montagem/remontagem runtime;
- as invariantes arquiteturais seguem preservadas: motor calcula, schema declara, aplicação orquestra, UI apresenta/coleta intenção e persistência guarda snapshots.

## Próxima ação material

Revalidar CI e threads da PR #269. Com CI verde, zero P1/P2 e head revalidado, integrar A5 e abrir A6 somente depois do merge.
