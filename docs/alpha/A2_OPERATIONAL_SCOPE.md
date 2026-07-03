# A2 — escopo operacional da próxima fatia Alpha

Esta fatia começa a partir da `main` atual após a integração de S5.

## Objetivo

Iniciar a sequência A2–A8 com a menor fatia verificável que aumente a utilidade da Alpha Mobile sem reabrir S4 e sem criar infraestrutura paralela.

A2 deve transformar o estado consolidado por S5 em uma entrega operacional focada: escolher uma superfície vertical concreta da ficha, conectar seu uso real ao composition root mobile existente e provar por regressão que ela continua funcionando após render, remount, troca de modo e persistência.

## Entradas obrigatórias

- `main` após PR #265: `e287b40f8b1c5070ed3d0a44c691c4424ee17fb1`.
- S4 Idiomas/Culturas integrada pela PR #262.
- S4 Traços integrada pela PR #263.
- S4 Perícias/Técnicas integrada pela PR #264.
- S5 integrada pela PR #265.
- Nenhuma PR escritora aberta ao iniciar A2.

## Escopo permitido

- Definir uma única superfície vertical para A2 antes de qualquer expansão.
- Usar exclusivamente o composition root mobile canônico.
- Reutilizar a aplicação, sessão, runtime, command registry, executor, persistência e `postRenderLifecycle` existentes.
- Acrescentar regressões de comportamento executável para a superfície escolhida.
- Corrigir apenas falhas demonstradas por teste, CI, thread P1/P2 ou auditoria.
- Atualizar a documentação de continuidade da Alpha quando houver evidência nova.

## Fora de escopo

- Reabrir S4 Idiomas/Culturas, Traços, Perícias/Técnicas ou S5 sem regressão nova demonstrada.
- Iniciar A3 antes de A2 passar no gate.
- Alterar regras GURPS, domínio, sessão, executor, command registry ou persistência.
- Criar pipeline, registry, normalizador, executor, sessão, persistência ou composition root paralelo.
- Adicionar abstração genérica sem uso real na superfície A2.
- Resolver múltiplas superfícies verticais na mesma PR.

## Gate mínimo

A PR A2 só pode ser integrada quando houver evidência de que:

- há uma única PR escritora aberta;
- a branch nasceu da `main` atual;
- CI `Tests` está verde no head final;
- zero findings P1/P2 permanecem abertos;
- a superfície A2 opera pelo lifecycle canônico e pela montagem DOM explícita;
- render repetido, remount, troca de modo e persistência não duplicam editores, listeners ou registros;
- nenhum caminho executável mobile usa `MutationObserver`, timer, microtask ou string surgery como mecanismo de montagem/remontagem runtime;
- as invariantes arquiteturais seguem preservadas: motor calcula, schema declara, aplicação orquestra, UI apresenta/coleta intenção e persistência guarda snapshots.

## Próxima ação material

Auditar o estado real da Alpha Mobile na `main` pós-S5, escolher a menor superfície vertical ainda não validada por teste integrado A2 e acrescentar uma regressão focada antes de qualquer mudança visual ou expansão funcional.
