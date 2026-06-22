# GATE-APP-CORE-1.0 — Fundação da camada de aplicação

**Status:** Candidato a fechamento  
**Data:** 2026-06-22  
**ADR:** ADR-0042

## Objetivo do gate

Certificar que a SINGULAR possui uma camada de aplicação única para sessão, comandos, histórico, persistência e leitura, sem mover regras GURPS para a UI e sem reabrir domínios fechados.

## Autoridades certificadas

### Sessão

```text
src/application/session/ApplicationSession.js
```

Autoridade única do estado de aplicação aberto:

```text
id
revision
character
history
future
dirty
lastReceipt
metadata
```

### Comandos

```text
src/application/commands/CommandEnvelope.js
src/application/commands/CommandRegistry.js
src/application/commands/CommandExecutor.js
```

O executor:

- valida envelope e revisão;
- resolve um único handler;
- aceita somente `applied` ou `no-op` do handler;
- valida o `Character` retornado;
- registra uma transição por aplicação;
- preserva a sessão em rejeições e falhas.

### Histórico

```text
src/application/history/ApplicationHistory.js
src/application/history/ApplicationHistoryOperations.js
```

Cada transição preserva snapshots completos, fingerprints, comando e recibo. Desfazer/refazer restaura snapshots validados e mantém revisão monotônica.

### Portas e infraestrutura

```text
src/application/ports/RepositoryPorts.js
src/application/ports/RuntimePorts.js
src/application/persistence/InMemoryCharacterRepository.js
src/application/persistence/InMemorySessionRepository.js
src/infrastructure/runtime/FixedClock.js
src/infrastructure/runtime/SequentialIdGenerator.js
```

A aplicação não depende diretamente de navegador, arquivo, rede, relógio global ou gerador global de IDs.

### Leitura

```text
src/application/projections/ApplicationReadModel.js
```

A projeção reúne o `Character`, estado da sessão e Point Ledger soberano. Nenhuma regra de jogo é calculada na projeção.

## Fluxos certificados

### Comando aplicado

```text
intenção
→ envelope
→ expectedRevision
→ handler
→ Character validado
→ nova revisão
→ transição
→ recibo
```

### Rejeição e falha

```text
comando inválido / revisão obsoleta / handler ausente / exceção
→ sessão original preservada
→ nenhum histórico novo
```

### Desfazer/refazer

```text
snapshot atual
→ mover transição entre history/future
→ restaurar snapshot validado
→ incrementar revisão
→ recibo
```

### Persistência e leitura

```text
sessão
→ snapshot serializado
→ repositório
→ hidratação validada
→ ApplicationReadModel
→ Point Ledger soberano
```

## Evidências de teste

Cobertura específica:

- criação, serialização e imutabilidade da sessão;
- registro e resolução de comandos;
- envelopes inválidos e cíclicos;
- revisão obsoleta;
- execução aplicada, `no-op`, rejeitada e falha;
- histórico com fingerprints;
- múltiplos desfazer/refazer;
- invalidação do refazer por edição nova;
- portas de persistência;
- adaptadores em memória;
- relógio e IDs determinísticos;
- projeção composta;
- fluxo vertical completo;
- integração com Point Ledger;
- save/load entre aplicação, undo e redo.

A suíte integral deve estar verde no head final da PR.

## Regressões proibidas

Este gate bloqueia:

- mutação direta do `Character` pela UI;
- segundo despachante de comandos;
- segundo histórico da sessão;
- redução da revisão ao desfazer;
- reexecução de regras para reconstruir histórico;
- dependência direta de `localStorage` na aplicação;
- uso direto de relógio ou UUID global nos casos de uso;
- projeção recalculando pontos;
- duplicação do Point Ledger;
- reabertura implícita de Traits, Templates, Morfose ou Forma Alternativa.

## Itens deliberadamente posteriores

APP-CORE-1.0 não inclui:

- componentes visuais;
- adaptador concreto de navegador;
- fluxo completo dos modos Criação e Mesa;
- catálogo completo de handlers dos domínios futuros;
- DOM-SKILL;
- DOM-EQUIPMENT;
- DOM-COMBAT;
- DOM-POWER;
- DOM-MAGIC.

## Critério de aprovação

O gate será aprovado quando:

- a PR estiver pronta para revisão;
- a suíte integral estiver verde no head documental;
- não houver thread bloqueante;
- nenhum workflow temporário estiver no diff;
- o merge estiver confirmado na `main`.

## Próxima frente

Após o fechamento formal do APP-CORE-1.0, o roadmap segue para:

```text
DOM-SKILL
```
