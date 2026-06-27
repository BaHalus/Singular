# GATE — APP-SECONDARY-EDIT 1.0

## Objetivo
Confirmar que secundários estruturais possuem contratos mínimos de edição para a Alpha, sem UI, sem composição global e sem cálculo de regras GURPS na camada de aplicação.

## Escopo aprovado

### Operações de domínio
- Definir `base` de secundário declarado.
- Definir `override` de secundário declarado.
- Limpar `override` de secundário declarado.
- Localizar secundário por chave canônica.

### Handlers de aplicação
- `secondary.base.set`.
- `secondary.override.set`.
- `secondary.override.clear`.
- `pool.maximum.set` para `HP` e `FP`.

## Critérios de aceitação

- Os comandos atravessam `CommandExecutor` e `ApplicationSession`.
- Revisão e histórico são atualizados quando há aplicação real.
- Atualização sem mudança retorna `no-op`.
- `pool.maximum.set` preserva `current` e altera apenas `maximum`.
- Payloads com chaves desconhecidas são rejeitados.
- Valores não finitos são rejeitados.
- Nenhum handler calcula PV/PF máximos, Vontade, Percepção, Velocidade Básica, Deslocamento, Esquiva ou custo em pontos.
- Esquiva é registrada como lacuna por falta de autoridade declarativa portátil.
- Nenhum arquivo de UI mobile, bootstrap, persistência concreta, `CommandRegistry` ou composition root é alterado nesta etapa.

## Fora de escopo

- Edição visual na ficha mobile.
- Fórmulas de secundários.
- Cálculo de custo em pontos.
- Recriação dos comandos transitórios de PV/PF atuais.
- Registro no catálogo/composição da Alpha.
- Criação de contrato de Esquiva sem autoridade canônica.

## Evidência esperada

- Testes unitários de operações puras.
- Testes de comandos via `CommandExecutor`.
- Testes de `no-op`.
- Testes de rejeição de payloads inválidos.
- PR isolada sem sobreposição com a frente SINGULAR MVP Julho.
