# Gate — DOM-SKILL-1.0

## Estado inicial

- APP-CORE-1.0 integrado e corrigido;
- `Character.skills` e `Character.techniques` já existem como coleções canônicas;
- importação preserva níveis e níveis relativos externos;
- cálculo soberano de NH, defaults, técnicas e contribuições de pontos ainda não está fechado;
- documentos antigos de Skills e Techniques estão desatualizados em relação ao código existente.

## Objetivo

Fechar o domínio de Perícias e Técnicas de GURPS 4e sem criar cálculo na UI, associação por nome ou autoridade paralela.

## Escopo preliminar para auditoria

- identidade e imutabilidade de Perícias e Técnicas;
- atributos-base e dificuldades válidas;
- progressão de pontos e NH relativo;
- defaults de atributos e de outras perícias;
- bônus e penalidades declarados por features;
- técnicas ligadas à perícia-base por ID;
- dificuldade e limite máximo de técnicas;
- autoridade final explicável de NH e custo;
- integração com Point Ledger;
- análise, plano, revalidação e execução via APP-CORE;
- importação GCS sem associação automática por nome;
- save/load, recibos, testes verticais, documentação e ADR.

## Fora do escopo inicial

- equipamentos e carga;
- ataques e defesas derivados;
- Poderes;
- Magia;
- regras calculadas na UI;
- busca de perícia-base por nome;
- reabertura de Traits, Templates, Morfose, Forma Alternativa, Point Ledger ou APP-CORE.

## Critérios pendentes

- [ ] auditorar `Skills.js`, `Techniques.js`, importadores e integrações atuais;
- [ ] reconciliar os documentos antigos com o estado real do código;
- [ ] definir o schema canônico de autoridade de nível;
- [ ] definir progressão de pontos por dificuldade;
- [ ] definir defaults e prevenção de ciclos;
- [ ] definir técnicas e vínculo estrutural com perícia-base;
- [ ] definir operações imutáveis e contratos do APP-CORE;
- [ ] definir integração com Point Ledger;
- [ ] implementar testes unitários e verticais;
- [ ] registrar ADR;
- [ ] obter CI canônica verde;
- [ ] encerrar o domínio sem pipelines paralelos.

## Próxima ação

Auditoria estrutural antes de qualquer implementação mecânica.
