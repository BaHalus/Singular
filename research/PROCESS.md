# Processo de pesquisa arquitetural da SINGULAR

## 1. Objetivo da pesquisa

A pesquisa arquitetural da SINGULAR tem como objetivo mapear, documentar e organizar o conhecimento sobre domínios do GCS de forma rastreável, com foco em subsidiar a modelagem da arquitetura da SINGULAR.

A pesquisa deve ser conduzida com base em evidência verificável, priorizando o código-fonte do GCS como fonte primária. Comparações com a implementação da SINGULAR podem ser feitas apenas como contexto arquitetural, nunca como substituto da evidência do domínio.

## 2. Papéis dos agentes

### Project Manager

Responsável por coordenar o fluxo da pesquisa.

Suas funções incluem:
- manter o backlog da pesquisa;
- selecionar o próximo domínio a ser investigado;
- orquestrar a execução dos agentes especialistas;
- validar se cada etapa foi concluída antes de avançar;
- manter consistência entre backlog, status e index;
- interromper o processo quando houver falta de rastreabilidade, inconsistência ou contexto insuficiente.

### Reverse Engineer

Responsável por investigar o domínio no código-fonte do GCS.

Suas funções incluem:
- localizar os arquivos e estruturas principais do domínio;
- extrair fatos observáveis do código;
- registrar as descobertas em um resumo raw;
- identificar lacunas, ambiguidades e pontos de atenção.

### Domain Analyst

Responsável por interpretar o domínio em termos de significado, comportamento e relações.

Suas funções incluem:
- transformar a pesquisa bruta em uma visão semântica do domínio;
- identificar conceitos centrais, relações e regras importantes;
- destacar implicações arquiteturais relevantes;
- preparar a análise para a etapa de arquitetura.

### Architect

Responsável por converter a compreensão do domínio em uma visão arquitetural útil para a SINGULAR.

Suas funções incluem:
- estruturar o domínio em termos de responsabilidades, fronteiras e dependências;
- relacionar o domínio com outros domínios já pesquisados;
- identificar decisões de modelagem e pontos de integração;
- produzir uma visão que sirva de base para implementação futura.

### Reviewer

Responsável por validar a qualidade da documentação produzida.

Suas funções incluem:
- verificar rastreabilidade;
- verificar consistência entre artefatos e controle de estado;
- confirmar se o escopo foi respeitado;
- apontar lacunas ou inconsistências antes de marcar o domínio como concluído.

## 3. Fluxo completo de execução

A pesquisa deve seguir este fluxo para cada domínio:

1. Seleção do domínio
   - o domínio deve ser o próximo item não concluído do backlog;
   - o domínio não deve ser alterado arbitrariamente.

2. Investigação inicial
   - o Reverse Engineer coleta evidência do GCS;
   - o foco deve ser o domínio específico, sem misturar outros domínios.

3. Produção do resumo raw
   - deve ser criado o arquivo de pesquisa raw em research/raw/<domínio>/README.md.

4. Revisão do domínio
   - o Reviewer valida o material produzido até o momento;
   - se necessário, a pesquisa retorna para correção.

5. Análise de domínio
   - o Domain Analyst transforma os fatos em uma leitura semântica do domínio.

6. Síntese arquitetural
   - o Architect produz a visão arquitetural do domínio de forma alinhada à SINGULAR.

7. Revisão final
   - o Reviewer valida novamente a documentação e a rastreabilidade.

8. Atualização dos controles
   - backlog, status e index devem ser atualizados para refletir o estado do domínio.

9. Próximo domínio
   - o fluxo recomeça com o próximo domínio do backlog.

## 4. Estrutura dos diretórios da pesquisa

A pesquisa deve seguir esta estrutura básica:

- research/
  - backlog.md
  - index.md
  - status.md
  - PROCESS.md
  - gcs/
    - documentos de revisão e análise do domínio GCS
  - raw/
    - <domínio>/README.md
  - retrospectives/
    - documentos de retrospectiva por ciclo
  - templates/
    - domain-research-template.md
    - domain-review-template.md

Os diretórios devem ser mantidos de forma consistente e sem mistura indevida de conteúdos.

## 5. Papel do backlog, status e index

### backlog.md

Define a ordem oficial da pesquisa e a progressão dos domínios.

Regras:
- a ordem não deve ser alterada arbitrariamente;
- cada domínio deve ser marcado como concluído somente após a validação completa.

### status.md

Registra o estado atual da pesquisa.

Deve conter:
- domínio atual;
- etapa atual;
- documentos produzidos;
- pendências;
- bloqueios;
- próxima ação.

### index.md

Oferece uma visão geral da pesquisa concluída.

Deve conter:
- domínios pesquisados;
- documentos principais associados a cada domínio;
- indicação de status geral da pesquisa.

## 6. Templates oficiais

Todos os novos domínios devem usar os templates oficiais:

- research/templates/domain-research-template.md
- research/templates/domain-review-template.md

Esses templates definem a estrutura mínima esperada para a pesquisa raw e para os documentos de revisão.

## 7. Critérios para considerar um domínio concluído

Um domínio pode ser considerado concluído somente quando:

- a investigação do domínio foi realizada com base em evidência verificável;
- o resumo raw foi produzido;
- o documento de revisão foi produzido;
- a rastreabilidade ao código-fonte foi preservada;
- o escopo do domínio foi respeitado;
- backlog, status e index foram atualizados de forma consistente;
- não há inconsistências evidentes entre os artefatos produzidos.

## 8. Como iniciar um novo domínio

Para iniciar um novo domínio:

1. conferir o backlog para identificar o próximo domínio;
2. abrir a estrutura de pesquisa correspondente em research/raw/<domínio>/;
3. usar o template de pesquisa raw;
4. registrar as evidências encontradas no GCS;
5. produzir o documento de revisão;
6. atualizar backlog, status e index.

## 9. Como tratar falhas durante o processo

Se houver falhas, inconsistências ou falta de contexto:

- interromper a execução do domínio em questão;
- registrar claramente o problema;
- buscar evidência adicional antes de prosseguir;
- não avançar para a próxima etapa com lacunas não resolvidas;
- se necessário, retornar à etapa anterior para correção.

Falhas comuns incluem:
- ausência de rastreabilidade;
- mistura indevida entre evidência GCS e comparação com a SINGULAR;
- documentação incompleta;
- inconsistência entre artefatos de controle.

## 10. Convenções utilizadas pela pesquisa

As convenções abaixo devem ser seguidas em todos os domínios:

- usar o GCS como fonte primária de evidência;
- manter a rastreabilidade explícita;
- não tratar a SINGULAR como fonte primária de descoberta do domínio;
- separar claramente fatos confirmados de hipóteses e observações;
- manter os documentos curtos, objetivos e baseados em evidência;
- usar os templates oficiais para padronizar os artefatos;
- atualizar backlog, status e index sempre que um domínio for concluído;
- não alterar a ordem do backlog sem justificativa explícita e aprovável.
