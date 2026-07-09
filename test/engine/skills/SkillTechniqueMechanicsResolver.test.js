import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  resolveSkillTechniqueMechanics,
  serializeSkillTechniqueMechanicsReport,
} from "../../../src/engine/skills/SkillTechniqueMechanicsResolver.js";

describe("resolveSkillTechniqueMechanics", () => {
  it("resolves skill level and relative level from canonical engine inputs", () => {
    const report = resolveSkillTechniqueMechanics({
      attributes: {
        IQ: { level: 10 },
      },
      skills: [
        {
          id: "skill-navigation",
          name: "Navegacao",
          specialization: "Costeira",
          attribute: "IQ",
          difficulty: "A",
          points: 2,
        },
      ],
    });

    assert.deepEqual(serializeSkillTechniqueMechanicsReport(report).skills[0], {
      id: "skill-navigation",
      kind: "skill",
      status: "resolved",
      level: 10,
      relativeLevel: 0,
      base: "IQ",
      source: "calculated",
      importedLevel: null,
      importedRelativeLevel: null,
      diagnostics: [],
    });
  });

  it("advances trained skills linearly after the four point threshold", () => {
    const report = resolveSkillTechniqueMechanics({
      attributes: {
        IQ: { level: 10 },
      },
      skills: [
        {
          id: "skill-navigation",
          name: "Navegacao",
          specialization: "Costeira",
          attribute: "IQ",
          difficulty: "A",
          points: 12,
        },
      ],
    });

    assert.equal(report.skills[0].level, 13);
    assert.equal(report.skills[0].relativeLevel, 3);
  });

  it("resolves technique level from its resolved base skill", () => {
    const report = resolveSkillTechniqueMechanics({
      attributes: {
        IQ: { level: 10 },
      },
      skills: [
        {
          id: "skill-navigation",
          name: "Navegacao",
          specialization: "Costeira",
          attribute: "IQ",
          difficulty: "A",
          points: 2,
        },
      ],
      techniques: [
        {
          id: "tech-safe-route",
          name: "Rota Segura",
          skillName: "Navegacao",
          skillSpecialization: "Costeira",
          difficulty: "H",
          points: 2,
          defaultPenalty: -2,
          maximumRelativeLevel: 0,
        },
      ],
    });

    assert.deepEqual(serializeSkillTechniqueMechanicsReport(report).techniques[0], {
      id: "tech-safe-route",
      kind: "technique",
      status: "resolved",
      level: 9,
      relativeLevel: -1,
      base: "skill-navigation",
      source: "calculated",
      importedLevel: null,
      importedRelativeLevel: null,
      diagnostics: [],
    });
  });

  it("resolves zero point techniques at their default and blocks invalid hard one point technique investment", () => {
    const report = resolveSkillTechniqueMechanics({
      attributes: {
        DX: { level: 12 },
      },
      skills: [
        {
          id: "skill-sword",
          name: "Espada Curta",
          attribute: "DX",
          difficulty: "A",
          points: 4,
        },
      ],
      techniques: [
        {
          id: "tech-average-default",
          name: "Manobra Média",
          skillId: "skill-sword",
          difficulty: "A",
          points: 0,
          defaultPenalty: -2,
          maximumRelativeLevel: 0,
        },
        {
          id: "tech-average-trained",
          name: "Manobra Média Treinada",
          skillId: "skill-sword",
          difficulty: "A",
          points: 2,
          defaultPenalty: -2,
          maximumRelativeLevel: 0,
        },
        {
          id: "tech-hard-invalid",
          name: "Manobra Difícil Inválida",
          skillId: "skill-sword",
          difficulty: "H",
          points: 1,
          defaultPenalty: -2,
          maximumRelativeLevel: 0,
        },
      ],
    });

    assert.equal(report.techniques[0].status, "resolved");
    assert.equal(report.techniques[0].level, 11);
    assert.equal(report.techniques[0].relativeLevel, -2);
    assert.equal(report.techniques[1].status, "resolved");
    assert.equal(report.techniques[1].level, 13);
    assert.equal(report.techniques[1].relativeLevel, 0);
    assert.equal(report.techniques[2].status, "blocked");
    assert.deepEqual(report.techniques[2].diagnostics, ["missing-technique-point-investment"]);
  });

  it("keeps imported levels as diagnostics instead of replacing calculated mechanics", () => {
    const report = resolveSkillTechniqueMechanics({
      attributes: {
        IQ: { level: 10 },
      },
      skills: [
        {
          id: "skill-imported",
          name: "Navegacao",
          specialization: "Costeira",
          attribute: "IQ",
          difficulty: "A",
          points: 12,
          importedLevel: 10,
          importedRelativeLevel: 0,
        },
      ],
    });

    assert.equal(report.skills[0].source, "calculated");
    assert.equal(report.skills[0].level, 13);
    assert.equal(report.skills[0].relativeLevel, 3);
    assert.equal(report.skills[0].importedLevel, 10);
    assert.equal(report.skills[0].importedRelativeLevel, 0);
    assert.deepEqual(report.skills[0].diagnostics, [
      "imported-skill-level-differs",
      "imported-skill-relative-level-differs",
    ]);
  });

  it("keeps blocked diagnostics explicit instead of fabricating a level", () => {
    const report = resolveSkillTechniqueMechanics({
      skills: [
        {
          id: "skill-incomplete",
          name: "Pericia sem base",
          attribute: null,
          difficulty: "A",
          points: 2,
        },
      ],
    });

    assert.equal(report.skills[0].status, "blocked");
    assert.deepEqual(report.skills[0].diagnostics, [
      "missing-skill-attribute",
      "missing-skill-base-level",
    ]);
  });
});
