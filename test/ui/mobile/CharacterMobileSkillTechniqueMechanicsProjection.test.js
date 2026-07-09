import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../../src/domain/character/Character.js";
import { mountCharacterMobileSkillTechniqueMechanicsProjection } from "../../../src/ui/mobile/CharacterMobileSkillTechniqueMechanicsProjection.js";

describe("mountCharacterMobileSkillTechniqueMechanicsProjection", () => {
  it("projects canonical engine mechanics into existing mobile skill and technique rows", () => {
    let enhancer = null;
    const skillContainer = createContainer();
    const techniqueContainer = createContainer();
    const root = createRoot([
      createItem("data-skill-id", "skill-navigation", skillContainer),
      createItem("data-technique-id", "tech-safe-route", techniqueContainer),
    ]);
    const character = createCharacter({
      attributes: { IQ: { base: 10, override: null } },
      skills: [{
        id: "skill-navigation",
        name: "Navegacao",
        specialization: "Costeira",
        attribute: "IQ",
        difficulty: "A",
        points: 2,
      }],
      techniques: [{
        id: "tech-safe-route",
        name: "Rota Segura",
        skillName: "Navegacao",
        skillSpecialization: "Costeira",
        difficulty: "H",
        points: 2,
        defaultPenalty: -2,
        maximumRelativeLevel: 0,
      }],
    });

    const mounted = mountCharacterMobileSkillTechniqueMechanicsProjection({
      postRenderLifecycle: {
        register(nextEnhancer) {
          enhancer = nextEnhancer;
          return () => { enhancer = null; };
        },
      },
    });

    enhancer({ root, character });

    assert.equal(skillContainer.children[0].dataset.authority, "engine.skills-techniques");
    assert.equal(skillContainer.children[0].dataset.status, "resolved");
    assert.equal(skillContainer.children[0].textContent, "NH 10 · rel. 0 · base IQ");
    assert.equal(techniqueContainer.children[0].textContent, "NH 9 · rel. -1 · base skill-navigation");

    mounted.skillTechniqueMechanicsProjection.destroy();
    assert.equal(enhancer, null);
  });
});

function createRoot(items) {
  return {
    querySelectorAll(selector) {
      const attribute = selector.slice(1, -1);
      return items.filter(item => item.attribute === attribute);
    },
  };
}

function createItem(attribute, id, container) {
  return {
    attribute,
    getAttribute(name) {
      return name === attribute ? id : null;
    },
    querySelector(selector) {
      return selector === "dd" ? container : null;
    },
  };
}

function createContainer() {
  return {
    children: [],
    ownerDocument: {
      createElement() {
        return { dataset: {}, textContent: "" };
      },
    },
    querySelector() {
      return null;
    },
    append(...nodes) {
      this.children.push(...nodes.filter(node => typeof node !== "string"));
    },
  };
}
