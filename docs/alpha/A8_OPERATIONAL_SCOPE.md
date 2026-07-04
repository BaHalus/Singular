# A8 — gate operacional final da Alpha Mobile

Esta fatia começa a partir da `main` atual após a integração de A7.

## Objetivo

Executar a última validação operacional antes de declarar a Alpha Mobile utilizável, consolidando evidência executável de que as superfícies verticais integradas até A7 permanecem estáveis quando montadas pelo composition root mobile canônico.

A8 não abre uma nova área funcional ampla. A fatia deve atuar como gate final: revalidar a composição real, fechar lacunas mínimas demonstradas por teste ou CI e impedir regressão arquitetural.

## Entradas obrigatórias

- `main` após PR #271: `642deab767d64629ec861a6cea0c7137283dada9`.
- S4 Idiomas/Culturas integrada pela PR #262.
- S4 Traços integrada pela PR #263.
- S4 Perícias/Técnicas integrada pela PR #264.
- S5 integrada pela PR #265.
- A2 integrada pela PR #266.
- A3 integrada pela PR #267.
- A4 integrada pela PR #268.
- A5 integrada pela PR #269.
- A6 integrada pela PR #270.
- A7 integrada pela PR #271.
- Nenhuma outra PR escritora aberta ao iniciar A8.

## Escopo permitido

- Definir e executar uma regressão final mínima de composição operacional da Alpha Mobile.
- Confirmar que as superfícies integradas até A7 convivem no mesmo `postRenderLifecycle` canônico.
- Confirmar que render repetido, remount, troca Criação/Mesa e retorno a Criação não duplicam editores, listeners, ações ou registros.
- Corrigir apenas falhas demonstradas por teste, CI, thread P1/P2 ou auditoria.
- Atualizar o estado canônico da Alpha quando houver evidência nova.

## Fora de escopo

- Criar nova superfície funcional ampla.
- Reabrir S4, S5 ou A2–A7 sem regressão nova demonstrada.
- Alterar regras GURPS, domínio, sessão, executor, command registry ou persistência.
- Criar pipeline, registry, normalizador, executor, sessão, persistência ou composition root paralelo.
- Fazer mudança visual ampla sem regressão operacional mínima.

## Gate mínimo

A PR A8 só pode ser integrada quando houver evidência de que:

- há uma única PR escritora aberta;
- a branch nasceu da `main` atual pós-A7;
- CI `Tests` está verde no head final;
- zero findings P1/P2 permanecem abertos;
- a composição mobile final opera pelo composition root canônico;
- as superfícies integradas até A7 não duplicam editores, listeners, ações ou registros após render repetido, remount e troca de modo;
- nenhum caminho executável cria regra GURPS, domínio, sessão, executor, command registry, persistência ou pipeline paralelo;
- as invariantes arquiteturais seguem preservadas: motor calcula, schema declara, aplicação orquestra, UI apresenta/coleta intenção e persistência guarda snapshots.

## Próxima ação material

Adicionar a menor regressão final de composição operacional da Alpha Mobile e revalidar CI antes de qualquer merge final.
