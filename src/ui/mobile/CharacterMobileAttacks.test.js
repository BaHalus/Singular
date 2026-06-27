import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  projectCharacterForMobileSheet,
  serializeCharacterMobileProjection,
} from "./CharacterMobileProjection.js";
import {
  createCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";
import {
  renderCharacterMobileSheetHtml,
} from "./CharacterMobileSheetHtml.js";

function createAttackingCharacter() {
  return createCharacter({
    identity: {
      id: "character-mobile-attacks",
      name: "Ayla",
    },
    attacks: [
      {
        id: "attack_sword",
        name: "Espada Curta",
        category: "melee",
        skillId: "skill_sword",
        source: {
          kind: "equipment",
          id: "eq_sword",
        },
        damage: {
          value: "1d+2",
          type: "corte",
        },
        reach: "C,1",
        notes: "Ataque principal",
      },
      {
        id: "attack_bow",
        name: "Arco Curto",
        category: "ranged",
        skillId: "skill_bow",
        source: {
          kind: "equipment",
          id: "eq_bow",
        },
        damage: {
          value: "1d",
          type: "perfuração",
        },
        range: "150/200",
        notes: "Requer flecha",
      },
    ],
  });
}

test("projects declared attacks through the application AttackReadProjection", () => {
  const projection = projectCharacterForMobileSheet(createAttackingCharacter());

  assert.equal(projection.schemaVersion, 5);
  assert.equal(projection.attacks.characterId, "character-mobile-attacks");
  assert.equal(
    projection.attacks.authority,
    "application.attack-read-projection",
  );
  assert.deepEqual(
    projection.attacks.items.map(attack => ({
      id: attack.id,
      category: attack.category,
      damageAuthority: attack.damage.authority,
      sourceKind: attack.source.kind,
    })),
    [
      {
        id: "attack_sword",
        category: "melee",
        damageAuthority: "declared",
        sourceKind: "equipment",
      },
      {
        id: "attack_bow",
        category: "ranged",
        damageAuthority: "declared",
        sourceKind: "equipment",
      },
    ],
  );
  assert.equal(
    projection.sections.find(section => section.id === "attacks").status,
    "declared-only",
  );
  assert.equal(Object.isFrozen(projection.attacks), true);
  assert.equal(Object.isFrozen(projection.attacks.items[0].damage), true);
});

test("creates a mobile attacks card without resolving skills or damage", () => {
  const projection = projectCharacterForMobileSheet(createAttackingCharacter());
  const model = createCharacterMobileSheetRenderModel(projection);
  const card = model.cards.find(candidate => candidate.id === "attacks");

  assert.equal(model.schemaVersion, 5);
  assert.equal(card.status, "declared-only");
  assert.equal(card.authority, "application.attack-read-projection");
  assert.deepEqual(
    card.items.map(item => ({
      id: item.id,
      label: item.label,
      skillId: item.skillId,
      damageValue: item.damageValue,
      damageType: item.damageType,
      damageAuthority: item.damageAuthority,
      reach: item.reach,
      range: item.range,
    })),
    [
      {
        id: "attack_sword",
        label: "Corpo a corpo",
        skillId: "skill_sword",
        damageValue: "1d+2",
        damageType: "corte",
        damageAuthority: "declared",
        reach: "C,1",
        range: null,
      },
      {
        id: "attack_bow",
        label: "À distância",
        skillId: "skill_bow",
        damageValue: "1d",
        damageType: "perfuração",
        damageAuthority: "declared",
        reach: null,
        range: "150/200",
      },
    ],
  );
});

test("renders attack provenance and declared values in the mobile HTML", () => {
  const html = renderCharacterMobileSheetHtml(
    createCharacterMobileSheetRenderModel(
      projectCharacterForMobileSheet(createAttackingCharacter()),
    ),
    { mode: "table" },
  );

  assert.match(html, /data-schema-version="10"/);
  assert.match(html, /data-card="attacks" data-status="declared-only"/);
  assert.match(
    html,
    /data-attack-id="attack_sword" data-attack-category="melee" data-damage-authority="declared"/,
  );
  assert.match(html, /Corpo a corpo<\/dt><dd>Espada Curta/);
  assert.match(html, /Dano declarado 1d\+2 corte/);
  assert.match(html, /Reach C,1/);
  assert.match(html, /Perícia skill_sword/);
  assert.match(html, /Origem equipamento eq_sword/);
  assert.match(html, /À distância<\/dt><dd>Arco Curto/);
  assert.match(html, /Dano declarado 1d perfuração/);
  assert.match(html, /Alcance 150\/200/);
});

test("keeps the empty attacks section explicit", () => {
  const projection = projectCharacterForMobileSheet(createCharacter({
    identity: {
      id: "character-mobile-no-attacks",
      name: "Sem Ataques",
    },
  }));
  const model = createCharacterMobileSheetRenderModel(projection);
  const html = renderCharacterMobileSheetHtml(model, { mode: "table" });

  assert.deepEqual(projection.attacks.items, []);
  assert.equal(
    projection.sections.find(section => section.id === "attacks").status,
    "empty",
  );
  assert.equal(
    model.cards.find(card => card.id === "attacks").status,
    "empty",
  );
  assert.match(html, /data-section="attacks" data-status="empty"/);
  assert.match(html, /Nenhum ataque declarado/);
});

test("rejects attack projections belonging to another Character", () => {
  const projection = serializeCharacterMobileProjection(
    projectCharacterForMobileSheet(createAttackingCharacter()),
  );
  projection.attacks.characterId = "another-character";

  assert.throws(
    () => serializeCharacterMobileProjection(projection),
    /Mobile attacks projection belongs to another Character/,
  );
});
