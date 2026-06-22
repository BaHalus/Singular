import test from "node:test";
import assert from "node:assert/strict";

import { createPointDomainReport } from "./PointDomainReport.js";
import { createPointLedger } from "./PointLedger.js";

const CHARACTER_ID = "character-mixed-unsupported";

function contribution({ id, status, points = null }) {
  return {
    id,
    characterId: CHARACTER_ID,
    domain: "skill",
    category: "skills",
    sourceId: id,
    sourceType: "skill-authority",
    status,
    points: status === "ready" ? points : null,
    authorityFingerprint: status === "ready" ? `fingerprint:${id}` : null,
  };
}

test("unsupported contribution blocks a mixed required domain while preserving known points", () => {
  const domainReport = createPointDomainReport({
    characterId: CHARACTER_ID,
    domain: "skill",
    categories: ["skills"],
    required: true,
    sourceFingerprint: "source:skill",
    contributions: [
      contribution({
        id: "skill-ready",
        status: "ready",
        points: 4,
      }),
      contribution({
        id: "skill-unsupported",
        status: "unsupported",
      }),
    ],
  });

  assert.equal(domainReport.status, "unsupported");
  assert.equal(domainReport.complete, false);
  assert.equal(domainReport.knownPoints, 4);
  assert.equal(domainReport.totalPoints, null);

  const ledger = createPointLedger({
    characterId: CHARACTER_ID,
    pointBudget: { declaredPoints: 100 },
    domainReports: [domainReport],
  });

  assert.equal(ledger.status, "blocked");
  assert.equal(ledger.spendingComplete, false);
  assert.equal(ledger.totals.knownSpentPoints, 4);
  assert.equal(ledger.totals.totalSpentPoints, null);
  assert.equal(ledger.budget.calculatedUnspentPoints, null);
});
