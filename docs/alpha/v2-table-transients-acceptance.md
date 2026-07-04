# Alpha V2 — critérios de aceitação para transitórios em Mesa

Refs #251

## Objetivo da fatia

Definir a menor fatia demonstrável de V2 após o gate real de navegador da V1: no modo **Mesa**, a UI deve continuar bloqueando edição estrutural, mas deve permitir alterações transitórias operacionais.

## Capacidade visível esperada

No celular, após criar e salvar um personagem, o usuário deve conseguir alternar para **Mesa** e ainda operar:

1. PV atual;
2. PF atual;
3. estado operacional de equipamento quando o item já existe: `equipado`, `carregado`, `guardado`, `largado` ou `ignorado`.

## Restrições obrigatórias

- Não expor editores de criação em Mesa.
- Não permitir criação, exclusão, renomeação ou reordenação estrutural de equipamento em Mesa.
- Não mover regras para a UI.
- Não recriar domínio, sessão, executor, registry, persistência nem pipeline.
- Usar somente comandos/aplicação já existentes para mutações transitórias.
- Preservar roundtrip de persistência.

## Critério de regressão automatizada

A próxima alteração de código deve acrescentar uma prova em navegador real que:

1. cria um equipamento em Criação;
2. alterna para Mesa;
3. confirma ausência de `data-role="equipment-editor"`;
4. confirma presença apenas dos botões de estado do equipamento;
5. altera o estado para `dropped` ou equivalente;
6. salva;
7. desmonta/remonta;
8. confirma o estado restaurado sem duplicar listeners ou editores.

## Definição de pronto

A fatia só fecha quando houver PR com código e teste passando em CI para o fluxo acima.
