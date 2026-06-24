# Gate DOM-SPL-1.4 — fechamento estrutural

## Objetivo

Registrar o fechamento estrutural do domínio de mágicas após validação do agregado, integração com `Character` e operações imutáveis de edição.

## Evidências

- `Spells` preserva a estrutura canônica e os metadados importados.
- `Character` preserva e serializa mágicas sem calcular níveis ou custos.
- Coleções em formato inválido são rejeitadas antes da transformação.
- Operações estruturais cobrem inclusão, remoção, renomeação, notas, base declarada, pontos, NH importado e tags.
- A suíte canônica cobre imutabilidade e validações de entrada.

## Fronteiras preservadas

- o motor calcula;
- o schema declara;
- a aplicação orquestra;
- a UI não calcula;
- campos textuais operacionais permanecem declarativos;
- nenhum pipeline paralelo foi criado.

## Estado

DOM-SPL estruturalmente fechado para manutenção. Resolução de NH, redução de custos, pré-requisitos, efeitos e ataques derivados exigem etapas próprias do motor.
