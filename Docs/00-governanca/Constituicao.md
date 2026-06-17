# Constituição da SINGULAR

**Código:** CON-2.0  
**Status:** Norma Fundamental Permanente

---

# Preâmbulo

A Constituição da SINGULAR estabelece os princípios fundamentais que orientam a arquitetura, o desenvolvimento e a evolução da plataforma.

Se qualquer implementação entrar em conflito com esta Constituição, a implementação deverá ser revista.

A Constituição descreve princípios, não tecnologias ou detalhes de implementação.

---

# Artigo 1 — Missão

A SINGULAR existe para reduzir o esforço administrativo dos jogadores e mestres, permitindo que a atenção permaneça no jogo.

---

# Artigo 2 — Separação de Responsabilidades

Cada componente deve possuir responsabilidades claramente definidas.

Nenhum componente deverá assumir responsabilidades pertencentes a outro.

---

# Artigo 3 — Soberania do Domínio

Toda regra de negócio pertence ao domínio.

Interfaces, persistência e infraestrutura jamais implementarão regras do sistema de jogo.

---

# Artigo 4 — Interface Passiva

A interface existe apenas para apresentar informações, coletar entradas do usuário e comunicar intenções.

A interface nunca executará regras de negócio.

---

# Artigo 5 — Fonte Única da Verdade

Cada informação possuirá uma única fonte canônica.

Informações derivadas deverão ser obtidas a partir dessa fonte, nunca duplicadas.

---

# Artigo 6 — Determinismo

As mesmas entradas deverão produzir exatamente os mesmos resultados.

---

# Artigo 7 — Auditabilidade

Todo valor calculado deverá poder explicar sua origem, os modificadores aplicados e as regras utilizadas para produzir o resultado final.

---

# Artigo 8 — Explicabilidade

O sistema deverá permitir que o usuário compreenda como cada resultado foi obtido.

Automação nunca deverá significar perda de transparência.

---

# Artigo 9 — Extensibilidade

Novas mecânicas deverão ser adicionadas sem exigir alterações estruturais no núcleo da plataforma sempre que tecnicamente possível.

---

# Artigo 10 — Independência do Sistema

O núcleo da SINGULAR não pertence a GURPS.

Sistemas de RPG serão implementados através de módulos especializados.

---

# Artigo 11 — Modularidade

Cada módulo deverá poder evoluir com o menor impacto possível sobre os demais.

---

# Artigo 12 — Baixo Acoplamento

Dependências entre componentes deverão ser reduzidas ao mínimo necessário.

---

# Artigo 13 — Alta Coesão

Cada componente deverá possuir uma responsabilidade única e claramente identificável.

---

# Artigo 14 — Comunicação Controlada

Componentes deverão interagir apenas através de contratos públicos definidos pela arquitetura.

---

# Artigo 15 — Reversibilidade

Toda alteração reversível deverá poder ser desfeita e refeita sem perda de consistência.

---

# Artigo 16 — Preservação dos Dados

Nenhuma informação importada deverá ser descartada sem decisão explícita do usuário.

---

# Artigo 17 — Evolução Sustentável

A evolução da plataforma deverá privilegiar composição, reutilização e simplicidade antes da criação de novos conceitos fundamentais.

---

# Artigo 18 — Performance

O desempenho deverá permanecer adequado mesmo para personagens extremamente complexos.

---

# Artigo 19 — Mobile First

Toda decisão de experiência de uso deverá considerar dispositivos móveis como plataforma principal.

---

# Artigo 20 — Offline First

A plataforma deverá permanecer plenamente funcional sem conexão permanente com a internet, sempre que tecnicamente possível.

---

# Artigo 21 — Acessibilidade

A plataforma deverá buscar oferecer uma experiência utilizável pelo maior número possível de pessoas, respeitando princípios de acessibilidade.

---

# Artigo 22 — Documentação

Toda decisão arquitetural relevante deverá ser documentada.

A documentação é parte integrante do produto.

---

# Artigo 23 — Princípio da Menor Ontologia

Novos conceitos fundamentais somente deverão ser criados quando não puderem ser representados adequadamente pelas abstrações existentes.

---

# Artigo 24 — Qualidade Arquitetural

Toda decisão deverá buscar simultaneamente:

- simplicidade;
- clareza;
- testabilidade;
- extensibilidade;
- manutenibilidade.

---

# Artigo 25 — Integridade da Constituição

Esta Constituição possui precedência sobre qualquer decisão técnica.

Alterações nesta Constituição deverão ocorrer apenas quando necessárias para preservar sua coerência e deverão ser registradas formalmente.
