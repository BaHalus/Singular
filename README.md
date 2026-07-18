# SINGULAR

Sistema de ficha para GURPS 4ª Edição, mobile-first, modular e executável no navegador.

A regra central do projeto continua sendo:

> O motor calcula. O schema declara. A aplicação orquestra. A UI apresenta e coleta intenção. A persistência guarda snapshots.

## Objetivos

- Mobile First.
- Interface compacta, legível e rápida durante a sessão.
- Motor desacoplado da interface.
- Schema declarativo.
- Aplicação responsável por orquestração, comandos e sessão.
- Persistência local versionada por snapshots.
- Biblioteca modular.
- Importação/exportação própria da SINGULAR e integração GCS planejada.
- Temas e acessibilidade.
- Regressões automatizadas contra duplicação de bootstraps, listeners e composition roots.

## Arquitetura atual

A aplicação é organizada em camadas com responsabilidades separadas:

1. **Schema** — declara a estrutura dos dados e contratos persistíveis.
2. **Motor** — concentra regras mecânicas de GURPS e cálculos derivados.
3. **Domínio e aplicação** — mantêm `ApplicationSession`, `CommandExecutor`, `CommandRegistry` e casos de uso.
4. **Persistência** — salva e restaura snapshots, nunca objetos vivos.
5. **UI mobile** — renderiza, apresenta estado e coleta intenção do usuário.
6. **Composition root mobile** — monta explicitamente a aplicação mobile e seus módulos de edição.

A UI não deve calcular custo, NH, dano, carga, defesa, pontos ou qualquer outro valor derivado de GURPS.

## Alpha mobile

O entrypoint executável é `mobile.html`.

Ele importa o composition root canônico em `src/ui/mobile/CharacterMobileCompositionRoot.js` e preserva o alias local `bootstrapCharacterMobileApp` apenas como compatibilidade do próprio entrypoint. Esse alias deve apontar para `bootstrapCharacterMobileCompositionRoot`.

O composition root mobile:

- chama `bootstrapCharacterMobileApp(options)` uma única vez;
- reutiliza a mesma aplicação, sessão, comandos, persistência e runtime;
- monta módulos independentes por funções `mount*` explícitas;
- coleta handles de teardown dos módulos;
- destrói os módulos em ordem inversa;
- destrói `interactions` e `modeSync` apenas no encerramento do root;
- não cria pipeline, normalizador, sessão, executor ou persistência paralela.

## Regressões protegidas

A suíte `npm test` deve permanecer verde e cobre, entre outros pontos:

- ausência de imports module duplicados no `mobile.html`;
- ausência de bootstraps feature diretos no entrypoint mobile;
- composition root único e explícito;
- módulos mobile independentes e desmontáveis;
- preservação de getters vivos como `character`, `session`, `html` e `mode`;
- helpers compartilhados de edição inline onde havia duplicação real;
- smoke leve da página executável mobile, sem dependência pesada de navegador.

Quando a CI passar a fornecer navegador, o smoke real de viewport mobile deve ser acrescentado sem substituir essas guardas leves.

## Persistência local

A persistência local armazena snapshots versionados de personagem e sessão. Ela não deve persistir instâncias vivas, closures, elementos DOM, listeners ou objetos de runtime.

## Roadmap

- v0.1 Fundação.
- v0.2 Motor.
- v0.3 Interface.
- v0.4 Identidade.
- v0.5 Atributos.
- v0.6 Vantagens e Desvantagens.
- v0.7 Perícias e Técnicas.
- v0.8 Equipamentos.
- v0.9 Poderes e Magias.
- v1.0 Biblioteca, GCS, acessibilidade e otimizações.

## Disciplina de evolução

Antes de ampliar campos ou editores, preserve as invariantes arquiteturais:

- uma única aplicação mobile por bootstrap;
- uma única sessão ativa por bootstrap;
- um único command registry/executor;
- um único composition root canônico;
- nenhum cálculo mecânico na UI;
- nenhum listener, observer ou bootstrap duplicado;
- nenhuma abstração genérica sem uso real em módulos concretos.

# SINGULAR — Automação de Handoff

Este repositório implementa o protocolo de sucessão definido nas issues **#356 → #340 → #354**, garantindo que o processo seja automatizado via GitHub Actions.

## Estrutura principal

### HANDOFF.md
- Documento que formaliza o protocolo de sucessão.
- Define a ordem: **Assumir (#356) → Sincronizar (#340) → Implementar (#354)**.

### .github/workflows/handoff.yml
- Workflow do GitHub Actions que dispara automaticamente em cada push na branch `main`.
- Executa três jobs:
  1. **Assumir coordenação** (#356)  
  2. **Sincronizar estado** (#340)  
  3. **Implementar MF6** (#354)

### scripts/mf6.sh
- Script que executa a implementação da fatia **MF6 — API pública única**.
- Atualiza o arquivo `MF6_STATUS.md` com o log da execução.

### MF6_STATUS.md
- Arquivo de log que registra o estado da implementação da fatia MF6.
- Atualizado automaticamente pelo workflow e pelo script `mf6.sh`.

## Fluxo de execução

1. **Push na branch main** → dispara o workflow.  
2. **Job 1**: valida coordenação conforme Issue #356.  
3. **Job 2**: consulta comentário 4970944834 da Issue #340 e sincroniza o estado.  
4. **Job 3**: executa `scripts/mf6.sh` e atualiza `MF6_STATUS.md`.  

## Objetivo
Garantir que o processo de handoff seja contínuo, transparente e automatizado, sem depender de execução manual.

---

ok
