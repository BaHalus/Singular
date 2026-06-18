import test from "node:test";
import assert from "node:assert/strict";

import {
  HIT_LOCATIONS,
  createEmptyProtectionMap,
  calculateProtection,
  extractDrBonuses,
} from "./ProtectionCalculator.js";

function armor(id, state, features = []) {
  return {
    id,
    state,
    features,
    children: [],
  };
}

test("creates empty protection map", () => {
  const protection = createEmptyProtectionMap();

  for (const location of HIT_LOCATIONS) {
    assert.equal(protection[location], 0);
  }
});

test("extracts DR bonuses from equipment item", () => {
  const item = armor("mail", "equipped", [
    {
      type: "dr_bonus",
      amount: 4,
      locations: ["torso"],
    },
  ]);

  const bonuses = extractDrBonuses(item);

  assert.deepEqual(bonuses, [
    {
      amount: 4,
      locations: ["torso"],
    },
  ]);
});

test("calculates torso DR from equipped armor", () => {
  const protection = calculateProtection({
    equipment: [
      armor("mail", "equipped", [
        {
          type: "dr_bonus",
          amount: 4,
          locations: ["torso"],
        },
      ]),
    ],
  });

  assert.equal(protection.torso, 4);
  assert.equal(protection.skull, 0);
});

test("sums DR from multiple equipped armor pieces", () => {
  const protection = calculateProtection({
    equipment: [
      armor("gambeson", "equipped", [
        {
          type: "dr_bonus",
          amount: 1,
          locations: ["torso"],
        },
      ]),
      armor("mail", "equipped", [
        {
          type: "dr_bonus",
          amount: 4,
          locations: ["torso"],
        },
      ]),
    ],
  });

  assert.equal(protection.torso, 5);
});

test("applies one DR feature to multiple locations", () => {
  const protection = calculateProtection({
    equipment: [
      armor("mail", "equipped", [
        {
          type: "dr_bonus",
          amount: 2,
          locations: ["rightArm", "leftArm"],
        },
      ]),
    ],
  });

  assert.equal(protection.rightArm, 2);
  assert.equal(protection.leftArm, 2);
  assert.equal(protection.torso, 0);
});

test("defaults DR location to torso", () => {
  const protection = calculateProtection({
    equipment: [
      armor("vest", "equipped", [
        {
          type: "dr_bonus",
          amount: 3,
        },
      ]),
    ],
  });

  assert.equal(protection.torso, 3);
});

test("ignores non-equipped armor", () => {
  const protection = calculateProtection({
    equipment: [
      armor("mail", "carried", [
        {
          type: "dr_bonus",
          amount: 4,
          locations: ["torso"],
        },
      ]),
    ],
  });

  assert.equal(protection.torso, 0);
});

test("finds equipped armor inside nested equipment", () => {
  const protection = calculateProtection({
    equipment: [
      {
        id: "container",
        state: "carried",
        features: [],
        children: [
          armor("helmet", "equipped", [
            {
              type: "dr_bonus",
              amount: 4,
              locations: ["skull"],
            },
          ]),
        ],
      },
    ],
  });

  assert.equal(protection.skull, 4);
});

test("ignores non-DR features", () => {
  const protection = calculateProtection({
    equipment: [
      armor("shield", "equipped", [
        {
          type: "db_bonus",
          amount: 2,
        },
      ]),
    ],
  });

  assert.equal(protection.torso, 0);
});

test("rejects invalid equipment input", () => {
  assert.throws(() => {
    calculateProtection({ equipment: "armor" });
  });
});

test("rejects invalid DR amount", () => {
  assert.throws(() => {
    calculateProtection({
      equipment: [
        armor("mail", "equipped", [
          {
            type: "dr_bonus",
            amount: "4",
            locations: ["torso"],
          },
        ]),
      ],
    });
  });
});

test("rejects invalid DR location", () => {
  assert.throws(() => {
    calculateProtection({
      equipment: [
        armor("mail", "equipped", [
          {
            type: "dr_bonus",
            amount: 4,
            locations: ["wing"],
          },
        ]),
      ],
    });
  });
});
