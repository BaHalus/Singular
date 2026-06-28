# Alpha Release Checklist — aplicação/domínio

## Status

Pré-release checklist.

## Escopo validado

- Catálogo Alpha canônico: `AlphaCommandCatalog`.
- Registro canônico: `CommandRegistry`.
- Execução canônica: `executeCommand`.
- Sessão canônica: `ApplicationSession`.
- Histórico e futuro de sessão preservados por snapshots.
- Projeções consumíveis pela UI mobile observadas sem redefinir autoridade.
- Snapshots de `ApplicationSession` e `Character` reidratáveis.
- Superfície mínima de erro validada.

## Gates já aceitos

- `GATE-ALPHA-EDITING-CONTRACTS`.
- `GATE-ALPHA-APPLICATION-CONTRACTS`.
- `GATE-ALPHA-APPLICATION-HARDENING`.
- `APP-ALPHA-SMOKE-MATRIX-1.0`.
- `APP-ALPHA-READMODEL-CONSISTENCY-1.0`.
- `APP-ALPHA-SAVE-SNAPSHOT-INTEGRITY-1.0`.
- `APP-ALPHA-ERROR-SURFACE-1.0`.

## Comandos esperados na Alpha

- Identidade e resumo do personagem.
- Atributos e pools atuais.
- Traits.
- Skills e Techniques.
- Languages e Familiarities.
- Secondary.
- Notes.
- Attacks.
- Equipment.
- Spells.
- Powers.

## Evidências de teste

- Matrizes de payload inválido.
- Matrizes de undo/redo.
- Roundtrip JSON.
- No-op e atomicidade.
- Fronteira de corrupção.
- Smoke de catálogo/registry/executor/session.
- Consistência de read model consumível.
- Integridade de snapshots.
- Superfície de erro.

## Não-goals pré-Alpha

- Catálogo oficial completo.
- Importador amplo.
- Biblioteca visual.
- Temas e polimento visual.
- Cropper, impressão perfeita ou nuvem.
- Combate completo.
- Drag-and-drop amplo.
- Cálculo GURPS na aplicação ou UI.

## Lacunas restantes para a frente mobile

- Continuar integração visual e interação por família sem alterar autoridade da aplicação.
- Consumir snapshots e projections já validados.
- Preservar modo Criação/Mesa.
- Não recalcular regras de GURPS na UI.

## Evidência esperada

```bash
npm test
```
