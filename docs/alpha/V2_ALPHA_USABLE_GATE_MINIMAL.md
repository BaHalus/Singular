# V2_ALPHA_USABLE_GATE_MINIMAL

Guard versionado para validar que o caminho Alpha mobile já integrado continua utilizável como sequência de usuário, sem transformar a UI em autoridade de regra.

## Escopo protegido

Este gate cobre somente affordances já presentes em `mobile.html` e na composição mobile canônica:

1. abrir `mobile.html` e montar a raiz `[data-singular-mobile-root]`;
2. permanecer inicialmente em modo Criação;
3. editar e aplicar campos centrais de identidade quando a UI permite edição estrutural;
4. salvar e relistar uma sessão usando a persistência local existente;
5. alternar para modo Mesa;
6. manter transitórios de Mesa alcançáveis, especialmente ajustes atuais de PV/PF;
7. manter colapso/expansão de seções alcançável;
8. manter empty states e controles existentes visíveis/alcançáveis em viewport mobile;
9. preservar ausência de editores estruturais em Mesa;
10. preservar os guardas de overflow de texto já carregados por `mobile.html`.

## Proibições de escopo

O gate não deve introduzir:

- cálculo ou regra de domínio na UI;
- mutação direta do personagem fora dos comandos existentes;
- domínio paralelo;
- sessão paralela;
- executor paralelo;
- registry paralelo;
- persistence layer paralela;
- pipeline paralelo;
- composition root paralelo.

## Critério mínimo de aceite

A fatia passa quando o smoke automatizado consegue executar o fluxo acima em navegador mobile real e a suíte `npm test` confirma que o checklist continua cobrindo os pontos obrigatórios sem prometer capacidades ainda ausentes.