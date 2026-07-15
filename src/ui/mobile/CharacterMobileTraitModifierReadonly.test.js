import test from "node:test";
import assert from "node:assert/strict";

import { injectMobileTraitEditControls } from "./CharacterMobileTraitEditApp.js";

const shell = '<main><section class="singular-mobile-sheet__card" data-card="traits"><h2>Traços</h2><p>old</p></section></main>';

function character() {
  return {
    traits: [{
      id: "trait-flight",
      name: "Voo <Alado>",
      role: "advantage",
      pointValue: { basePoints: 40 },
      modifiers: [
        {
          id: "enhanced-speed",
          name: "Velocidade & Controle",
          kind: "enhancement",
          valueType: "percentage",
          value: 20,
          source: null,
          notes: "",
        },
        {
          id: "winged",
          name: "Alado",
          kind: "limitation",
          valueType: "percentage",
          value: 25,
          source: null,
          notes: "",
        },
      ],
    }],
  };
}

test("shows canonical modifiers, base/final costs and breakdown in creation mode", () => {
  const rendered = injectMobileTraitEditControls(shell, character(), "creation");

  assert.match(rendered, /data-role="trait-cost-breakdown" data-status="ready"/);
  assert.match(rendered, /Custo base<\/dt><dd>40 pts/);
  assert.match(rendered, /Custo final<\/dt><dd>38 pts/);
  assert.match(rendered, /Modificador líquido<\/dt><dd>-5%/);
  assert.match(rendered, /Ampliações<\/dt><dd>\+20%/);
  assert.match(rendered, /Limitações declaradas<\/dt><dd>-25%/);
  assert.match(rendered, /Velocidade &amp; Controle/);
  assert.match(rendered, /data-modifier-id="winged"/);
  assert.match(rendered, /data-role="trait-inline-editor"/);
});

test("keeps the same calculated read model visible and structural controls absent in table mode", () => {
  const rendered = injectMobileTraitEditControls(shell, character(), "table");

  assert.match(rendered, /data-role="trait-cost-breakdown" data-status="ready"/);
  assert.match(rendered, /Custo final<\/dt><dd>38 pts/);
  assert.match(rendered, /Detalhes do cálculo/);
  assert.doesNotMatch(rendered, /data-role="trait-editor"/);
  assert.doesNotMatch(rendered, /data-role="trait-inline-editor"/);
  assert.doesNotMatch(rendered, /data-action="trait-(?:add|update|remove|reorder)"/);
  assert.doesNotMatch(rendered, /data-action="modifier-/);
});

test("surfaces unsupported modifier calculations without inventing a total", () => {
  const rendered = injectMobileTraitEditControls(shell, {
    traits: [{
      id: "trait-opaque",
      name: "Importado",
      role: "advantage",
      points: 10,
      modifiers: [{ id: "opaque", name: "Varia", cost_adj: "varies" }],
    }],
  }, "table");

  assert.match(rendered, /data-status="unsupported"/);
  assert.match(rendered, /Custo canônico indisponível: regra não suportada/);
  assert.match(rendered, /Não suportado/);
  assert.doesNotMatch(rendered, /Custo final<\/dt>/);
});

test("shows final-stage rounding that explains the canonical final cost", () => {
  const rendered = injectMobileTraitEditControls(shell, {
    traits: [{
      id: "trait-rounded",
      name: "Arredondado",
      role: "advantage",
      pointValue: { basePoints: 5 },
      modifiers: [{
        id: "small-enhancement",
        name: "Pequena ampliação",
        kind: "enhancement",
        valueType: "percentage",
        value: 10,
        source: null,
        notes: "",
      }],
    }],
  }, "table");

  assert.match(rendered, /Custo final<\/dt><dd>6 pts/);
  assert.match(rendered, /Antes do arredondamento<\/dt><dd>5\.5 pts/);
  assert.match(rendered, /Arredondamento<\/dt><dd>5\.5 → 6/);
  assert.doesNotMatch(rendered, /Arredondamento<\/dt><dd>não aplicado/);
});

test("renders imported multipliers with multiplier units instead of points", () => {
  const rendered = injectMobileTraitEditControls(shell, {
    traits: [{
      id: "trait-multiplied",
      name: "Multiplicado",
      role: "advantage",
      pointValue: { basePoints: 10 },
      modifiers: [
        { id: "double", name: "Dobro", cost_adj: "x2" },
        { id: "quarter", name: "Quarto", cost_adj: "/4" },
      ],
    }],
  }, "table");

  assert.match(rendered, /data-modifier-id="double"[^]*<strong>x2<\/strong>/);
  assert.match(rendered, /data-modifier-id="quarter"[^]*<strong>\/4<\/strong>/);
  assert.doesNotMatch(rendered, /(?:\+2|\+0\.25) pts/);
});

test("provides mobile overflow guards for modifier names and breakdown values", async () => {
  const css = await import("node:fs/promises").then(fs => fs.readFile(
    new URL("./CharacterMobileTraitEditApp.css", import.meta.url),
    "utf8",
  ));

  assert.match(css, /\.singular-mobile-sheet__trait-cost[\s\S]*overflow-wrap: anywhere/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) auto/);
});
