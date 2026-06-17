# Documentação da SINGULAR

Bem-vindo à documentação oficial da SINGULAR.

Este diretório reúne toda a documentação de arquitetura, governança e implementação da plataforma.

A documentação deve ser considerada parte integrante do projeto e evoluir juntamente com o código.

---

# Ordem Recomendada de Leitura

Para compreender completamente a arquitetura da SINGULAR, recomenda-se a seguinte ordem:

## Governança

1. MAN-1.0 — Manifesto
2. CON-2.0 — Constituição
3. GLO-1.0 — Glossário
4. OBJ-1.0 — Objetivos Arquiteturais
5. DES-1.0 — Princípios de Design

Após compreender os princípios do projeto, prossiga para os documentos arquiteturais.

---

## Arquitetura

6. DOM-2.0 — Modelo de Domínio
7. ARC-1.0 — Arquitetura
8. FLO-1.0 — Fluxo de Dados
9. CMD-1.0 — Commands
10. SCH-1.0 — Schemas
11. ENG-1.0 — Motores

---

## Implementação

12. Persistência
13. Biblioteca
14. Interface
15. Importação GCS
16. Temas
17. Testes

---

# Organização da Documentação

```
docs/
│
├── README.md
│
├── 00-governanca/
│   ├── Manifesto.md
│   ├── Constituicao.md
│   ├── Glossario.md
│   ├── ObjetivosArquiteturais.md
│   └── PrincipiosDeDesign.md
│
├── 01-arquitetura/
│   ├── ModeloDeDominio.md
│   ├── Arquitetura.md
│   ├── FluxoDeDados.md
│   ├── Commands.md
│   ├── Schemas.md
│   └── Engines.md
│
├── 02-decisoes/
│   ├── ADR/
│   └── RFC/
│
└── 03-implementacao/
```

---

# Códigos dos Documentos

| Código | Documento |
|---------|-----------|
| MAN | Manifesto |
| CON | Constituição |
| GLO | Glossário |
| OBJ | Objetivos Arquiteturais |
| DES | Princípios de Design |
| DOM | Modelo de Domínio |
| ARC | Arquitetura |
| FLO | Fluxo de Dados |
| CMD | Commands |
| SCH | Schemas |
| ENG | Motores |

---

# RFC

RFCs (Request for Comments) são utilizadas para propor novas funcionalidades ou alterações significativas antes da implementação.

Uma RFC deve ser discutida, aprovada e somente então implementada.

---

# ADR

ADRs (Architecture Decision Records) registram decisões arquiteturais permanentes.

Sempre que uma decisão importante substituir outra anteriormente adotada, uma ADR deverá ser criada.

As ADRs preservam o histórico de evolução da arquitetura.

---

# Atualização da Documentação

Toda alteração arquitetural relevante deverá ser acompanhada da atualização dos documentos correspondentes.

Documentação desatualizada é considerada um defeito do projeto.

---

# Filosofia

A documentação da SINGULAR não descreve apenas como o sistema funciona.

Ela explica por que ele foi projetado dessa maneira.

Sempre que possível, as decisões devem ser justificadas para facilitar a manutenção, a evolução e a compreensão futura do projeto.
