# Integridade do plano de improvisação de Morfose

**Bloco:** DOM-MORPH-1.4

O plano efêmero de improvisação possui um `integrityFingerprint` calculado sobre sua identidade, rascunho, política, avaliação de limite, conjunto, estado e diagnósticos.

Antes da execução, o domínio verifica:

- coerência entre `draft` e `draftFingerprint`;
- coerência entre `policySnapshot` e `policyFingerprint`;
- coerência do envelope completo com `integrityFingerprint`;
- correspondência com a reanálise do personagem e do conjunto atuais;
- igualdade da avaliação declarativa de limite em pontos.

Qualquer divergência rejeita o plano antes de criar, atualizar ou descartar uma projeção. Essa proteção não transforma o plano em estado persistente nem substitui a revalidação contra o agregado atual.
