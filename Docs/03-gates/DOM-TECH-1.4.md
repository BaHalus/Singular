# Gate DOM-TECH-1.4 — fechamento estrutural

## Objetivo

Registrar o fechamento da integração estrutural de `Techniques` com `Character` após as etapas DOM-TECH-1.0 a DOM-TECH-1.3.

## Evidências

- `Techniques` possui agregado, operações imutáveis e testes próprios.
- `Character` preserva e serializa a estrutura canônica de técnicas.
- Entradas não-array são rejeitadas explicitamente antes da transformação da coleção.
- Nenhuma etapa calcula NH, resolve defaults, aplica limites de técnica ou interpreta regras GURPS.

## Fronteiras preservadas

- o motor calcula;
- o schema declara;
- a aplicação orquestra;
- a UI não calcula;
- nenhum pipeline paralelo foi criado.

## Estado

DOM-TECH estruturalmente fechado para manutenção. Evoluções mecânicas exigem etapa própria do motor e não devem ser incorporadas ao agregado.
