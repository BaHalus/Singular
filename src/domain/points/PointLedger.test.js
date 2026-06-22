import test from "node:test";
import assert from "node:assert/strict";

import {
  createPointBudget,
  evaluatePointBudget,
  serializePointBudget,
} from "./PointBudget.js";
import { createPointContribution } from "./PointContribution.js";
import { createPointDiscrepancy } from "./PointDiscrepancy.js";
import { createPointDomainReport } from "./PointDomainReport.js";
import {
  createPointLedger,
  serializePointLedger,
  validatePointLedger,
} from "./PointLedger.js";

const CHARACTER_ID = "character-ledger";

function contribution({
  id,
  domain,
  category,
  points,
  status = "ready",
  importedPoints = null,
} = {}) {
  return {
    id,
    characterId: CHARACTER_ID,
    domain,
    category,
    sourceId: id,
    sourceType: `${domain}-authority`,
    status,
    points: status === "ready" ? points : null,
    authorityFingerprint: status === "ready" ? `fingerprint:${id}` : null,
    importedPoints,
  };
}

function report({
  domain,
  categories,
  contributions = [],
  status,
  required = true,
} = {}) {
  return {
    characterId: CHARACTER_ID,
    domain,
    categories,
    contributions,
    status,
    required,
    sourceFingerprint: `source:${domain}`,
  };
}

test("reconciles declared and imported budgets without hiding divergence", () => {
  const declared = evaluatePointBudget(createPointBudget({
    declaredPoints: 250,
  }), 225);
  const reconciled = evaluatePointBudget(createPointBudget({
    declaredPoints: 250,
    importedPoints: 250,
    importedUnspentPoints: 25,
  }), 225);
  const divergent = evaluatePointBudget(createPointBudget({
    declaredPoints: 250,
    importedPoints: 275,
  }), 225);

  assert.equal(declared.status, "declared-only");
  assert.equal(declared.effectivePoints, 250);
  assert.equal(declared.calculatedUnspentPoints, 25);
  assert.equal(reconciled.status, "reconciled");
  assert.equal(reconciled.importedUnspentDifference, 0);
  assert.equal(divergent.status, "divergent");
  assert.equal(divergent.effectivePoints, null);
  assert.equal(divergent.calculatedUnspentPoints, null);
});

test("preserves budget provenance and detached serialization", () => {
  const budget = createPointBudget({
    importedPoints: 150,
    source: {
      kind: "imported",
      provider: "gcs",
      format: "gcs",
      reference: "campaign-a",
      version: 5,
    },
    importMeta: { path: "total_points" },
    raw: { total_points: 150 },
  });
  const serialized = serializePointBudget(budget);

  assert.equal(Object.isFrozen(budget), true);
  assert.deepEqual(serialized, budget);
  assert.notEqual(serialized, budget);
  assert.notEqual(serialized.source, budget.source);
});

test("enforces ready and pending contribution authority", () => {
  const ready = createPointContribution(contribution({
    id: "trait-a",
    domain: "trait",
    category: "advantages",
    points: 15,
  }));
  const pending = createPointContribution(contribution({
    id: "skill-a",
    domain: "skill",
    category: "skills",
    status: "pending",
  }));

  assert.equal(ready.points, 15);
  assert.equal(pending.points, null);
  assert.throws(
    () => createPointContribution({
      ...contribution({
        id: "invalid",
        domain: "trait",
        category: "advantages",
        points: 10,
      }),
      authorityFingerprint: null,
    }),
    /requires authorityFingerprint/,
  );
});

test("domain reports expose known and complete totals separately", () => {
  const partial = createPointDomainReport(report({
    domain: "skill",
    categories: ["skills"],
    contributions: [
      contribution({
        id: "skill-ready",
        domain: "skill",
        category: "skills",
        points: 4,
      }),
      contribution({
        id: "skill-pending",
        domain: "skill",
        category: "skills",
        status: "pending",
      }),
    ],
  }));
  const excluded = createPointDomainReport(report({
    domain: "template",
    categories: ["templates"],
    status: "excluded",
    required: false,
  }));

  assert.equal(partial.status, "partial");
  assert.equal(partial.knownPoints, 4);
  assert.equal(partial.totalPoints, null);
  assert.equal(excluded.status, "excluded");
  assert.equal(excluded.totalPoints, 0);
});

test("aggregates authorized contributions by domain and category", () => {
  const ledger = createPointLedger({
    characterId: CHARACTER_ID,
    pointBudget: {
      declaredPoints: 100,
      importedPoints: 100,
      importedUnspentPoints: 96,
    },
    domainReports: [
      report({
        domain: "trait",
        categories: ["advantages", "disadvantages"],
        contributions: [
          contribution({
            id: "advantage-a",
            domain: "trait",
            category: "advantages",
            points: 15,
          }),
          contribution({
            id: "disadvantage-a",
            domain: "trait",
            category: "disadvantages",
            points: -11,
          }),
        ],
      }),
      report({
        domain: "template",
        categories: ["templates"],
        status: "excluded",
        required: false,
      }),
    ],
  });

  assert.equal(ledger.status, "ready");
  assert.equal(ledger.complete, true);
  assert.equal(ledger.totals.knownSpentPoints, 4);
  assert.equal(ledger.totals.totalSpentPoints, 4);
  assert.equal(ledger.budget.calculatedUnspentPoints, 96);
  assert.equal(
    ledger.totals.byCategory.find(item => item.category === "advantages").totalPoints,
    15,
  );
  assert.equal(
    ledger.totals.byCategory.find(item => item.category === "disadvantages").totalPoints,
    -11,
  );
  assert.equal(
    ledger.discrepancies.find(item => item.id === "budget:unspent").status,
    "reconciled",
  );
});

test("keeps known spending while refusing an incomplete total", () => {
  const ledger = createPointLedger({
    characterId: CHARACTER_ID,
    pointBudget: { declaredPoints: 100 },
    domainReports: [
      report({
        domain: "trait",
        categories: ["advantages"],
        contributions: [contribution({
          id: "trait-known",
          domain: "trait",
          category: "advantages",
          points: 10,
        })],
      }),
      report({
        domain: "attribute",
        categories: ["attributes"],
        status: "pending",
      }),
    ],
  });

  assert.equal(ledger.status, "partial");
  assert.equal(ledger.spendingComplete, false);
  assert.equal(ledger.totals.knownSpentPoints, 10);
  assert.equal(ledger.totals.totalSpentPoints, null);
  assert.equal(ledger.budget.calculatedUnspentPoints, null);
  assert.equal(
    ledger.totals.byCategory.find(item => item.category === "attributes").totalPoints,
    null,
  );
});

test("blocks unsupported required domains and surfaces budget conflict", () => {
  const blocked = createPointLedger({
    characterId: CHARACTER_ID,
    pointBudget: { declaredPoints: 100 },
    domainReports: [report({
      domain: "power",
      categories: ["powers"],
      status: "unsupported",
    })],
  });
  const conflict = createPointLedger({
    characterId: CHARACTER_ID,
    pointBudget: {
      declaredPoints: 100,
      importedPoints: 120,
    },
    domainReports: [],
  });

  assert.equal(blocked.status, "blocked");
  assert.equal(conflict.status, "conflict");
  assert.equal(conflict.totals.totalSpentPoints, 0);
  assert.equal(conflict.budget.effectivePoints, null);
});

test("preserves external discrepancy records without changing spending", () => {
  const discrepancy = createPointDiscrepancy({
    id: "trait:import-difference",
    characterId: CHARACTER_ID,
    domain: "trait",
    sourceId: "trait-a",
    kind: "imported-vs-calculated",
    importedPoints: 10,
    calculatedPoints: 2,
  });
  const ledger = createPointLedger({
    characterId: CHARACTER_ID,
    pointBudget: { declaredPoints: 10 },
    domainReports: [],
    discrepancies: [discrepancy],
  });

  assert.equal(ledger.status, "ready");
  assert.equal(ledger.totals.totalSpentPoints, 0);
  assert.equal(ledger.discrepancies[0].status, "divergent");
  assert.equal(ledger.discrepancies[0].difference, -8);
  assert.ok(ledger.diagnostics.some(item => item.code === "point-discrepancy-divergent"));
});

test("rejects duplicate domains, contributions and discrepancies", () => {
  const traitReport = report({
    domain: "trait",
    categories: ["advantages"],
    contributions: [contribution({
      id: "duplicate",
      domain: "trait",
      category: "advantages",
      points: 1,
    })],
  });

  assert.throws(
    () => createPointLedger({
      characterId: CHARACTER_ID,
      domainReports: [traitReport, { ...traitReport, contributions: [] }],
    }),
    /Duplicate point domain/,
  );
  assert.throws(
    () => createPointLedger({
      characterId: CHARACTER_ID,
      domainReports: [
        traitReport,
        report({
          domain: "other",
          categories: ["other"],
          contributions: [contribution({
            id: "duplicate",
            domain: "other",
            category: "other",
            points: 2,
          })],
        }),
      ],
    }),
    /Duplicate point contribution id/,
  );
});

test("returns a deeply frozen, serializable and self-validating ledger", () => {
  const ledger = createPointLedger({
    characterId: CHARACTER_ID,
    pointBudget: { declaredPoints: 0 },
    domainReports: [],
  });
  const serialized = serializePointLedger(ledger);

  assert.equal(validatePointLedger(ledger), true);
  assert.equal(Object.isFrozen(ledger), true);
  assert.equal(Object.isFrozen(ledger.totals), true);
  assert.deepEqual(serialized, ledger);
  assert.notEqual(serialized, ledger);
});
