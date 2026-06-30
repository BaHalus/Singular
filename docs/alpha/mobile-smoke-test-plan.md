# SINGULAR — Alpha mobile smoke test plan

Este roteiro define um teste manual enxuto para validar se a Alpha mobile está utilizável, estável e testável no celular antes de marcar uma fatia como pronta.

## Escopo

- Aplicação mobile executável.
- Fluxo de Criação e Mesa.
- Edição estrutural em Criação.
- Bloqueio estrutural em Mesa.
- Estados transitórios em Mesa.
- Persistência local e restauração da última sessão.
- Roundtrip mínimo de dados editados.

## Princípios obrigatórios

- O motor calcula.
- O schema declara.
- A aplicação orquestra.
- A UI apresenta estado e coleta intenção.
- A persistência guarda snapshots.
- `ApplicationSession` é a fonte autoritativa da sessão ativa.
- A UI não calcula derivados GURPS.
- Nenhum teste manual deve aceitar pipeline paralelo para contornar comando, sessão ou persistência.

## Ambiente mínimo

- Celular real ou viewport mobile equivalente.
- Navegador moderno.
- Estado inicial limpo quando o caso exigir validação de primeira execução.
- Estado persistido quando o caso exigir restauração.

## Casos de smoke test

### 1. Abertura mobile

1. Abrir a aplicação mobile.
2. Confirmar que a página carrega sem erro visível.
3. Confirmar que o cabeçalho e os cartões principais são legíveis em tela estreita.
4. Confirmar que a rolagem vertical não corta controles essenciais.

Resultado esperado: a ficha é navegável e os blocos principais aparecem sem sobreposição crítica.

### 2. Modo Criação permite edição estrutural

1. Entrar em modo Criação.
2. Editar pelo menos um item estrutural disponível na fatia atual, como traço, perícia, técnica, magia, poder, equipamento, idioma ou nota.
3. Salvar a alteração pelo controle próprio da UI.
4. Confirmar que o valor salvo reaparece após renderização.

Resultado esperado: a UI coleta intenção e o fluxo canônico aplica a alteração por comando/aplicação, sem cálculo local de derivados.

### 3. Modo Mesa bloqueia edição estrutural

1. Alternar para modo Mesa.
2. Procurar controles estruturais de adicionar, excluir, reordenar ou salvar itens permanentes.
3. Tentar acionar edição estrutural se algum controle antigo ainda estiver visível.

Resultado esperado: controles estruturais não ficam disponíveis em Mesa; qualquer tentativa residual deve ser bloqueada pela aplicação.

### 4. Modo Mesa preserva transitórios

1. Em modo Mesa, alterar um estado transitório disponível, como PV atual, PF atual, estado de carga, consumo ou marcação operacional.
2. Confirmar que a alteração aparece na UI.
3. Confirmar que a alteração não exige entrar em modo Criação.

Resultado esperado: Mesa permanece operacional para sessão, sem abrir edição estrutural.

### 5. Persistência local

1. Criar ou alterar dados em Criação.
2. Salvar manualmente quando houver controle disponível.
3. Recarregar a aplicação.
4. Restaurar a última sessão quando aplicável.

Resultado esperado: os dados persistidos retornam como snapshot válido, preservando registros íntegros.

### 6. Roundtrip mínimo

1. Editar um campo textual longo quando existir suporte na fatia atual.
2. Incluir múltiplas linhas e caracteres especiais simples, como `&`, `<`, `>` e aspas.
3. Salvar, renderizar novamente e restaurar a sessão.

Resultado esperado: o texto volta sem perda indevida, sem vazar HTML executável e sem armazenar objeto vivo.

### 7. Regressão visual rápida

1. Verificar se os controles são tocáveis com o dedo.
2. Confirmar espaçamento mínimo entre botões destrutivos e botões de salvar.
3. Confirmar que campos longos não ficam invisíveis em tela estreita.
4. Confirmar que textos principais não dependem de abreviações ambíguas.

Resultado esperado: a fatia continua utilizável em mobile, mesmo que ainda não esteja visualmente finalizada.

## Critério de aprovação

Uma fatia mobile só passa neste smoke test quando:

- não há erro crítico de abertura;
- Criação permite a edição estrutural prevista;
- Mesa bloqueia edição estrutural permanente;
- Mesa preserva transitórios operacionais;
- persistência e restauração não corrompem o estado;
- textos longos suportados pela fatia fazem roundtrip seguro;
- não há cálculo derivado implementado na UI.

## Registro recomendado na PR

```text
Smoke mobile manual:
- Ambiente:
- Casos executados:
- Falhas encontradas:
- Evidência de persistência/roundtrip:
- Observação de Mesa vs Criação:
```

## Handoff

NEXT_SLICE:
Objetivo: aplicar o padrão de `textarea` para notas longas/multilinha em Perícias e Técnicas.
Arquivos prováveis: `src/ui/mobile/CharacterMobileSkillTechniqueEditApp.js`, `src/ui/mobile/CharacterMobileSkillTechniqueEditApp.css`, `src/ui/mobile/CharacterMobileSkillTechniqueEditApp.test.js`.
Primeira ação: substituir os campos de notas por `textarea` com conteúdo textual escapado e adicionar regressão multilinha para perícia e técnica.
Riscos: preservar leitura via `.value`, bloqueio em Mesa e ausência de cálculo derivado na UI.
