# v0.0.366 — filtro por suplemento (só o Singular-basico.html mudou; o módulo avançado segue igual)

- Botão "📚 Suplemento" (marcar vários ao mesmo tempo, com contagem e "Limpar seleção") nos seletores de traços, perícias, mágicas, equipamentos, armas, contêineres e modelos, e nos de modificadores (habilidade, equipamento, forma alternativa/morfose).
- O suplemento vem do código do livro no campo Referência (B123 → B; PSI72 → PSI; "B110,P99" vale para B e P). Itens sem referência ficam em "Sem referência". Nomes amigáveis só para B (Módulo Básico), M (Magia), P (Poderes), PSI (Psiquismo) e PU (Power-Ups); os demais aparecem só com o código. O filtro volta a "todos" a cada abertura.
- Bibliotecas novas ganham o filtro automaticamente, desde que os itens tenham o campo Referência preenchido.

# v0.0.365 — botões do recipiente discretos
# v0.0.364 — recipientes de volta à lista (18 itens)
# v0.0.363 — vantagens sem duplicatas (pelos ids do conjunto antigo)
# v0.0.362 — sem duplicatas no seletor (perícias, equipamentos, modificadores)
# v0.0.361 — correção do seletor de perícias (nome-base de técnica v5 como objeto)
# v0.0.360 — exportação sempre na versão 5 (não testado no GCS oficial)
# v0.0.359 — personalizados importados junto com o zip
# v0.0.358 — arquivo de itens ⭐ renomeado (Singular-personalizados.json)
# v0.0.357 — exportar a biblioteca como arquivos do GCS (.zip)
# v0.0.356 — salvamento leve (autosave ~1,3 s → ~15 ms)
# v0.0.355 — nomes corrompidos corrigidos
# v0.0.354 — correções de biblioteca

---

# Singular v0.0.353 — Modularização (básico + pacote avançado importável)

**Build atual: v0.0.353 — subiu de v0.0.352 nesta entrega.** Todos os ajustes abaixo (①–⑦) pertencem a esta mesma build; **cada entrega sobe a versão**.
① **Habilidades Modulares — atualização imediata:** “Fica em”, “Mover…” e os demais ajustes passam a redesenhar o painel na hora, sem precisar adicionar outra habilidade para a tela reagir.
② **Poderes — resumo integrado:** Psiquismo e Habilidades Modulares agora aparecem no quadro “Integrados” da seção Poderes, com custo real e botão *Abrir seção*.
③ **Importar o módulo avançado → tudo ligado:** na primeira abertura com o módulo, todos os tipos de poder ficam ligados por padrão (Favorecimento Divino, Feitiçaria, Poderes, Habilidades Modulares e Psiquismo) e a aba aterrissa na sub-aba **Poderes**. Depois disso você liga/desliga como quiser.
④ **Botões dos subsistemas mudaram de lugar:** saíram de dentro da seção Vantagens e agora ficam **dentro da seção Poderes, na mesma linha do botão “+ Novo poder” (à direita dele)** — junto do comando que cria poderes. Quando a seção de Poderes não está disponível, a faixa se apoia no fim da barra de sub-abas de Traços (comportamento de segurança).
⑤ **Ordem das sub-abas:** a barra de sub-abas de Traços segue agora a ordem **Vantagens → Poderes → Habilidades Modulares → Feitiçaria → demais** (Favorecimento Divino, Psiquismo…). Se a faixa de botões sair de vista em algum momento (ex.: edições que reconstruem o painel), ela é reposicionada automaticamente ao lado do “+ Novo poder”.

⑥ **Download com biblioteca completo:** “Baixar HTML limpo COM biblioteca” e “Baixar cópia desta página COM o personagem atual” agora levam **todas** as bibliotecas incorporadas — antes de gerar o arquivo o programa reincorpora automaticamente os registros do tipo *RAW* e, se alguma biblioteca ficar de fora, ela é recapturada direto do registro; o embutido da página corrente também é mantido atualizado a cada importação ou incorporação.
⑦ **Bloco “Módulo avançado” sem duplicatas:** abrir uma página exportada executava de novo o carregador da seção Importar/Exportar e colava um segundo bloco idêntico — agora a montagem é idempotente e qualquer cópia antiga em duplicidade (inclusive páginas já exportadas) é limpa automaticamente ao carregar.

*Obs.: a versão vive em uma fonte única — o `<meta name="app-version">` do cabeçalho do `Singular-basico.html`; a barra de ferramentas, o guia “?” e o título da aba puxam esse valor em tempo de execução.*

*Regra de numeração combinada: **cada entrega sobe a versão**. Enquanto `0.x` = beta; lançamento oficial = **1.0**. Depois disso: **grandes atualizações** mudam o 1º número; **adições** o número do meio; **correções de bugs** apenas o último número.*


Esta versão divide o programa em **dois arquivos**:

| Arquivo | O que é |
|---|---|
| `Singular-basico.html` | O programa completo, exceto Favorecimento Divino, Feitiçaria, motor de Poderes, Habilidades Modulares e Psiquismo (~1,75 MB). Abre sozinho, enxuto. |
| `Singular-modulo-avancado.html` | Pacote com todos esses sistemas avançados (~490 KB), importável por dentro do próprio programa. |
| `Singular349_kit_modular.zip` | Kit com os dois arquivos + ferramentas reproduzíveis da divisão. |

## Versão 349 — o que de fato falhava na 348, testado na tela

Esta rodada partiu de testes reais no navegador (celular simulado) e corrigiu o que a 347/348 dizia ter feito mas não funcionava:

- **Poderes — custo real:** os cartões de **Favorecimento Divino** e **Feitiçaria** dentro de Poderes mostravam “0 pts”. Agora mostram o custo real (ex.: 66 e 25 pts) ou “custo indisponível”. A contagem “poder(es) geral(is)” deixou de contar esses cartões.
- **Poderes — todos ou nenhum:** a opção de ⋯ → **Texto e exibição** passou a valer também para esses cartões. *Mostrar só quando tiver pontos* (padrão), *Mostrar todas* ou *Não mostrar* (nesse caso só aparecem se você tiver acrescentado habilidades extras a eles).
- **Feitiçaria — trava das mágicas simultâneas:** antes só impedia ligar uma mágica desligada; fichas já com várias ligadas continuavam todas ligadas. Agora o limite é imposto sempre: no máximo “foco” mágicas ligadas (as primeiras da lista ficam ligadas). Reduzir o foco desliga as sobras e avisa.
- **Esforço Adicional:** o modal era uma “foto” do momento em que abriu — trocar Efeito/NH, mudar %, etc. não atualizava o que se via. Agora o modal se atualiza a cada mudança.
- **Ajustes em modais:** os ajustes da **habilidade** (conjunto alternativo, comutabilidade, uso, teste, reserva modular) saíram do cartão e ficam no botão **⚙ Ajustes** da habilidade, em modal. Os ajustes do **poder** já eram modal e agora também se atualizam ao vivo. “Editar” continua abrindo o construtor de HAB.
- **Controles compactos e uniformes:** botões, campos e seletores do módulo e dos seus modais agora têm o mesmo tamanho (antes variavam de 22 a 27 px e de 10,5 a 13,3 px de fonte). **Texto e exibição → Menor / Normal / Maior** escala o texto e, junto, o respiro dos botões e campos.

Validações: básico 15/15 e módulo 6/6 blocos compilam; guardião de fonte única OK (meta 0.0.349); testes em Chromium (celular simulado) de cada item acima.

## Versão 348 — repasse da anterior (correção que aparecia na tela)

Mesma funcionalidade da versão 347, com um acerto importante que só dava para ver no aparelho: o bloco de estilos responsável pela compactação de botões e campos estava fora da tag própria e acabou **aparecendo como texto na tela** (e não aplicava a compactação). Corrigido — e o número subiu justamente para você conseguir diferenciar esta build da anterior: se o topo do app mostrar **v0.0.348**, é o pacote certo; **v0.0.347** era o anterior.

Validações: básico 15/15 e módulo 6/6 blocos compilando (QuickJS), guardião de fonte única OK (`meta 0.0.348`) e `testzip` limpo (md5 conferidos dentro e fora do kit).

## Versão 347 — Custo real nos cartões integrados, trava das mágicas simultâneas e ajustes em modais

**Cartões “integrados” com custo certo (Poderes):** os cartões de **Favorecimento Divino** e **Feitiçaria** que aparecem dentro da seção Poderes agora calculam o valor **direto na fonte** (nunca mais “0 pts” por leitura indireta); quando não houver dado disponível aparece “custo indisponível”. O status geral também soma corretamente todos os poderes integrados.

**Novo menu “🔤 Texto e exibição” (canto ⋯):**
- **Tamanho do texto dos botões e campos** — Menor / Normal / Maior, aplicando escala uniforme em todo o programa;
- **Outras fontes na seção Poderes** — “Mostrar só quando tiver pontos” (padrão), “Mostrar todas” ou “Não mostrar”, refletindo na hora na lista de Poderes.

**Trava das mágicas simultâneas (Feitiçaria):** o campo **“Mágicas simultâneas (foco)”** agora limita de verdade. No máximo N mágicas ficam ligadas ao mesmo tempo — ao tentar ligar além do foco aparece o aviso (“desligue uma antes…”); mágicas novas entram **desligadas** se não houver vaga; o painel mostra “ligadas X/Y” e sinaliza excesso. Vale para grimório e improvisadas.

**Ajustes do poder em modal:** o botão “⚙ Ajustes do poder” abre um **modal próprio** (nome, fonte, foco, modificador/fatores, Talento e Reserva de Energia) — nada mais fica empilhado dentro do card. Fechar pelo ✕ ou tocando fora devolve à lista. Ao criar habilidade nova, os campos rápidos dela ficam disponíveis direto no detalhe expandido.

**Esforço adicional em modal:** o painel de Esforço Adicional (que antes estufava a linha da habilidade) também abriu em modal próprio — consulta e cálculo idênticos, sem bagunça visual.

Validações desta rodada: todos os blocos `<script>` compilam (básico 15/15, módulo 6/6 via QuickJS), guardião de fonte única OK (meta 0.0.347) e `testzip` limpo (md5 dos HTMLs conferidos dentro e fora do zip).

## Versão 346 — Controles rápidos ●/○ e lista de mágicas improvisadas

**Ponto rápido (●/○) em cada item, sem expandir nada:** um botão discreto no próprio card/linha liga ou desliga na hora:
- **Feitiçaria** — ●/○ em cada mágica marca “ligada/desligada” (estado novo, salvo na ficha; desligadas ficam atenuadas pelo nome).
- **Favorecimento Divino** — ●/○ alterna a oração marcada como “em uso” direto no resumo dela, sem abrir o card.
- **Motor de Poderes** — nas habilidades “à vontade”, o ponto na linha compacta alterna Ligado/Desligado (mesmo comportamento que antes só existia dentro do detalhe expandido).
- **Habilidades Modulares** — o ponto ao lado de cada carga ativa/desativa aquela carga direto pela lista do slot.

**Mágicas improvisadas:** a Feitiçaria agora separa **“Mágicas do grimório”** (aprendidas do catálogo) de **“Mágicas improvisadas (suas criações)”** — grupo dedicado para as suas mágicas próprias, ordenável por **Nome** ou **Custo**. O liga/desliga vale para as duas listas.

**Por que o Psiquismo ficou sem o ponto:** nas regras das habilidades psíquicas não há estado “ligado/desligado” — elas funcionam quando usadas (e os Talentos são passivos permanentes). Sem mudança de mecânica, sem botão novo.

Validações desta rodada: todos os blocos `<script>` compilam (básico 15/15, módulo 6/6 via QuickJS), o guardião de fonte única passa no básico (meta 0.0.346) e o `testzip` do kit está limpo (md5 dos dois HTMLs conferidos dentro e fora do zip).

## Versão 345 — Psiquismo, abas enxutas e modais nos fluxos de adição

**Rótulos:** “Poderes Psíquicos” passou a se chamar **Psiquismo** na seção, na aba e nos textos de interface. As duas seções longas foram abreviadas **apenas na navegação das sub-abas** de Traços: **Fav. Divino** e **Hab. Modulares** (os botões de ligar/desligar e os títulos das seções continuam por extenso: “Favorecimento Divino”, “Habilidades Modulares”).

**Modais onde couber:** os dois fluxos de adição mais volumosos saíram das caixas colapsáveis e viraram modais iguais aos do lado básico:
- **Favorecimento Divino → “＋ Adicionar oração”** abre um modal próprio (catálogo, milagre próprio e construtor de HAB) — ganhando cabeçalho com ✕ e fechamento por toque fora;
- **Feitiçaria → “＋ Adicionar mágica”** idem (grimório do livro + mágica própria + construtor de HAB).

Os formulários seguem exatamente os mesmos controles de antes; ao adicionar com sucesso, o modal fecha sozinho e aparece um aviso (“… adicionado(a)”). As demais caixas colapsáveis (configurações, improviso, ajuda) permanecem como estavam.

**Compatibilidade:** nada muda nos dados salvos — só rótulos e a forma de abrir formulários. Todos os blocos compilam (básico 15/15, módulo 6/6, QuickJS) e a fonte única de versão permaneceu intacta.

## Versão 344 — interfaces do módulo avançado alinhadas ao padrão do básico

Os painéis dos sistemas avançados (Favorecimento Divino, Feitiçaria, Poderes, Habilidades Modulares e Poderes Psíquicos) ficaram visualmente destoantes do resto do programa: botões apagados com fundo de campo cinza, cantos mais retos e nenhum feedback de foco. Agora eles seguem o mesmo desenho do lado básico:

- **Botões de ação** (“+ Adicionar”, etc.) passaram ao padrão dourado do programa (fundo translúcido dourado, borda dourada, texto dourado, raio 7px, negrito), com estados de hover e toque — iguais aos botões `.mbtn` das telas básicas;
- **Campos de entrada** (inputs, selects e textareas) agora têm raio 7px, padding generoso (7×9 px) e **borda dourada em foco**, como os campos dos modais do básico;
- Os painéis perderam o fundo cinza próprio: ficam transparentes dentro da seção, sem “caixa clara” sobreposta ao card;
- Avisos usam as mesmas cores do restante do programa (vermelho `--neg` para erro, verde fixo para sucesso, dourado para aviso);
- Botões pequenos de ações inline ganharam um pouco mais de respiro (3×8 px).

Nenhuma regra de negócio mudou — são apenas as folhas de estilo que cada subsistema injeta. No básico, só a versão subiu (fonte única `<meta>` → 0.0.344).

Validações desta rodada: todos os blocos `<script>` compilam (básico 15/15, módulo 6/6 via QuickJS) e o guardião de fonte única passa no básico.

## Versão 343 — remover e reimportar o módulo não apaga mais seus dados

Antes, “Remover o módulo” limpava poderes, psiquismo etc. das fichas salvas, e ao reimportar não havia mais nada para voltar. Agora a limpeza só tira os painéis da tela e **guarda os dados dentro da própria ficha** (autosave, ficha rápida e personagens salvos). Ao reimportar o módulo, tudo volta sozinho — inclusive fichas salvas com o módulo ausente. Só o `Singular-basico.html` mudou; o módulo continua o da v0.0.342.

Atenção: fichas que já foram limpas pela v0.0.341/342 perderam esses dados e não dá para recuperá-los; vale para as fichas salvas daqui em diante.

## Versão 342 — Poderes Psíquicos: ações múltiplas e tentativas repetidas

Só o módulo avançado mudou (o básico apenas teve a versão subida). Em cada habilidade psíquica (exceto Talento) há o botão **“Ações múltiplas / tentativas”**: informe quantas outras habilidades do mesmo poder estão em uso, se ela é passiva, quantas falhas anteriores houve na mesma ação e alvo e o PF da própria habilidade. O painel mostra o modificador na perícia e o custo total em PF. Se o painel de Esforço Adicional estiver aberto, o modificador entra no teste de esforço extra. É só consulta: nada novo é salvo na ficha.

## Como usar no celular

1. Baixe **os dois** arquivos para o aparelho.
2. Abra `Singular-basico.html` no navegador (Chrome/Firefox). Está sem os poderes avançados.
3. Para voltar ao modo completo: toque em **⋯ (Mais ações) → Importar / Exportar** e, na seção **“🧩 Módulo avançado”**, use **“📂 Importar módulo avançado (.html)”** e escolha `Singular-modulo-avancado.html`. A página recarrega sozinha e tudo volta a funcionar — personagens salvos permanecem intactos.
4. Opcional: **"✕ Remover o módulo desta página"** deixa a interface enxuta de novo, sem resetar a ficha.

## Versão 341 — saneamento reforçado

Corrigido o comportamento após remover o módulo, que deixava botões mortos visíveis às vezes. Agora a remoção limpa **todos** os cantos onde resíduos podiam ficar:

- **DOM vivo** — seções e painéis abertos são removidos imediatamente;
- **Snapshots salvos** (autosave e ficha rápida) no localStorage **e no IndexedDB**;
- **Personagens salvos manualmente** (“Salvar personagem”) também passam pela mesma limpeza;
- Cura automática periódica: se a página não tem o módulo importado, uma varredura elimina resquícios antigos sem precisar resetar nada.

Ou seja: mesmo que existam fichas ou autosaves antigos com partes dos painéis gravadas, elas chegam limpas no lado básico — nenhuma ação manual necessária.

## Fluxo de trabalho recomendado

- Guarde sempre **um único par** de arquivos (basico + modulo) como origem única de verdade.
- Quando quiser evoluir, edite o original unificado e refaça a divisão rodando as duas ferramentas em `ferramentas/`:
  - `split_v2.py` — gera os dois arquivos a partir do unificado (`python3 split_v2.py`).
  - `check_js.py` — verifica a sintaxe de cada bloco dos dois lados (`python3 check_js.py`).
- No lado “básico”, mantenha a regra de fonte única: só um `meta name="app-version" content="…">` pode existir (`verificadores/verificar_versao.py` confere).

## Verificações feitas nesta entrega

- Cortes byte-a-byte idênticos aos blocos originais (md5 conferido);
- Todos os blocos `<script>` compilam nos três arquivos (original, básico, módulo) — validados com QuickJS;
- Nenhum criador órfão de seção de poder resta no básico (`ensureSection(` ausente; `window.SINGULAR_POWER_SECTIONS` nunca definido);
- Todas as referências cruzadas que sobraram são defensivas (`? :`, `if (!API) return`, `try/catch`) — o básico tolera a ausência total dos módulos.
