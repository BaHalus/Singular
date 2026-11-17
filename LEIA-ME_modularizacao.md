# SINGULAR v0.4.1 — kit modular

## Como usar

1. Abra `b-Singular-basico.html`.
2. No painel de importação do módulo avançado, selecione `a-Singular-modulo-avancado.html`.

O arquivo completo (`c-Singular-v2_v0_4_1_limpo_com_biblioteca.html`) é entregue separadamente e já traz os sistemas avançados embutidos. Ele não precisa de importação.

## Padrão de nomes dos arquivos

| Prefixo | O que é |
|---|---|
| `a-` | módulo **avançado** |
| `b-` | versão **básica** |
| `c-` | versão **completa** (tudo em um arquivo só) |
| `z-` | pacote **zip** |

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
- Os ataques naturais da biblioteca (Bico Afiado, Cascos, Dentes Afiados, Espinhos, Garras Afiados etc.) e o Judô agora têm o tipo de uso em português (ex.: Bicada, Mordida, Arremesso).

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

