# A4 — escopo operacional da próxima fatia Alpha

Esta fatia começa a partir da `main` atual após a integração de A3.

## Objetivo

Continuar a validação operacional concreta da Alpha Mobile escolhendo uma única superfície vertical ainda não coberta por regressão integrada pós-A3 e provando que ela permanece estável no composition root canônico.

A4 produz evidência executável mínima de que a superfície escolhida continua funcionando após render, remount, troca de modo e persistência sem criar caminhos paralelos.

## Superfície A4 escolhida

A superfície operacional concreta de A4 é **Magias**.

A4 migra a montagem dos editores mobile de Magias para o `postRenderLifecycle` canônico, preservando o helper legado somente como compatibilidade para roots mínimos sem DOM real.

## Entradas obrigatórias

- `main` após PR #267: `a99d1d822dbf7a5aea649fe275b33f6e8319baf6`.
- S4 Idiomas/Culturas integrada pela PR #262.
- S4 Traços integrada pela PR #263.
- S4 Perícias/Técnicas integrada pela PR #264.
- S5 integrada pela PR #265.
- A2 integrada pela PR #266.
- A3 integrada pela PR #267.
- Nenhuma PR escritora aberta ao iniciar A4.

## Escopo permitido

- Definir uma única superfície vertical concreta para A4 antes de qualquer expansão.
- Reutilizar exclusivamente o composition root mobile canônico e o `postRenderLifecycle` existente.
- Acrescentar regressão focada de comportamento executável para a superfície A4.
- Confirmar que render repetido, remount, troca de modo e persistência não duplicam editores, listeners ou registros.
- Corrigir apenas falhas demonstradas por teste, CI, thread P1/P2 ou auditoria.
- Atualizar a documentação de continuidade da Alpha quando houver evidência nova.

## Fora de escopo

- Reabrir S4, S5, A2 ou A3 sem regressão nova demonstrada.
- Iniciar A5 antes de A4 passar no gate.
- Alterar regras GURPS, domínio, sessão, executor, command registry ou persistência.
- Criar pipeline, registry, normalizador, executor, sessão, persistência ou composition root paralelo.
- Resolver múltiplas superfícies verticais na mesma PR.
- Fazer mudança visual ampla sem regressão operacional mínima.

## Evidência executável A4

- `CharacterMobileSpellEditApp` registra aprimorador no `postRenderLifecycle` canônico.
- O caminho DOM canônico de Magias monta editores por append DOM explícito e idempotente.
- O render composto executa o lifecycle sem duplicar editores após render repetido, remount e troca de modo.
- A regressão `A4 spell controls remount through canonical post-render lifecycle without duplication` cobre render composto, render repetido, modo Mesa, retorno ao modo Criação, remount e teardown do registro.

## Gate mínimo

A PR A4 só pode ser integrada quando houver evidência de que:

- há uma única PR escritora aberta;
- a branch nasceu da `main` atual;
- CI `Tests` está verde no head final;
- zero findings P1/P2 permanecem abertos;
- a superfície A4 opera pelo lifecycle canônico e pela montagem DOM explícita;
- render repetido, remount, troca de modo e persistência não duplicam editores, listeners ou registros;
- nenhum caminho executável mobile usa `MutationObserver`, timer, microtask ou string surgery como mecanismo de montagem/remontagem runtime;
- as invariantes arquiteturais seguem preservadas: motor calcula, schema declara, aplicação orquestra, UI apresenta/coleta intenção e persistência guarda snapshots.

## Próxima ação material

Revalidar CI e threads da PR #268. Com CI verde, zero P1/P2 e head revalidado, integrar A4 e abrir A5 somente depois do merge.