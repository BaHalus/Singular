# Changelog

Todas as mudanças relevantes da SINGULAR serão registradas neste arquivo.

## [Pesquisa Arquitetural] — 2026-07-27

### Alteração Metodológica

- Data da alteração: 2026-07-27.
- O executor dos agentes foi alterado de GitHub Copilot (GPT) para GitHub Copilot utilizando Gemini.
- A metodologia, os prompts, o backlog e os templates permaneceram inalterados.
- O objetivo da alteração é validar que a metodologia de pesquisa arquitetural da SINGULAR é independente do modelo de IA utilizado.

## [0.9.0-alpha.1] — 2026-07-11

Primeira baseline Alpha mobile utilizável.

### Incluído

- fluxo mobile executável em `mobile.html`;
- criação e edição de identidade, atributos, secundários e transitórios;
- vantagens, desvantagens, idiomas, culturas, perícias e técnicas;
- ataques, magias, poderes, equipamentos e carga disponíveis no escopo Alpha;
- modos Criação e Mesa, com bloqueio de controles estruturais no modo Mesa;
- persistência local, autosave, salvamento manual, restauração, exportação e importação;
- testes de regressão de arquitetura, persistência e fluxo mobile real;
- composition root mobile único, sem pipeline paralelo.

### Limitações conhecidas

Consulte `docs/releases/0.9.0-alpha.1-known-limitations.md`.

### Compatibilidade

- Node.js 22.x para desenvolvimento e testes;
- navegador moderno com suporte a módulos ES;
- a instalação PWA e a publicação pública ainda não fazem parte desta versão.
