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
      diagnostics: [],
    });
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
          points: 1,
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
      diagnostics: [],
    });
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
