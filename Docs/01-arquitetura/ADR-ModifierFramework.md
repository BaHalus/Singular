# ADR — Framework canônico de construção e precificação

- Status: Aceito para MF1
- Versão do contrato: 1
- Campanha: MODIFIER-FRAMEWORK-1.0
- Issue: #354

## Contexto

Traços e Equipamentos já possuem contratos e cálculos de modificadores. Eles
compartilham conceitos aritméticos, mas não compartilham o mesmo domínio:
Traços custam pontos de personagem; Equipamentos possuem custo monetário,
peso, árvore e features. O cálculo de Traços também precisa distinguir o custo
normal da característica do valor pago após mecanismos estruturais.

Unificar tudo em um único pipeline aritmético apagaria regras de GURPS,
contaminaria Equipamentos com precificação em pontos e criaria um ponto de
arredondamento global incorreto.

## Decisão

A SINGULAR terá uma API pública única, GURPS-first, composta por dois estágios
independentes.

### Construction

Constrói o valor normal:

```text
base/níveis
  -> aditivos
  -> multiplicadores/divisores próprios
  -> percentuais
  -> normalCost
```

O estágio aceita dimensões próprias do consumidor, como pontos, custo
monetário ou peso. Ele não conhece Habilidades Alternativas, Uso Único,
Ativação por Ponto de Personagem ou qualquer outra regra de pagamento.

### Pricing

Recebe `normalCost` imutável e calcula quanto o personagem paga:

```text
normalCost
  -> Uso Único / Ativação por CP
       /5 e ceil dentro do mecanismo
  -> base pré-HA
  -> resolução de Habilidades Alternativas
       principal escolhida pela base já reduzida
       alternativas /5 e ceil dentro de HA
  -> paidCost
```

O Pricing inicial é exclusivo de Traços. Equipamentos não podem declarar nem
receber essas regras.

## Breakdown

Cada passo registra:

- sequência densa e determinística;
- estágio e fase;
- ID e origem da regra;
- valor de entrada e saída;
- aplicação ou motivo da não aplicação;
- arredondamento e mecanismo responsável.

Construction não pode registrar arredondamento estrutural. Pricing só pode
arredondar para cima quando identifica o mecanismo local. Não existe
arredondador estrutural global.

## Versionamento e snapshots

- `schemaVersion=1` é obrigatório em cada contrato canônico.
- Valores devem ser portáteis por JSON, finitos e sem ciclos.
- A versão corrente lê somente versões explicitamente suportadas.
- Versões desconhecidas são rejeitadas com diagnóstico; nunca reinterpretadas.
- Migrações futuras devem ser explícitas e testadas.
- Persistência guarda snapshots; não recalcula nem corrige contratos.
- `normalCost`, bases intermediárias e `paidCost` permanecem distintos no
  snapshot e no breakdown.

## Limites de MF1

MF1 declara schema, invariantes, inventário e testes de validação. Não:

- implementa Construction Engine completo;
- implementa Pricing Engine completo;
- troca os pipelines de Traços ou Equipamentos;
- remove APIs existentes;
- cria registry, sessão, histórico, persistência ou composition root paralelo;
- move cálculo para aplicação ou UI.

## Consequências

- MF2 e MF3 podem ser implementados separadamente após MF1.
- MF6 deve publicar um único entrypoint antes das migrações.
- MF4 e MF5 provam paridade antes de remover código antigo.
- Modelos, Biblioteca 2.0 e Magia 2.0 ficam bloqueados até MF-FINAL.
- A diferença entre `normalCost` e `paidCost` torna-se verificável.
- A ordem dos divisores e cada arredondamento passam a ser rastreáveis.

## Alternativas rejeitadas

### Um pipeline único com todos os divisores

Rejeitado porque mistura fatores intrínsecos com mecanismos de pagamento e
produz ordem e arredondamento incorretos.

### Um arredondamento no fim de toda a expressão

Rejeitado porque Uso Único/Ativação por CP e Habilidades Alternativas
arredondam dentro de seus próprios mecanismos.

### Framework genérico de RPG

Rejeitado. A infraestrutura é reutilizável apenas onde as regras de GURPS
realmente compartilham semântica.
