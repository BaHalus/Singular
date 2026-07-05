import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const CHECKLIST_PATH = "docs/alpha/V2_ALPHA_USABLE_GATE_MINIMAL.md";

test("Alpha usable gate checklist covers the agreed mobile/Mesa sequence", () => {
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const required of [
    "abrir `mobile.html`",
    "modo Criação",
    "editar e aplicar campos centrais de identidade",
    "salvar e relistar uma sessão",
    "alternar para modo Mesa",
    "transitórios de Mesa",
    "colapso/expansão de seções",
    "empty states",
    "ausência de editores estruturais em Mesa",
    "guardas de overflow de texto",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(required)));
  }
});

test("Alpha usable gate keeps UI authority and architecture boundaries explicit", () => {
  const checklist = readFileSync(CHECKLIST_PATH, "utf8");

  for (const forbidden of [
    "cálculo ou regra de domínio na UI",
    "mutação direta do personagem fora dos comandos existentes",
    "domínio paralelo",
    "sessão paralela",
    "executor paralelo",
    "registry paralelo",
    "persistence layer paralela",
    "pipeline paralelo",
    "composition root paralelo",
  ]) {
    assert.match(checklist, new RegExp(escapeRegExp(forbidden)));
  }

  assert.doesNotMatch(checklist, /data-action="save"/);
  assert.doesNotMatch(checklist, /createCharacter\s*\(/);
  assert.doesNotMatch(checklist, /CommandExecutor|CommandRegistry|ApplicationSession/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
