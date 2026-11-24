# SINGULAR v0.9.2 — kit modular consolidado

## Como usar

1. Abra `b-Singular-basico_v0.9.2.html`.
2. No painel de importação do módulo avançado, selecione `a-Singular-modulo_avancado_v0.9.2.html`.

O arquivo completo (`c-Singular-v2_v0.9.2.html`) já traz os sistemas avançados embutidos. Ele não precisa de importação.

## Padrão de nomes dos arquivos

| Prefixo | O que é |
|---|---|
| `a-` | módulo **avançado** |
| `b-` | versão **básica** |
| `c-` | versão **completa** (tudo em um arquivo só) |
| `z-` | pacote **zip** |

---

## Conteúdo deste ZIP — v0.9.2

- `a-Singular-modulo_avancado_v0.9.2.html`: módulo avançado importável.
- `b-Singular-basico_v0.9.2.html`: básico com a biblioteca incorporada.
- `c-Singular-v2_v0.9.2.html`: completo consolidado (básico com o módulo avançado incorporado e a biblioteca embutida).
- `LEIA-ME_modularizacao_v0.9.2.md`: este documento consolidado.

O ZIP é `z-Singular-v2_v0.9.2.zip`.
Os prefixos a-, b-, c- e z- são mantidos; todos os arquivos deste kit levam a versão no nome.

## Atualização e segurança dos dados

Extraia os arquivos antes de abrir o básico. Para ativar o avançado, use
Importar / Exportar → Importar módulo avançado (.html) e selecione o arquivo `a-`.
O módulo fica armazenado no navegador; em outro navegador ou após limpar os dados,
pode ser necessário importá-lo novamente. O módulo não é uma ficha independente.

Antes de trocar arquivos, limpar o navegador ou remover o módulo, exporte os
personagens em JSON como backup. O kit não incorpora o personagem Tubarão-Rei,
utilizado nos testes. A importação de um personagem substitui a ficha aberta.

## Consolidação documental — v0.9.2

Este documento parte do LEIA-ME v0.5.5 fornecido pelo usuário. As seções históricas da v0.5.5 em diante, abaixo destas novas notas, foram preservadas integralmente, sem substituir o histórico por um resumo.

As notas de v0.6.0 a v0.9.1 foram recuperadas dos comentários de versão e trechos de implementação presentes no HTML v0.9.1 recebido nesta conversa. Não constituem um histórico exaustivo nem comprovam testes de execução dessas versões. Não foram inventadas versões intermediárias para preencher lacunas.

## Atualização — v0.9.2: rolagem no construtor de técnicas e nomes do kit

- No Construtor de técnicas, a busca de perícia-base em **Outras perícias** deixa de restringir o acesso aos primeiros 60 resultados da biblioteca.
- Os resultados são acrescentados em lotes de até 60 conforme a lista se aproxima do final da rolagem, até alcançar todos os resultados disponíveis. O lote de 60 é uma unidade de carregamento, não um limite total.
- A busca continua filtrando a lista completa antes do carregamento dos lotes; perícias da ficha continuam aparecendo primeiro.
- O contador da biblioteca informa quantos resultados foram carregados em relação ao total filtrado.
- Título, identificação na barra e metadado `app-version` atualizados para **0.9.2**.
- Removido o sufixo `limpo_com_biblioteca` dos nomes de entrega. Isso não significa remover a biblioteca: ela continua no básico e no completo.
- Mantidos os prefixos `a-`, `b-`, `c-` e `z-`, com a versão no nome de cada arquivo.
- O módulo avançado foi extraído dos seis scripts avançados embutidos no HTML recebido, preservando o conteúdo JavaScript e a ordem; não houve alteração funcional nesses scripts nesta entrega.

### Verificações e limites desta entrega

- Conferidas a geração dos arquivos e a integridade do ZIP por CRC e comparação byte a byte de seus membros com os arquivos usados no empacotamento.
- Conferidas a presença da biblioteca no básico e a separação dos seis scripts avançados.
- **Não houve teste de execução em navegador nem teste visual no celular.** As verificações históricas descritas nas seções antigas pertencem às respectivas entregas; não foram repetidas nesta versão.
- Este LEIA-ME consolidado substitui a documentação resumida gerada anteriormente nesta conversa. Um ZIP montado antes desta correção documental ainda contém o LEIA-ME resumido e não é atualizado retroativamente pela entrega deste documento.

---

## Atualização — v0.9.1: controles da mágica ritualística sem sobrepor o NH

Nota recuperada do HTML v0.9.1:

- Corrigido o posicionamento do bloco de controles da mágica ritualística, incluindo seletor de escola, PF, tempo de operação e tipo.
- O bloco começava na coluna do NH e podia cobrir seu valor quando o texto era longo; a correção separa a área desses controles da área do NH.

---

## Atualização — v0.9.0: seletor de mágicas ritualísticas e ciclos de pré-requisitos

Notas recuperadas do HTML v0.9.1:

- O botão **+ MR** passa a usar o seletor padrão de mágicas, com busca, filtros, grupos de variantes e rolagem em blocos.
- Variantes da mesma mágica passam a ficar agrupadas também na seleção de mágicas comuns.
- Corrigido o travamento por recursão sem fim quando mágicas exigem umas às outras em um ciclo de pré-requisitos; o código cita Anular Possessão como exemplo.
- Acrescentados caches reutilizados entre chamadas no processamento da biblioteca de mágicas.

---

## Atualização — v0.8.0: perícias de luta e escola automática

Notas recuperadas do HTML v0.9.1:

- O menu de perícia-base do Construtor de técnicas reúne as seis perícias de combate desarmado e as perícias de arma já presentes na ficha.
- A opção **Outras perícias** oferece busca, apresentando primeiro as perícias da ficha e depois as da biblioteca.
- Na adição de mágica ritualística, a escola correspondente pode ser adicionada automaticamente com 1 ponto quando a opção automática de pré-requisitos está ligada.

---

## Atualização — v0.7.0: busca na biblioteca e filtro por escola

Notas recuperadas do HTML v0.9.1:

- Adicionada busca de perícias da biblioteca ao Construtor de técnicas.
- Ajustadas as cores do construtor para não serem substituídas pela regra geral de coloração dos valores.
- A identificação do colégio da mágica passa a aceitar `college[]`, usado pelo formato nativo do GCS, além do campo textual `col`.
- Corrigidos a lista e o filtro por escola na seleção de mágicas ritualísticas; a leitura exclusiva de `col` deixava o filtro vazio com a biblioteca nativa.
- A procura de mágicas usa as mesmas fontes da seleção comum: biblioteca, personalizadas e geradas.

---

## Novo recurso — v0.6.0: Construtor de técnicas

Notas recuperadas do HTML v0.9.1:

- Introduzido o **Construtor de técnicas**, acessível pelo botão de construção de técnica na seção de Perícias.
- O código identifica como referência GURPS Artes Marciais, capítulo 3, páginas 89–95. Esta nota registra a referência declarada na implementação, sem certificar aderência integral às regras do suplemento.
- Adicionado suporte ao pré-definido baseado em Esquiva nas técnicas.

---

## Atualização — v0.5.5: grupo de temas Retrô e tema Terminal

- **Menu de temas:** novo grupo **Retrô** com Terminal, Windows 95, Sépia (antes "Retrô sépia") e Máquina de escrever (o antigo tema "Retro" preto e branco; o identificador interno continua o mesmo, então a preferência salva é mantida). Windows 95, Sépia e Terminal saíram dos grupos "Mais temas" e "Coloridos / experimentais".
- **Terminal:** sem o brilho borrado no texto (`text-shadow` removido); fonte de monitor CRT **VT323 embutida no arquivo** (licença OFL, subconjunto latino com acentos), aplicada também a abas, botões e campos — antes dependia de internet e, sem ela, caía em Courier; tamanho geral da letra aumentado em 14% porque a VT323 é pequena.
- **Cantos retos** em todos os temas do grupo Retrô (Terminal, Windows 95, Sépia e Máquina de escrever).
- **Menu:** o item ativo agora é marcado pelo identificador do tema (antes por ícone/posição, o que errava com ícones repetidos como ⭐ de Rosalina e PT e com a ordem do menu); a ordem do botão "Tema" (alternar) segue a ordem do menu.
- O contraste foi remedido nos quatro temas retrô (0 falhas fora dos controles desabilitados). Nenhum cálculo, filtro, impressão ou dado foi alterado.
- **Limitação:** o arquivo cresce cerca de 24 KB pela fonte embutida.

---

## Atualização — v0.5.4: barras de título dos temas Luigi e Pastel

- **Luigi:** a letra da barra de título (e seus botões) agora é clara (branco) sobre o verde, que foi escurecido levemente (`#168a3a` → `#12772f`) para manter o contraste de 5,7:1.
- **Pastel:** a barra de título agora tem fundo claro (lilás `#b781c9` → `#e2cdee`), mantendo a letra escura (contraste 14:1).
- Foi repetida a medição de contraste nos 32 temas (34.304 medições): 0 falhas fora dos controles desabilitados. Nenhum cálculo, filtro, impressão ou dado foi alterado.

---

## Atualização — v0.5.3: contraste em todos os temas

- **Método.** Foi medido o contraste (texto × fundo efetivo, considerando opacidade e gradientes) de cada texto visível nas abas Principal, Traços, Perícias, Equipamentos e Modelos, na ajuda e no seletor de itens, em todos os 32 temas (34.304 medições). Meta: 4,5:1 para texto (3:1 para texto grande, símbolo de moeda e controles desabilitados). Resultado final: 0 falhas fora dos controles desabilitados.
- **Cores fixas trocadas por cores do tema:** botões FA / Mo e "⊞ Rec" / "⊞ ✎" (antes verde/roxo fixos sobre a barra de título), cabeçalho, faixa lateral, rótulo e botões "+ ITEM / ✎ / ⊞ Rec" dos recipientes de equipamento (antes verde fixo `#7ec8a0`), etiquetas de raça/metacaracterística, botão do Modo Mesa e botão "+ moeda". Foram usadas as variáveis que os temas já tinham (`--fg-fa-color`, `--fg-mo-color`, `--gold`, `--sec-title-btn`); a faixa lateral dos itens em recipiente agora é sólida (4 px) na cor do tema.
- **Paleta por tema:** em 21 temas, as cores de destaque (`--gold`, `--grey`, `--neg`, `--fg-fa-color`, `--fg-mo-color`, `--sec-title-sub`, e a barra vermelha do tema comunista) receberam o menor ajuste de luminosidade necessário (mesmo matiz) para atingir o contraste; os demais temas não mudaram.
- **Opacidade:** texto que ficava apagado por opacidade baixa (referências no seletor a 35%, rótulos de Superforça/Superesforço a 75%, botões a 90% etc.) ganhou piso de legibilidade; botões FA/Mo desabilitados passaram de 40% para 65% e os "−" desabilitados de 10% para 50%.
- **Moedas:** a cor escolhida pelo usuário continua guardada como está; só a cor exibida do símbolo é ajustada (mesmo matiz) para ter ≥ 3,4:1 com o fundo do tema atual, e é reaplicada quando o tema muda.
- **Não alterado:** cálculos, filtros, impressão/PDF, dados e salvamento. As mudanças são CSS e três pontos de JavaScript (cor do símbolo da moeda, opacidade dos botões FA/Mo, estilo do botão de recipiente).
- **Limitações:** não foram medidos numericamente os demais diálogos (condições, menus de configuração, outros seletores de biblioteca) nem a impressão; bordas e faixas decorativas seguem as mesmas cores de tema, sem medição própria; controles desabilitados são isentos pela WCAG e só tiveram a opacidade aumentada.

---

## Atualização — v0.5.2: ajustes visuais do painel de auditoria

- Textos secundários do painel (detalhe do ajuste e efeitos condicionais) apareciam em vermelho quando continham número negativo, por uma regra de cor do próprio app; agora seguem a cor cinza do tema.
- O detalhe de "Ajuste por pontos e dificuldade" passou para a linha de baixo (melhor leitura no celular).
- Origem de equipamento e de condição deixou de repetir o nome ("equipamento equipado" em vez de "equipamento equipado: Nome").
- Nenhum cálculo, filtro, impressão ou dado foi alterado.

---

## Atualização — v0.5.1: desempenho e painel de auditoria compacto

- A v0.5.1 corrige a lentidão da ficha e deixa o painel de auditoria mais compacto; nenhum cálculo foi alterado.


- **Causa:** a ficha (desde a v0.1.7) tinha um laço de atualização: um observador da lista de perícias chamava `updateAll`, que regravava atributos/NH na própria lista, o que disparava o observador de novo; além disso, `recalcNH` agendava outro `updateAll` a cada recálculo. Resultado: dezenas de atualizações por segundo mesmo com a ficha parada (medido: ~70/s), deixando a tela lenta e atrasando qualquer toque.
- **Correção:** o observador agora agrupa pedidos, ignora regravações idênticas (mesmo atributo/texto com o mesmo valor), roda 2 passes e descarta as mutações causadas pelo próprio recálculo; o agendamento de `recalcNH` também descarta essas mutações; e as quatro funções de NH só regravam o NH quando o texto muda. Nenhuma fórmula foi alterada.
- **Medição:** com a ficha parada, 0 atualizações por segundo (antes ~70/s). Edição do NH, reação a pontos e a traços e as listas continuaram respondendo nos testes.
- **Auditoria:** o painel foi compactado (uma linha de resumo + tabela enxuta; avisos e condicionais só aparecem quando existem) e a linha é realçada no mesmo instante do toque. A abertura continua aguardando a janela de duplo toque (~0,3 s) para não conflitar com a exclusão.

---

## Novo recurso — v0.5.0: auditoria de valores nas perícias

- Um toque na alça de uma perícia, técnica ou magia abre a auditoria do NH.
- O painel mostra a origem do NH sem alterar o cálculo.
- Mostra atributo-base, pontos, dificuldade, ajuste de nível, bônus de traços, ajustes manuais e efeitos condicionais.
- Explica casos de zero pontos, valor sem treino, ausência de pré-definido e teto ritualístico.
- O toque no NH continua permitindo editar o valor desejado.
- A alça de equipamentos e armas mantém o comportamento atual.
- A auditoria é somente de leitura e não altera filtros, impressão, PDF ou dados do personagem.

### Detalhes técnicos da auditoria (v0.5.0)

- **Sem segunda fórmula.** As próprias funções que calculam e gravam o NH (`recalcNH`, `recalcTechniqueNH`, `recalcRitualSchoolNH`, `recalcRitualMagicNH`) registram as parcelas que usaram no mesmo instante em que escrevem o NH na linha. O painel apenas lê esse registro (em memória; nunca vai para a ficha salva, a impressão ou o PDF). Os auxiliares de bônus (traços, magias, equipamentos, condições, pacotes) ganharam um parâmetro opcional que também informa a origem de cada parcela; os totais continuam saindo do mesmo caminho de antes.
- **Só o básico mudou.** O módulo avançado não calcula NH; o `a-` recebeu apenas a troca de versão. O `c-` é o `b-` v0.5.0 com os seis scripts do módulo avançado inseridos no mesmo ponto em que o `c-` v0.4.27 já os trazia (scripts idênticos aos do `a-`).
- **Origem não identificada.** Quando uma parcela não traz origem, o painel mostra “Origem não identificada” em vez de supor uma.
- **Efeitos condicionais.** Aparecem separados dos efeitos sempre ativos. Condições ativas que somam ao NH ficam num grupo próprio dentro da tabela; efeitos situacionais (que não entram no NH) ficam numa lista à parte e só aparecem quando o texto da situação cita o nome da perícia ou magia.
- **Escolas de Magia.** O NH exibido na linha de uma Escola é o do cálculo de perícia comum (é ele que grava por último). O painel mostra exatamente as parcelas desse cálculo e, como referência, o NH da perícia-núcleo (teto ritualístico), informando se o valor exibido está dentro dele. O cálculo não foi alterado.
- **Modo Mesa.** No Modo Mesa as alças ficam inertes por CSS. Na v0.5.0 as alças de perícias, técnicas e magias ficam tocáveis para abrir a auditoria, mas o duplo toque **não exclui** nessas linhas enquanto o Modo Mesa estiver ativo (trava em `delRow`). Alças de outras listas continuam inertes.
- **Perícias ocultas.** Linhas ocultas pelos filtros de perícias automáticas não podem ser tocadas e a função de abertura recusa linhas ocultas; os filtros não foram alterados.
- **Duplo toque.** Continua excluindo a linha (Modo Criação). O painel só abre depois da janela de duplo toque, como já ocorre nos traços e ataques.

### Limitações conhecidas (v0.5.0)

- Se o NH de uma linha estiver sendo digitado no momento do recálculo, o registro da auditoria só é atualizado quando a edição termina; o painel avisa quando o NH da linha mudou depois do último registro.
- Linhas que acabaram de ser carregadas só têm auditoria depois do primeiro recálculo da ficha (automático ao abrir/editar).

---

## Novidades da v0.4.27 — Proezas Físicas recolhidas

- A seção Proezas Físicas e seus painéis internos começam recolhidos por padrão.
- Toque no título da seção ou do painel para expandir.
- Atualizar os cálculos não recolhe novamente uma seção que você abriu.
- Fichas existentes recebem a adaptação uma vez; depois, o estado pode acompanhar
  o salvamento do personagem.

## Novidades da v0.4.26 — Ocultação respeitada na impressão

- Impressão comum e modelo oficial de duas páginas excluem as perícias ocultadas
  pelos filtros global e por traço.
- O mesmo se aplica ao salvar em PDF pelo diálogo de impressão.
- Botões dos filtros não aparecem no papel.
- A exclusão é apenas do conteúdo impresso: as perícias não são apagadas da ficha.
  Para imprimi-las, mostre-as antes de iniciar a impressão.

## Novidades da v0.4.25 — Remoção de botões 0/0

- O botão por traço só aparece se houver ao menos uma perícia automática elegível.
- Botões antigos restaurados de fichas salvas são removidos se ficarem sem perícias.
- O botão reaparece quando volta a existir uma perícia elegível.
- No Tubarão-Rei, Olfato Discriminatório não exibe o botão: Rastreamento já está
  comprado com 1 ponto, portanto não é uma linha automática de custo zero.

## Novidades da v0.4.24 — Filtro por traço corrigido

- Associação direta entre os nomes das perícias automáticas e os efeitos dos traços.
- Funciona também com perícias já existentes, sem depender de marcas de origem
  criadas somente nas linhas novas.
- Manipuladores de clique são reaplicados a botões restaurados do HTML salvo.
- Perícias manuais e perícias com pontos investidos ficam fora do filtro.

### Uso dos filtros de perícias

- Global: botão Auto no cabeçalho de Perícias ou seletor em Texto e exibição.
  A preferência global fica salva no navegador.
- Por traço: botão Auto ao lado do traço, somente quando há perícias elegíveis.
- Contagem: ocultas/afetadas. O número de afetadas não é necessariamente exclusivo.
- Perícias compartilhadas podem constar em mais de um traço; qualquer filtro
  correspondente ativo pode mantê-las ocultas.
- O global tem prioridade: para revelar perícias usando um filtro individual,
  desative primeiro o global. Mostrar globalmente não desfaz filtros individuais.
- A elegibilidade atual é origem automática + 0 pontos; uma especialização
  preenchida, sozinha, não impede o filtro.
- Ocultar não apaga dados nem desativa bônus ou penalidades do traço.

No teste com o Tubarão-Rei, são 31 perícias automáticas únicas, além das 12 entradas
compradas (perícias/técnicas). As contagens de Daltonismo (5), Atrapalhado (12) e
Pouca Empatia (16) não devem ser somadas como se fossem todas exclusivas.

## v0.4.22–v0.4.23 — Ocultação e controles

- Corrigido conflito de especificidade de CSS: a regra de ocultação passa a vencer
  o `display:grid !important` das linhas de perícia.
- Mantidos botão global, seletor em Texto e exibição e contadores.
- Botões por traço foram reintroduzidos na v0.4.23; a correspondência com as
  perícias foi corrigida na v0.4.24.

## v0.4.14–v0.4.21 — Iterações intermediárias

Versões de implementação e diagnóstico dos filtros, substituídas pelas correções
acima. Não constituem marcos estáveis adicionais do histórico.

## Consolidação documental da v0.4.27

Este documento preserva as seções do leia-me original v0.4.13 enviado pelo usuário,
com atualização do título e dos nomes dos arquivos para o kit atual, e acrescenta
as notas recentes acima. As seções antigas abaixo são histórico: comportamentos
e limites antigos devem ser lidos no contexto da versão correspondente.
Não houve incremento da versão funcional apenas pelo reempacotamento.

### Verificações registradas nesta conversa

- Chromium: importação do Tubarão-Rei, filtros global e individual e remoção de 0/0.
- Impressão: coleta do modelo oficial e preparação do conteúdo da impressão comum.
- Proezas: estado inicial recolhido, expansão e manutenção durante os cálculos.
- Kit modular: básico sem módulo e ativação das cinco seções avançadas.

São verificações específicas, não uma certificação de todos os navegadores,
regras GURPS, aparelhos ou históricos antigos documentados abaixo.

---

## Histórico anterior — conteúdo preservado do leia-me v0.4.13

## Novidades da v0.4.13 (sobre a v0.4.12)

### Recipientes de equipamento: o conteúdo herda o estado do recipiente
- **Recipiente não carregado (○):** tudo que está dentro fica não carregado e, portanto, nunca equipado. O botão do item fica apagado e, ao tocar, aparece o aviso para carregar o recipiente primeiro.
- **Recipiente carregado ou equipado:** o conteúdo fica carregado. Dentro dele, o botão do item só alterna entre **carregado ↔ equipado**.
- **Fora de recipiente** nada mudou: não carregado → carregado → equipado.
- **Recipiente dentro de recipiente** segue a mesma regra do item.
- A regra antiga, em que o recipiente só aparecia como carregado se todos os itens estivessem, foi removida. Ela fazia o recipiente virar "não carregado" ao descarregar um único item.
- A regra é reaplicada a cada atualização da ficha, então vale também ao **mover item (⤵)**, adicionar item, importar `.gcs` e desfazer. Item equipado movido para um recipiente descarregado vira não carregado. Item movido para um recipiente carregado entra como carregado.
- **Exportação para o GCS** agora bate exatamente com a ficha: recipiente carregado vai com os itens dentro (os equipados marcados); recipiente não carregado vai para "outros equipamentos" com tudo dentro. O limite que existia (item dentro de recipiente carregado contar como carregado no GCS) deixou de causar diferença.
- **Fichas antigas:** recipiente ○ com itens ●/✓ dentro ficam com os itens ○. O peso não muda, porque esses itens já não contavam. Se algum deles estava equipado, o bônus dele deixa de valer, conforme a regra.
- Ajuda e lupa 🔍 atualizadas com a regra.
- O módulo avançado (`a-`) não mudou; só o nome do arquivo acompanha a versão do kit.

---

## Novidades da v0.4.12 (sobre a v0.4.11)

### Seção "Módulo avançado" duplicada corrigida
- Em Importar/Exportar aparecia o bloco "Módulo avançado" duas vezes (a segunda cópia só com o texto e o botão de importar).
- Causa: o HTML do arquivo trazia uma cópia desse painel escrita à mão, e a limpeza do carregador não a reconhecia. Ela comparava "M[ÓO]dulo" com "Módulo" e, como este motor não lida bem com classes de letras acentuadas dentro de regex, a cópia antiga nunca era removida.
- Correção: a cópia foi removida do HTML e a limpeza agora ignora acento e maiúscula. Páginas exportadas que já carregam o painel "assado" também abrem com uma seção só.
- Verificado com e sem o módulo instalado: status, botão de importar e botão de remover seguem funcionando.
- O módulo avançado (`a-`) não mudou; só o nome do arquivo acompanha a versão do kit.
- O arquivo completo (`c-`) precisa ser gerado de novo a partir destes arquivos para receber a correção.

---

## Novidades da v0.4.11 (sobre a v0.4.10)

### Linha de Visão — ordem definitiva dentro dos grupos
- Causa raiz descoberta: este motor JavaScript tem comportamento instável com **classes de caracteres acentuados dentro de regexes** (`[aá]`, `[oó]`…), devolvendo resultado vazio sem avisar. Era por isso que o desempate por distância (“10 metros antes de 100 metros”) não disparava nos grupos “Alcance Ampliado, Linha de Visão”.
- Correção: a comparação agora normaliza o texto (NFD, removendo acentos) ANTES de casar — mesma técnica usada no resto do produto — e é verificada direto no motor embutido. Ordem final garantida: +70%/+35% (10 m) antes de +40%/+20% (100 m).

## Novidades da v0.4.10 (sobre a v0.4.9)

### Botões de importar/remover o pacote avançado corrigidos
- Causa raiz: arquivos salvos/exportados carregavam uma cópia “assada” do painel “Módulo avançado” dentro do próprio HTML. Ao abrir, o carregador encontrava o painel pronto e desistia de se inicializar — deixando os botões de colocar/tirar sem função alguma e exibindo um estado congelado (“já tem o avançado”).
- Correção: o painel agora é sempre reconstruído ao carregar (qualquer cópia antiga é removida antes) e os comandos ficam registrados mesmo em páginas exportadas.
- Resiliência: falhas silenciosas de armazenamento/recarga passaram a avisar com clareza. Falhas são informadas com mensagens claras indicando o próximo passo.
- Remoção verificada: após apagar, confere-se que nada ficou guardado; se a recarga automática não ocorrer, há instrução clara na tela.

## Novidades da v0.4.9 (sobre a v0.4.8)

### Linha de Visão — ordem e confirmação contra o acervo real
- Conferência rodando a **biblioteca completa real** pelo funil de modificadores: nenhuma duplicata remanescente nas famílias de alcance (as duas grafias "2x"/"x2" seguem canonizadas em uma só; nome+valor idênticos colapsam).
- Variantes de "Alcance Ampliado, Linha de Visão" ordenadas pela distância do alcance básico citado na nota: 10 m (+70%) antes de 100 m (+40%).
- Nota catalográfica: oficialmente existem APENAS duas versões de Linha de Visão — alcance básico de 10 metros (+70%) e de 100 metros (+40%); a versão genérica é "Alcance Ampliado, LDV" (+10%, consulte o livro), ambas com metades "só 1/2D"/"só Max" derivadas automaticamente.

## Novidades da v0.4.8 (sobre a v0.4.7)

### Famílias de Alcance Ampliado/Reduzido — duplicação eliminada e ordem numérica
- A biblioteca registra o mesmo multiplicador em duas grafias ("2x" e "x2", "10x" e "x10"...). Tudo passa a ser canonizado para uma única forma ANTES de gerar as variantes derivadas — nenhuma opção aparece duas vezes no seletor.
- Deduplicação das famílias de alcance passou a considerar nome + valor (a referência muda entre fontes da mesma opção, ex. B102 e B106).
- Ordem crescente por multiplicador (2 → 5 → 10 → 20 → 50 → 100) dentro dos grupos.
- Variantes escopadas nativas ("Máximo...", "1/2D...") são descartadas quando existe a versão completa correspondente; as metades "só 1/2D"/"só Max" continuam geradas, com metade do custo.

## Novidades da v0.4.7 (sobre a v0.4.6)

- **Valores em "%" corrigidos**: alguns modificadores exibiam "%%" e vários não eram aplicáveis porque certas bibliotecas trazem o custo como texto ("+5%", "-10%"). Agora todo custo é normalizado para número já na origem (com suporte a multiplicador "x4" e pontos fixos via `cost_type`): rótulos limpos e valores efetivamente aplicados ao selecionar.
- **Duplicatas de alcance eliminadas**: entradas nativas escopadas ("só 1/2D", "só Max", "Máximo…") que duplicavam as variantes geradas pelo programa deixam de aparecer quando existe a versão completa — sobram só as novas derivações, sempre com metade do custo calculada corretamente (sem NaN).
- **Agrupamento à prova de acentos**: "Alcance Máximo Ampliado"/"Alcance 1/2D…" passaram a agrupar corretamente no seletor. Causa raiz: comparação direta de acentos em regex era instável no motor embutido; passou a usar nomes normalizados (NFD), como no resto do produto.


## Novidades da v0.4.6 (sobre a v0.4.5)

- **"Por nível" dos modificadores agora sai na exportação `.gcs`**: os modificadores em % por nível saem com o **valor por nível + níveis**, então tanto o GCS quanto o próprio Singular recalculam e o total fecha igual ao da ficha. Ida-e-volta completa para esse caso.
- No arquivo, os nomes de modificador chegam sem o sufixo `[Nv:x]` (que é só da interface); os níveis vão no campo próprio (`levels`).


## Novidades da v0.4.5 (sobre a v0.4.4)

- **Traços com modificadores na exportação `.gcs`**: as vantagens/limitações aplicadas a um traço (% , pontos ou multiplicativo) passam a sair como modificadores nativos, com nome, custo e tipo. Antes ia apenas o total de pontos.
- **Magias completas**: a exportação passa a gravar o **custo de conjuração (PF)** e o **tempo (TO)** das mágicas; a duração também vai quando estiver preenchida. Antes iam só nome, dificuldade e pontos.
- **Ida-e-volta fechada** para esses campos: importar um `.gcs` reconstrói os dados equivalentes na ficha.


## Novidades da v0.4.4 (sobre a v0.4.3)

- **Idiomas no .gcs:** o nível volta a se chamar **Rudimentar** (a v0.4.3 exportava "Corrompido" por engano). A importação reconhece Rudimentar e continua aceitando arquivos antigos.
- **Importar idiomas de arquivos sem o bloco de cálculo** (como os que o Singular exporta): agora os pontos são calculados pelos modificadores. Antes, todo idioma era tratado como nativo e só o primeiro aparecia.
- O módulo avançado (`a-`) não mudou; só o número da versão.

---

## Novidades da v0.4.3 (sobre a v0.4.2)

- **Exportar .gcs agora usa o formato atual do GCS** (arquivo versão 5): estrutura, IDs, tags, notas, modificadores e equipamento no padrão que o GCS 5 grava. O GCS recalcula os totais ao abrir.
- **Equipamento exportado com a estrutura da ficha:** recipientes com os itens dentro, item Equipado marcado e itens **não carregados** em "outros equipamentos". Pesos saem com unidade (kg).
- **PV e PF perdidos agora são exportados** (antes o dano nunca saía) e voltam ao importar.
- **Pontos por nível dos traços** (ex.: Aptidão Mágica Nv.2) agora são exportados; antes se perdiam.
- **Importar .gcs:** os recipientes do equipamento são mantidos (antes viravam itens soltos), o estado Equipado é lido, "outros equipamentos" entram como não carregados e arquivos sem o bloco de cálculo são lidos corretamente.
- **Idiomas:** o nível (Nativo, Com Sotaque, Rudimentar) agora vai no nome dos modificadores e volta certo ao importar.
- Limite conhecido: um item dentro de um recipiente carregado conta como carregado no GCS (o GCS não guarda isso por item).
- O módulo avançado (`a-`) não mudou; só o número da versão.

---

## Novidades da v0.4.1 (sobre a v0.4.0)

- **Itens dentro de recipientes perfeitamente alinhados.** As colunas de dentro do recipiente agora têm exatamente a mesma largura e posição das colunas da lista principal (inclusive em recipientes dentro de recipientes), em qualquer tamanho de tela. Elas se ajustam sozinhas quando o conteúdo ou a tela mudam.
- **Novo indicativo de "dentro do recipiente":** em vez de recuo, cada item de dentro tem uma **faixa verde na lateral** e o fundo do recipiente é levemente esverdeado.
- **Painel da alça com abas de verdade.** ⚙ Modificadores, 🗡 Perícias e ✎ Bônus e armas agora abrem **dentro do próprio painel**, e dá para alternar entre as abas pela barra a qualquer momento. Ao aplicar ou cancelar, o painel volta para **Detalhes**, já atualizado.
- **⭐ muda na hora:** ao tocar em "Salvar na biblioteca", o texto troca na hora para "Remover da biblioteca" (e vice-versa), sem fechar o painel.
- O painel de **ataques** ganhou o mesmo comportamento (🗡 dentro do painel e ⭐ que alterna na hora).

## Novidades da v0.4.0 (sobre a v0.3.3)

**Botões da linha de equipamento passaram para a alça.** Na linha de cada item ficam só o **●** (carregado/equipado) e o **⤵** (mover). Um **toque na alça ⋮⋮** abre o painel do item, com abas (cada aba abre dentro do próprio painel):

| Aba | O que faz |
|---|---|
| **Detalhes** | resumo do item: quantidade, local, peso, valor, modificadores e ataques ligados |
| **⚙ Modificadores** | o painel de modificadores do item (antes o botão ⚙) |
| **🗡 Perícias** | escolher as perícias da arma (só aparece em armas com mais de uma perícia principal; antes o botão 🗡) |
| **✎ Bônus e armas** | bônus de RD/atributos e armas do item (antes o botão ✎) |
| **⭐ Salvar na biblioteca** | salva ou remove o item da biblioteca (antes o botão ⭐) |

- Duplo toque na alça continua excluindo o item.
- O **⤵** é o único botão de mover. Dentro de um recipiente ele oferece **↑ Lista principal** e os outros recipientes (não mostra o recipiente onde o item já está). O botão ↑ antigo foi retirado.
- Corrigido: depois de mover um item entre a lista principal e um recipiente, a linha perdia os botões. Agora a linha fica sempre igual.
- Fichas salvas na v0.3.3 ou antes são ajustadas sozinhas ao abrir: os botões antigos somem da linha.
- A Ajuda e a lupa 🔍 foram atualizadas com a nova alça e o ⤵.

---

## O que mudou em relação à v0.0.365

Esta lista vem da comparação direta entre o HTML completo da v0.0.365 e o da v0.3.3. Quando a versão em que a mudança entrou é conhecida, ela aparece entre parênteses.

### Equipamentos e armas
- Cada item de equipamento tem identidade própria. Excluir o item remove os ataques vinculados a ele (corpo a corpo e à distância), inclusive em recipientes aninhados. Fichas antigas são migradas sozinhas, uma vez (v0.0.367).
- Itens de dentro de recipientes também geram seus ataques (v0.0.367).
- Corrigida a duplicação de armas ao adicionar equipamento. Fichas que já tinham ataques repetidos do mesmo item ficam com um só (v0.0.371).
- Armas com mais de uma perícia apropriada: dá para escolher quais perícias principais usar (ex.: Bordão = Bastão / Espada de Duas Mãos). Só as linhas das perícias escolhidas entram em Combate. A escolha pode ser reaberta a qualquer momento pela aba 🗡 Perícias da alça do item (v0.0.372 a v0.0.375).
- O cálculo do NH da arma entende perícias com especialização no formato "Nome (Especialização)".
- Itens com o mesmo nome na biblioteca (ex.: duas entradas "Bastão Curto") não se misturam mais. Vale a entrada que foi escolhida. Corrigida também a perícia principal da Espada Bastarda (v0.0.371 e v0.0.375).
- Botão ⤵ para mover um item de equipamento entre recipientes (na v0.4.0 passou a levar também de volta à lista principal).
- Recipientes aninhados ficam sem o recuo e a borda lateral que tinham antes.
- Seletor de equipamento: nome e selo de RD quebram de forma equilibrada, sem o selo espremido (v0.0.372).
- O seletor mostra o dano das armas em dados e não grava mais os resultados da busca no HTML salvo (v0.0.370).

### Combate
- Os ataques mostram o dano em dados (ex.: 1d+2) em vez de thr/sw/GdP/GeB. Aceita também a grafia antiga "GdB" (v0.0.367).
- O NH e o Aparar de combate ligados à perícia são calculados no módulo **básico**, sem depender do avançado (v0.0.373 e v0.3.3).
- O Bônus de Defesa (escudo, broquel, capa equipados) entra na Esquiva e no Aparar. Ele é somado uma única vez e some ao desequipar. Antes contava em dobro nas armas ligadas a perícia e sobrava ao desequipar (v0.0.370 e v0.3.3).
- Mudar o nível de uma perícia recalcula a BD/atributos e também o NH de combate ligado a ela (v0.1.7).

### Vantagens e desvantagens
- A aba e os botões "Traços/T" passaram a se chamar **Vantagens e Desvantagens / V/D**.
- Filtro por suplemento (B, M, PSI etc., a partir do código da Referência) no seletor de itens e nos seletores de modificadores. Aceita marcar vários suplementos (v0.0.366).
- O aviso ⚠ de pré-requisito (traços, perícias, mágicas) abre um painel de verdade em vez de um alerta simples.

### Ataques e traços (toque na alça)
- **Toque na alça** de um ataque ou traço abre o painel de detalhes, com abas (Detalhes / Perícias da arma / Salvar na biblioteca). Isso substitui vários botões soltos na linha. Duplo toque continua excluindo (v0.1.0).
- Salvar e remover ataque da biblioteca não corrompe mais a linha (v0.1.1).
- O painel de mágica mostra dano, uso e alcance organizados, em vez de campos internos crus (v0.1.1).

### Ajuda
- **Ajuda por toque:** o botão "?" da barra superior virou uma lupa 🔍. Toque na lupa para ativar e depois toque em qualquer elemento da ficha para ver uma dica. Segure a lupa para ver todas as dicas da tela. Os modais têm sua própria lupa.
- A janela de Ajuda continua disponível em **⋯ › Ajuda**.

### Tradução
- O que ainda aparecia em inglês foi para o português: nomes de armas, 1 mão/2 mãos, tipos de golpe, tipos de dano e referências como "ver B411". Os IDs e valores internos do motor não foram traduzidos (v0.0.367).
- Os ataques naturais da biblioteca (Bico Afiado, Cascos, Dentes Afiados, Espinhos, Garras Afiadas etc.) e o Judô agora têm o tipo de uso em português (ex.: Bicada, Mordida, Arremesso).

### Impressão
- Nova opção **🖨 Imprimir — modelo oficial (2 páginas + Grimório)**, na estrutura do JCSP: A4, 2 páginas, com continuações e o retrato na segunda página. A impressão original continua disponível (v0.0.367 e v0.0.371).
- O Grimório entra como página extra somente quando a ficha tem mágicas (v0.0.367).
- A impressão é montada a partir dos dados da ficha, não grava nada nela e não abre janela extra.

### Biblioteca embutida
- Entraram 300 itens de alquimia, em cinco grupos: Gemas de Energia, Poções, Unguentos, Pós e Pastilhas.
- As 877 mágicas passaram a constar também em uma segunda cópia, no formato nativo do GCS (a biblioteca crua passou de 877 para 1.754 mágicas).
- Registros repetidos (mesmo id) são tratados como um só (v0.0.371).

### Módulos e kit
- A limpeza automática não desliga mais Poderes e Habilidades Modulares quando o módulo avançado já vem embutido (v0.1.1).
- O HTML completo sempre traz tudo embutido. Só no kit o básico e o avançado são separados (v0.1.1).
- A rolagem infinita dos seletores voltou a funcionar (v0.0.368 e v0.0.370).
- O kit passou a incluir este Leia-me em todas as entregas (v0.1.1).

### Versionamento
- A numeração segue o SemVer (semver.org/lang/pt-BR) desde a v0.1.0.
