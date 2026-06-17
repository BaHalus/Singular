# Objetivos Arquiteturais da SINGULAR

**Código:** OBJ-1.0

**Status:** Documento Normativo

---

# Objetivo

Este documento estabelece os objetivos permanentes da arquitetura da SINGULAR.

Sempre que existirem múltiplas soluções tecnicamente válidas, deverá ser preferida aquela que melhor atenda aos objetivos definidos neste documento.

Da mesma forma, este documento define antiobjetivos: características que o projeto deliberadamente evitará.

---

# Objetivos

## 1. Mobile First

A experiência principal da plataforma é o uso em dispositivos móveis.

Todas as funcionalidades deverão ser utilizáveis confortavelmente em celulares.

O desktop representa apenas uma adaptação da mesma interface.

---

## 2. Offline First

A plataforma deverá permanecer plenamente funcional sem conexão permanente com a Internet.

A conexão é um recurso adicional, não um requisito.

---

## 3. Arquitetura Duradoura

A arquitetura deverá permanecer estável mesmo durante grandes evoluções do sistema.

Mudanças frequentes devem ocorrer na implementação, não nos princípios arquiteturais.

---

## 4. Extensibilidade

Novas mecânicas, suplementos e sistemas deverão ser adicionados através de módulos e schemas.

O núcleo deverá sofrer o mínimo possível de alterações.

---

## 5. Simplicidade

Sempre que duas soluções resolverem o mesmo problema com qualidade equivalente, deverá ser escolhida a mais simples.

---

## 6. Clareza

Código, documentação e arquitetura devem ser compreensíveis.

Soluções excessivamente complexas deverão ser evitadas.

---

## 7. Desempenho

A plataforma deverá permanecer responsiva mesmo para personagens extremamente grandes.

Recálculos desnecessários deverão ser evitados.

---

## 8. Auditabilidade

Todo resultado produzido pelo Motor deverá poder ser explicado ao usuário.

Nenhum cálculo importante deverá ser uma caixa-preta.

---

## 9. Testabilidade

Toda lógica importante deverá poder ser testada independentemente da interface.

---

## 10. Reutilização

Sempre que possível, funcionalidades deverão ser reutilizadas em vez de duplicadas.

---

## 11. Modularidade

Os componentes deverão possuir baixo acoplamento e alta coesão.

Cada módulo deverá poder evoluir independentemente.

---

## 12. Portabilidade

A plataforma deverá minimizar dependências externas.

Sempre que possível, os dados deverão utilizar formatos abertos e documentados.

---

## 13. Preservação de Dados

Importações nunca deverão descartar informações silenciosamente.

Sempre que possível, dados desconhecidos deverão ser preservados.

---

## 14. Escalabilidade

A arquitetura deverá suportar crescimento contínuo do código, da documentação e da quantidade de módulos sem perda significativa de organização.

---

## 15. Evolução Segura

Mudanças importantes deverão ocorrer de maneira incremental, documentada e reversível sempre que possível.

---

# Antiobjetivos

A SINGULAR deliberadamente evita:

## Lógica duplicada

Uma regra de negócio nunca deverá existir em mais de um lugar.

---

## Cálculos na Interface

A Interface nunca deverá executar regras de negócio.

---

## Dependências circulares

Componentes não deverão depender mutuamente.

---

## Acoplamento excessivo

Mudanças locais não deverão produzir efeitos inesperados em outras partes do sistema.

---

## Código específico de GURPS no núcleo

O núcleo deverá permanecer independente de qualquer sistema de RPG.

---

## Componentes dependentes da posição na tela

A posição visual nunca deverá definir comportamento.

---

## Estruturas rígidas

O sistema deverá favorecer abstrações genéricas em vez de listas fixas de tipos.

---

## Estados inconsistentes

O sistema deverá impedir estados parcialmente atualizados.

---

## Recalcular tudo

O Motor deverá recalcular apenas aquilo que realmente foi afetado por uma alteração.

---

## Caixas-pretas

O usuário deverá conseguir compreender a origem dos valores apresentados.

---

## Crescimento desordenado

Novos recursos não deverão aumentar desnecessariamente a complexidade da arquitetura.

---

## Documentação desatualizada

Mudanças arquiteturais relevantes deverão ser acompanhadas da atualização da documentação correspondente.

---

# Critérios de Avaliação

Toda decisão arquitetural deverá ser avaliada segundo os seguintes critérios:

- Simplicidade
- Clareza
- Desempenho
- Testabilidade
- Auditabilidade
- Modularidade
- Extensibilidade
- Manutenibilidade

Uma solução que atenda melhor a esse conjunto de critérios deverá ser preferida.

---

# Compromisso

A arquitetura da SINGULAR deverá priorizar qualidade de longo prazo em vez de conveniência imediata.

Toda decisão deverá considerar não apenas a necessidade atual, mas também seu impacto na evolução futura da plataforma.
