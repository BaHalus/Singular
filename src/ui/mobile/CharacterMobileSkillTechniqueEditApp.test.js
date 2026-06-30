import test from "node:test";
import assert from "node:assert/strict";

import {
  injectMobileSkillTechniqueEditControls,
} from "./CharacterMobileSkillTechniqueEditApp.js";

function character() {
  return {
    skills: [
      {
        id: "skill:stealth",
        name: "Furtividade",
        specialization: "Urbana",
        techLevel: null,
        attribute: "DX",
        difficulty: "A",
        points: 2,
        notes: "mover-se sem chamar atenção",
        tags: ["mesa", "alpha"],
      },
    ],
    techniques: [
      {
        id: "technique:arm-lock",
        name: "Chave de Braço",
        specialization: "Judô",
        skillId: "skill:judo",
        skillName: "Judô",
        skillSpecialization: "",
        difficulty: "H",
        points: 3,
        defaultPenalty: -2,
        maximumRelativeLevel: 0,
        notes: "usar apenas em Criação",
        tags: ["combate"],
      },
    ],
  };
}

const html = '<section data-card="skills-techniques"><h2>Perícias e Técnicas</h2><p>conteúdo antigo</p></section>';

test("injects mobile skill and technique inline controls in creation mode", () => {
  const creation = injectMobileSkillTechniqueEditControls(html, character(), "creation");

  assert.match(creation, /data-role="skill-editor"/);
  assert.match(creation, /data-action="skill-add"/);
  assert.match(creation, /data-skill-id="skill:stealth"/);
  assert.match(creation, /data-role="skill-inline-editor"/);
  assert.match(creation, /data-action="skill-update"/);
  assert.match(creation, /data-role="skill-edit-name-skill:stealth"/);
  assert.match(creation, /mover-se sem chamar atenção/);
  assert.match(creation, /mesa, alpha/);

  assert.match(creation, /data-role="technique-editor"/);
  assert.match(creation, /data-action="technique-add"/);
  assert.match(creation, /data-technique-id="technique:arm-lock"/);
  assert.match(creation, /data-role="technique-inline-editor"/);
  assert.match(creation, /data-action="technique-update"/);
  assert.match(creation, /data-role="technique-edit-default-penalty-technique:arm-lock"/);
  assert.match(creation, /usar apenas em Criação/);
  assert.match(creation, /combate/);
});

test("keeps skill and technique structural edit controls out of table mode", () => {
  const table = injectMobileSkillTechniqueEditControls(html, character(), "table");

  assert.doesNotMatch(table, /data-role="skill-editor"/);
  assert.doesNotMatch(table, /data-role="skill-inline-editor"/);
  assert.doesNotMatch(table, /data-action="skill-add"/);
  assert.doesNotMatch(table, /data-action="skill-update"/);
  assert.doesNotMatch(table, /data-role="technique-editor"/);
  assert.doesNotMatch(table, /data-role="technique-inline-editor"/);
  assert.doesNotMatch(table, /data-action="technique-add"/);
  assert.doesNotMatch(table, /data-action="technique-update"/);
  assert.match(table, /Furtividade/);
  assert.match(table, /Chave de Braço/);
});
