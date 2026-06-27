# GATE — APP-LANGUAGE-CULTURE-EDIT 1.0

## Objetivo
Confirmar que Languages e Familiarities possuem contratos mínimos de edição estrutural para a Alpha, sem UI, sem composição global e sem cálculo de regras GURPS na camada de aplicação.

## Escopo aprovado

### Operações de domínio
- Adicionar Language.
- Atualizar Language por ID.
- Remover Language por ID.
- Reordenar Language por ID.
- Localizar Language por ID.
- Adicionar Familiarity.
- Atualizar Familiarity por ID.
- Remover Familiarity por ID.
- Reordenar Familiarity por ID.
- Localizar Familiarity por ID.

### Handlers de aplicação
- `language.add`.
- `language.update`.
- `language.remove`.
- `language.reorder`.
- `familiarity.add`.
- `familiarity.update`.
- `familiarity.remove`.
- `familiarity.reorder`.

## Critérios de aceitação

- Os comandos atravessam `CommandExecutor` e `ApplicationSession`.
- Revisão e histórico são atualizados quando há aplicação real.
- Atualização sem mudança retorna `no-op`.
- Reordenação para a mesma posição retorna `no-op`.
- Payloads com chaves desconhecidas são rejeitados.
- Payloads não portáteis em JSON são rejeitados.
- Languages preservam fala, escrita, natividade, referência, custo importado, notas e metadados portáteis.
- Familiarities preservam natividade, referência, custo importado, notas e metadados portáteis.
- Nenhum handler calcula custo de idioma, custo de cultura, derivado GURPS ou regra mecânica.
- Nenhum arquivo de UI mobile, bootstrap, persistência concreta ou `CommandRegistry` é alterado nesta etapa.

## Fora de escopo

- Biblioteca de idiomas.
- Biblioteca de culturas.
- Importador GCS/GCA amplo.
- Cálculo de custos.
- Edição visual na ficha mobile.
- Registro no catálogo/composição da Alpha.

## Evidência esperada

- Testes unitários de operações puras.
- Testes de comandos via `CommandExecutor`.
- Testes de `no-op`.
- Testes de rejeição de payloads inválidos e não portáteis.
- PR isolada sem sobreposição com a frente SINGULAR MVP Julho.
