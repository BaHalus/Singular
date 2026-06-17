# Constituição da SINGULAR

**Versão:** 1.0 (Fundacional)

**Status:** Norma Arquitetural Permanente

---

# Preâmbulo

A SINGULAR é uma plataforma para criação, gerenciamento e utilização de personagens de RPG, distribuída inicialmente como um único arquivo HTML, projetada para ser modular, extensível, desacoplada, performática e utilizável principalmente em dispositivos móveis.

Toda decisão arquitetural futura deverá preservar os princípios estabelecidos neste documento.

---

# Artigo 1 — Separação de Responsabilidades

Cada camada possui responsabilidades exclusivas.

Nenhuma camada poderá assumir responsabilidades pertencentes a outra.

---

# Artigo 2 — Soberania do Motor

Todo cálculo pertence exclusivamente ao Motor.

Nenhum cálculo poderá existir duplicado em qualquer outra camada.

---

# Artigo 3 — Schema Declarativo

O Schema apenas descreve estruturas, propriedades, relacionamentos e regras declarativas.

O Schema jamais executará cálculos.

---

# Artigo 4 — Interface Passiva

A Interface apenas apresenta informações, coleta entradas do usuário e dispara eventos.

A Interface nunca calculará valores nem modificará diretamente o modelo de dados.

---

# Artigo 5 — Dados Canônicos

Os únicos dados permanentes do personagem são aqueles necessários para reconstruí-lo.

Toda informação derivada deverá ser recalculada pelo Motor.

---

# Artigo 6 — Estados Transitórios

Estados temporários pertencem exclusivamente ao State.

Jamais poderão modificar permanentemente o Character.

---

# Artigo 7 — Identidade Permanente

Toda entidade persistente possuirá um UUID imutável.

Posição, nome, ordem ou índice jamais poderão ser utilizados como identidade.

---

# Artigo 8 — Comunicação por Eventos

Módulos independentes comunicar-se-ão preferencialmente por eventos.

Dependências diretas deverão ser minimizadas.

---

# Artigo 9 — API Soberana

Toda alteração de dados deverá ocorrer através da API pública do sistema.

Nenhum componente poderá modificar diretamente Character, State ou Library.

---

# Artigo 10 — Independência dos Componentes

Todo componente deverá poder ser removido, substituído, reutilizado ou reorganizado sem impactar outros componentes.

---

# Artigo 11 — Expansibilidade

Novas mecânicas deverão ser adicionadas através de Schemas, Bibliotecas, Plugins ou Módulos.

Sempre que possível, o núcleo permanecerá inalterado.

---

# Artigo 12 — Preservação de Dados

Nenhuma informação importada poderá ser descartada sem decisão explícita do usuário.

Dados desconhecidos deverão ser preservados para futura exportação.

---

# Artigo 13 — Persistência

Persistência armazenará apenas dados permanentes, estados transitórios, preferências e metadados necessários.

Informações derivadas não deverão ser persistidas.

---

# Artigo 14 — Histórico

Toda alteração reversível será registrada como Command.

Undo e Redo operarão sobre comandos, nunca sobre capturas completas do estado.

---

# Artigo 15 — Mobile First

Toda decisão de interface deverá considerar o uso em dispositivos móveis como prioridade.

A experiência em desktop será consequência da adaptação do mesmo sistema.

---

# Artigo 16 — Performance

O sistema deverá permanecer responsivo mesmo para personagens extremamente grandes.

Recálculos, renderização e persistência deverão ocorrer apenas quando necessários.

---

# Artigo 17 — Desacoplamento do Domínio

O núcleo da SINGULAR não conhecerá regras específicas de GURPS ou de qualquer outro sistema.

Regras de jogo deverão ser fornecidas por módulos declarativos.

---

# Artigo 18 — Compatibilidade Evolutiva

Sempre que possível, novas versões deverão preservar a capacidade de interpretar dados produzidos por versões anteriores.

Quando incompatibilidades forem inevitáveis, deverão existir mecanismos formais de migração.

---

# Artigo 19 — Simplicidade Arquitetural

Nenhuma solução será adotada apenas por conveniência imediata.

Entre duas soluções funcionalmente equivalentes, deverá ser escolhida aquela que reduzir a complexidade estrutural.

---

# Artigo 20 — Integridade da Constituição

Toda decisão arquitetural deverá ser compatível com esta Constituição.

Caso uma nova necessidade entre em conflito com qualquer artigo, a Constituição deverá ser revisada antes da implementação.

---

# Cláusula de Revisão

A Constituição é um documento permanente.

Ela poderá evoluir apenas por consenso explícito entre os mantenedores do projeto, devendo toda alteração ser registrada como uma ADR (Architecture Decision Record), preservando o histórico e a justificativa da mudança.
