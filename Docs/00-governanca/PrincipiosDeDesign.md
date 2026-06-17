# Princípios de Design da SINGULAR

**Código:** DES-1.0

**Status:** Documento Normativo

---

# Objetivo

Este documento reúne os princípios de engenharia de software que deverão orientar todas as decisões de implementação da SINGULAR.

Sempre que existirem múltiplas soluções compatíveis com a Constituição e com a Arquitetura, deverá ser preferida aquela que melhor respeitar estes princípios.

---

# 1. Simplicidade (KISS)

A solução mais simples que atenda corretamente aos requisitos deverá ser preferida.

Complexidade somente será aceita quando produzir benefícios claros e mensuráveis.

---

# 2. Não se Repita (DRY)

Uma regra de negócio deve existir em apenas um local.

Duplicação de lógica é considerada dívida técnica.

Duplicação ocasional de dados derivados poderá existir apenas quando houver justificativa documentada de desempenho.

---

# 3. Você Não Vai Precisar Disso (YAGNI)

Funcionalidades futuras não deverão ser implementadas antecipadamente.

A arquitetura deve permitir crescimento futuro sem obrigar implementações prematuras.

---

# 4. Responsabilidade Única

Cada componente deverá possuir uma única responsabilidade principal.

Mudanças de um motivo não deverão afetar componentes responsáveis por outros motivos.

---

# 5. Composição Antes de Herança

Sempre que possível, novos comportamentos deverão ser obtidos através de composição, módulos e schemas.

Hierarquias profundas de herança deverão ser evitadas.

---

# 6. Dados Declarativos

Sempre que possível, regras deverão ser descritas como dados.

O Motor interpreta regras.

A Interface apenas apresenta informações.

---

# 7. API Semântica

As operações públicas deverão representar intenções do usuário.

Exemplos:

- AddItem
- EquipItem
- SpendPool
- RenameCharacter

Evitar métodos genéricos como:

- setValue()
- updateField()

---

# 8. Fluxo Unidirecional

Toda alteração deverá percorrer o fluxo oficial da arquitetura.

Não deverão existir atalhos entre Interface, Domínio e Infraestrutura.

---

# 9. Fail Fast

Estados inválidos deverão ser detectados o mais cedo possível.

Erros silenciosos deverão ser evitados.

---

# 10. Imutabilidade Sempre que Possível

Objetos imutáveis reduzem efeitos colaterais e facilitam testes.

Sempre que não houver prejuízo significativo de desempenho, a imutabilidade deverá ser preferida.

---

# 11. Fonte Única da Verdade

Cada informação possuirá apenas uma representação canônica.

Valores derivados nunca deverão substituir os dados originais.

---

# 12. Convenção Antes de Configuração

Comportamentos comuns deverão possuir convenções padronizadas.

Configurações adicionais deverão existir apenas quando realmente necessárias.

---

# 13. Baixo Acoplamento

Componentes deverão conhecer apenas aquilo que for estritamente necessário.

Dependências desnecessárias deverão ser eliminadas.

---

# 14. Alta Coesão

Cada módulo deverá concentrar responsabilidades relacionadas.

Componentes que fazem "de tudo um pouco" deverão ser evitados.

---

# 15. Testabilidade

Toda lógica importante deverá ser isolável e testável.

A Interface nunca deverá ser necessária para validar regras do domínio.

---

# 16. Auditabilidade

Toda decisão relevante do Motor deverá poder ser explicada.

Resultados sem justificativa visível deverão ser considerados defeitos.

---

# 17. Evolução Incremental

Grandes mudanças deverão ser realizadas através de pequenas etapas verificáveis.

Sempre que possível, evitar reescritas completas.

---

# 18. Compatibilidade Controlada

Compatibilidade retroativa deverá ser mantida apenas quando agregar valor ao projeto.

Código legado sem utilidade deverá ser removido.

---

# 19. Clareza Acima de Esperteza

Código simples e explícito deverá ser preferido a soluções excessivamente engenhosas.

A legibilidade possui prioridade sobre a redução de linhas de código.

---

# 20. Documentação Viva

Toda mudança arquitetural relevante deverá atualizar a documentação correspondente.

Documentação desatualizada é considerada defeito.

---

# Compromisso

Todo código produzido para a SINGULAR deverá buscar equilíbrio entre simplicidade, desempenho, clareza, extensibilidade e manutenibilidade.

Nenhum princípio é absoluto.

Quando houver conflito entre princípios, a decisão deverá ser documentada por meio de uma ADR.
