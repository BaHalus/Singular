# GATE-DOM-SKILL-1.2 — Fechamento estrutural de Skills e Techniques

**Status:** Fechamento proposto para revisão  
**Data:** 2026-06-26  
**ADR relacionada:** ADR-0045

## Objetivo

Certificar que o domínio estrutural de Skills e Techniques está suficientemente auditado, integrado e protegido para permitir a abertura posterior do contrato mecânico sem reintroduzir cálculo no schema, importador, aplicação ou UI.

## Entregas certificadas

### Coleções canônicas

- `Character.skills` permanece a coleção persistente canônica de perícias;
- `Character.techniques` permanece a coleção persistente canônica de técnicas;
- criação, validação e serialização do `Character` delegam às autoridades estruturais existentes;
- não existe coleção espelho ou cache persistente de NH.

### Estrutura preservada

- IDs internos e externos;
- nomes e especializações;
- atributo-base, dificuldade e pontos declarados;
- referências explícitas de técnica para perícia;
- níveis e níveis relativos importados;
- defaults, limites, features, armas e pré-requisitos;
- metadados de importação e dados brutos.

Esses campos são preservados sem serem promovidos a resultados mecânicos soberanos.

### Operações

- operações de Skills e Techniques permanecem transformações imutáveis;
- operações alteram somente dados declarados;
- nenhuma operação calcula NH, resolve default ou aplica limite de técnica;
- referências de técnica continuam explícitas e editáveis por ID.

### Cobertura de regressão

- valores neutros de Skills e Techniques;
- preservação integral de payload estrutural importado;
- serialização sem cálculo;
- validação de escalares, coleções e metadados;
- transformações imutáveis das operações;
- integração das duas coleções com `Character`.

### Documentação

- `Skills.md` reconciliado com os arquivos e testes existentes;
- `Techniques.md` reconciliado com sua integração ao `Character`;
- checklists estruturais atualizados;
- limites mecânicos explicitamente mantidos fora deste gate.

## Evidências

- auditoria inicial integrada na PR #42;
- reconciliação inicial de Skills integrada na PR #43;
- cobertura estrutural ampliada e documentação reconciliada na PR #78;
- Tests #774 concluído com sucesso no head final `a15c3fc`;
- PR #78 integrada à `main` no merge `ad9a39e`;
- ausência de observações ou threads bloqueantes antes do merge.

## Critérios da auditoria DOM-SKILL-1.0

1. Entrada de Skills e Techniques no `Character`: concluída.
2. Campos importados preservados: concluída.
3. Operações existentes mapeadas: concluída.
4. Testes estruturais mapeados e completados: concluída.
5. Documentação contraditória reconciliada: concluída.
6. Autoridade soberana futura definida: proposta na ADR-0045.

## Fronteiras preservadas

- o schema declara estrutura;
- o domínio estrutural valida e serializa;
- o futuro motor calcula;
- a aplicação orquestra;
- o Point Ledger contabiliza;
- o importador preserva;
- a UI apresenta.

## Regressões proibidas

- persistir NH calculado como segunda autoridade;
- usar `importedLevel` como resultado soberano;
- resolver vínculo mecânico por nome;
- calcular durante normalização ou validação estrutural;
- criar resolver de defaults no importador;
- duplicar contabilidade do Point Ledger;
- mover fórmulas para aplicação ou UI;
- alterar domínios fechados como atalho para DOM-SKILL.

## Limites deste gate

Este gate não certifica:

- fórmula de progressão de Skills;
- tabela de dificuldade e pontos;
- resolução mecânica de defaults;
- precedência entre nível treinado e default;
- limites mecânicos de Techniques;
- integração com bônus de Traits, equipamentos ou outras fontes;
- projeção de NH no Application Read Model;
- eliminação do fallback legado `resolvedByName`.

Esses itens pertencem à etapa mecânica iniciada somente após aprovação da ADR-0045.

## Próximo passo

Revisar e aprovar a ADR-0045. Após aprovação, implementar primeiro apenas o contrato portátil de resultado e diagnósticos do Skill Mechanics Engine, sem fórmulas GURPS nesta primeira implementação.

## Resultado

O domínio estrutural está pronto para sustentar o desenvolvimento mecânico. A próxima autoridade deverá ser única, pura, determinística e pertencente ao motor.
