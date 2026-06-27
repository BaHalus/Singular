# GATE — APP-SKILL-EDIT 1.0

## Objetivo
Confirmar que Skills e Techniques possuem contratos mínimos de edição estrutural para a Alpha, sem UI, sem composição global e sem cálculo de regras GURPS na camada de aplicação.

## Escopo aprovado

### Operações de domínio
- Adicionar Skill.
- Atualizar Skill por ID.
- Remover Skill por ID.
- Reordenar Skill por ID.
- Localizar Skill por ID.
- Adicionar Technique.
- Atualizar Technique por ID.
- Remover Technique por ID.
- Reordenar Technique por ID.
- Localizar Technique por ID.

### Handlers de aplicação
- `skill.add`.
- `skill.update`.
- `skill.remove`.
- `skill.reorder`.
- `technique.add`.
- `technique.update`.
- `technique.remove`.
- `technique.reorder`.

## Critérios de aceitação

- Os comandos atravessam `CommandExecutor` e `ApplicationSession`.
- Revisão e histórico são atualizados quando há aplicação real.
- Atualização sem mudança retorna `no-op`.
- Reordenação para a mesma posição retorna `no-op`.
- Payloads com chaves desconhecidas são rejeitados.
- Payloads não portáteis em JSON são rejeitados.
- Skills preservam atributo, dificuldade, pontos, defaults, armas, features, prereqs, notas, referências externas e valores importados.
- Techniques preservam vínculo com Skill, dificuldade, pontos, penalidade padrão, máximo relativo, defaults, features, prereqs, notas, referências externas e valores importados.
- Nenhum handler calcula NH, NH relativo, defaults, progressão, custo ou resultado mecânico.
- Nenhum arquivo de UI mobile, bootstrap, persistência concreta ou `CommandRegistry` é alterado nesta etapa.

## Fora de escopo

- Biblioteca de perícias.
- Importador GCS/GCA amplo.
- Cálculo de NH.
- Cálculo de defaults.
- Cálculo de progressão por pontos.
- Edição visual na ficha mobile.
- Registro no catálogo/composição da Alpha.

## Evidência esperada

- Testes unitários de operações puras.
- Testes de comandos via `CommandExecutor`.
- Testes de `no-op`.
- Testes de rejeição de payloads inválidos e não portáteis.
- PR isolada sem sobreposição com a frente SINGULAR MVP Julho.
