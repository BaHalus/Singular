# S5 — escopo operacional da próxima fatia Alpha

Esta fatia começa a partir da `main` atual após a integração de S4 Perícias/Técnicas.

## Objetivo

Preparar a Alpha Mobile para a sequência A2–A8 sem reabrir as migrações S4 já concluídas.

S5 deve ser uma fatia de consolidação operacional: verificar a superfície mobile integrada, eliminar resíduos de bootstraps/listeners duplicados que ainda apareçam após S4 e deixar o caminho executável pronto para as próximas fatias verticais.

## Entradas obrigatórias

- `main` após PR #264: `c0985c02448cf00ab24006e1e9f3059c5545484f`.
- S4 Idiomas/Culturas integrada pela PR #262.
- S4 Traços integrada pela PR #263.
- S4 Perícias/Técnicas integrada pela PR #264.
- A2–A8 permanecem bloqueadas até S5 passar no gate.

## Escopo permitido

- Auditar o composition root mobile completo após S4.
- Fortalecer regressões de montagem/desmontagem integrada, quando necessário.
- Confirmar que todos os módulos mobile compartilham uma única sessão, runtime, command registry, executor, persistência e `postRenderLifecycle`.
- Confirmar que render repetido, remount e troca de modo não duplicam editores, listeners ou registros.
- Remover apenas resíduos comprovados da integração mobile.
- Atualizar documentação de continuidade da Alpha quando houver evidência nova.

## Fora de escopo

- Reabrir S4 Idiomas/Culturas, Traços ou Perícias/Técnicas sem regressão nova.
- Iniciar A2 antes do gate S5.
- Alterar regras GURPS, domínio, sessão, executor, command registry ou persistência.
- Criar pipeline, registry, normalizador, executor, sessão ou composition root paralelo.
- Adicionar abstração genérica sem uso real em módulo concreto.

## Gate mínimo

A PR S5 só pode ser integrada quando houver evidência de que:

- há uma única PR escritora aberta;
- a branch nasceu da `main` atual;
- CI `Tests` está verde no head final;
- zero findings P1/P2 permanecem abertos;
- nenhum caminho executável mobile usa `MutationObserver`, timer, microtask ou string surgery como mecanismo de montagem/remontagem runtime;
- a superfície mobile integrada preserva bootstrap independente, teardown local e lifecycle canônico;
- as invariantes arquiteturais seguem preservadas: motor calcula, schema declara, aplicação orquestra, UI apresenta/coleta intenção e persistência guarda snapshots.

## Próxima ação material

Auditar os testes existentes da composição mobile e acrescentar a menor regressão integrada que ainda falte para provar o compartilhamento do lifecycle e a ausência de duplicação após render/remount.