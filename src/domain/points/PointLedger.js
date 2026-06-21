import {
  createPointBudget,
  evaluatePointBudget,
  serializePointBudget,
  validatePointBudgetEvaluation,
} from "./PointBudget.js";
import {
  createPointDiscrepancy,
  serializePointDiscrepancy,
  validatePointDiscrepancy,
} from "./PointDiscrepancy.js";
import {
  createPointDomainReport,
  serializePointDomainReport,
  validatePointDomainReport,
} from "./PointDomainReport.js";

const LEDGER_STATUSES = ["ready", "partial", "blocked", "conflict"];

export function createPointLedger(input = {}) {
  requireObject(input, "Point ledger");
  const characterId = requiredString(input.characterId, "Point ledger characterId");
  const pointBudget = createPointBudget(input.pointBudget ?? {});
  const domainReports = (input.domainReports ?? []).map(createPointDomainReport);
  const discrepancies = (input.discrepancies ?? []).map(createPointDiscrepancy);

  validateReportIdentities(domainReports, characterId);
  validateDiscrepancyIdentities(discrepancies, characterId);

  const contributions = domainReports.flatMap(report => report.contributions);
  validateUniqueContributionIds(contributions);
  const knownSpentPoints = sumReadyContributions(contributions);
  const requiredReports = domainReports.filter(report => report.required);
  const spendingComplete = requiredReports.every(report => report.complete);
  const totalSpentPoints = spendingComplete ? knownSpentPoints : null;
  const budget = evaluatePointBudget(pointBudget, totalSpentPoints);
  const generatedDiscrepancies = createBudgetDiscrepancies(
    characterId,
    budget,
  );
  const allDiscrepancies = [...discrepancies, ...generatedDiscrepancies];
  validateUniqueDiscrepancyIds(allDiscrepancies);
  const status = determineLedgerStatus(requiredReports, spendingComplete, budget);
  const categories = createCategoryTotals(domainReports, contributions);
  const domains = domainReports.map(report => ({
    domain: report.domain,
    status: report.status,
    complete: report.complete,
    required: report.required,
    knownPoints: report.knownPoints,
    totalPoints: report.totalPoints,
    contributionCount: report.contributions.length,
  }));

  const ledger = {
    schemaVersion: 1,
    characterId,
    status,
    complete: spendingComplete && budget.complete && status === "ready",
    spendingComplete,
    pointBudget: serializePointBudget(pointBudget),
    budget,
    domainReports,
    contributions,
    discrepancies: allDiscrepancies,
    totals: {
      knownSpentPoints,
      totalSpentPoints,
      byDomain: domains,
      byCategory: categories,
    },
    diagnostics: collectDiagnostics(domainReports, budget, allDiscrepancies),
  };

  validatePointLedger(ledger);
  return deepFreeze(ledger);
}

export function validatePointLedger(ledger) {
  requireObject(ledger, "Point ledger");
  if (ledger.schemaVersion !== 1) {
    throw new Error("Point ledger schemaVersion is invalid");
  }
  requiredString(ledger.characterId, "Point ledger characterId");
  if (!LEDGER_STATUSES.includes(ledger.status)) {
    throw new Error("Point ledger status is invalid");
  }
  if (typeof ledger.complete !== "boolean" || typeof ledger.spendingComplete !== "boolean") {
    throw new Error("Point ledger completeness flags must be boolean");
  }
  validatePointBudgetEvaluation(ledger.budget);
  if (!Array.isArray(ledger.domainReports)) {
    throw new Error("Point ledger domainReports must be array");
  }
  ledger.domainReports.forEach(validatePointDomainReport);
  validateReportIdentities(ledger.domainReports, ledger.characterId);
  const flattened = ledger.domainReports.flatMap(report => report.contributions);
  validateUniqueContributionIds(flattened);
  if (canonical(flattened) !== canonical(ledger.contributions)) {
    throw new Error("Point ledger contributions are inconsistent with domain reports");
  }
  if (!Array.isArray(ledger.discrepancies)) {
    throw new Error("Point ledger discrepancies must be array");
  }
  ledger.discrepancies.forEach(validatePointDiscrepancy);
  validateDiscrepancyIdentities(ledger.discrepancies, ledger.characterId);
  validateUniqueDiscrepancyIds(ledger.discrepancies);
  validateTotals(ledger);
  if (!Array.isArray(ledger.diagnostics)) {
    throw new Error("Point ledger diagnostics must be array");
  }
  const expectedComplete = ledger.spendingComplete && ledger.budget.complete &&
    ledger.status === "ready";
  if (ledger.complete !== expectedComplete) {
    throw new Error("Point ledger complete flag is inconsistent");
  }
  return true;
}

export function serializePointLedger(ledger) {
  validatePointLedger(ledger);
  return {
    ...cloneValue(ledger),
    domainReports: ledger.domainReports.map(serializePointDomainReport),
    discrepancies: ledger.discrepancies.map(serializePointDiscrepancy),
  };
}

function determineLedgerStatus(requiredReports, spendingComplete, budget) {
  if (requiredReports.some(report => report.status === "unsupported")) return "blocked";
  if (budget.status === "divergent") return "conflict";
  if (!spendingComplete || !budget.complete) return "partial";
  return "ready";
}

function createCategoryTotals(reports, contributions) {
  const categoryNames = [...new Set([
    ...reports.flatMap(report => report.categories),
    ...contributions.map(item => item.category),
  ])].sort();
  return categoryNames.map(category => {
    const owners = reports.filter(report => report.categories.includes(category));
    const knownPoints = contributions.reduce((total, item) => (
      item.category === category && item.status === "ready" ? total + item.points : total
    ), 0);
    const complete = owners.length > 0 && owners.every(report => report.complete);
    return {
      category,
      status: owners.length === 0 ? "unavailable" : complete ? "ready" : "partial",
      complete,
      knownPoints,
      totalPoints: complete ? knownPoints : null,
    };
  });
}

function createBudgetDiscrepancies(characterId, budget) {
  if (budget.importedUnspentPoints === null) return [];
  return [createPointDiscrepancy({
    id: "budget:unspent",
    characterId,
    domain: "budget",
    sourceId: "point-budget",
    kind: "unspent-points",
    importedPoints: budget.importedUnspentPoints,
    calculatedPoints: budget.calculatedUnspentPoints,
    provenance: { source: "point-budget" },
  })];
}

function collectDiagnostics(reports, budget, discrepancies) {
  return [
    ...reports.flatMap(report => report.diagnostics.map(item => ({
      ...cloneValue(item),
      domain: report.domain,
    }))),
    ...budget.diagnostics.map(cloneValue),
    ...discrepancies
      .filter(item => item.status === "divergent" || item.status === "pending")
      .map(item => ({
        code: item.status === "divergent"
          ? "point-discrepancy-divergent"
          : "point-discrepancy-pending",
        severity: item.status === "divergent" ? "warning" : "pending",
        discrepancyId: item.id,
        domain: item.domain,
      })),
  ];
}

function validateTotals(ledger) {
  requireObject(ledger.totals, "Point ledger totals");
  const expectedKnown = sumReadyContributions(ledger.contributions);
  if (!Object.is(ledger.totals.knownSpentPoints, expectedKnown)) {
    throw new Error("Point ledger knownSpentPoints is inconsistent");
  }
  const required = ledger.domainReports.filter(report => report.required);
  const expectedSpendingComplete = required.every(report => report.complete);
  if (ledger.spendingComplete !== expectedSpendingComplete) {
    throw new Error("Point ledger spendingComplete is inconsistent");
  }
  const expectedTotal = expectedSpendingComplete ? expectedKnown : null;
  if (!Object.is(ledger.totals.totalSpentPoints, expectedTotal)) {
    throw new Error("Point ledger totalSpentPoints is inconsistent");
  }
  if (!Array.isArray(ledger.totals.byDomain) || !Array.isArray(ledger.totals.byCategory)) {
    throw new Error("Point ledger categorized totals must be arrays");
  }
}

function validateReportIdentities(reports, characterId) {
  const domains = new Set();
  for (const report of reports) {
    if (report.characterId !== characterId) {
      throw new Error("Point domain report belongs to another character");
    }
    if (domains.has(report.domain)) throw new Error(`Duplicate point domain: ${report.domain}`);
    domains.add(report.domain);
  }
}

function validateDiscrepancyIdentities(discrepancies, characterId) {
  for (const item of discrepancies) {
    if (item.characterId !== characterId) {
      throw new Error("Point discrepancy belongs to another character");
    }
  }
}

function validateUniqueContributionIds(contributions) {
  const ids = new Set();
  for (const item of contributions) {
    if (ids.has(item.id)) throw new Error(`Duplicate point contribution id: ${item.id}`);
    ids.add(item.id);
  }
}

function validateUniqueDiscrepancyIds(discrepancies) {
  const ids = new Set();
  for (const item of discrepancies) {
    if (ids.has(item.id)) throw new Error(`Duplicate point discrepancy id: ${item.id}`);
    ids.add(item.id);
  }
}

function sumReadyContributions(contributions) {
  return contributions.reduce((total, item) => (
    item.status === "ready" ? total + item.points : total
  ), 0);
}

function requiredString(value, label) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${label} must be non-empty string`);
  }
  return value;
}

function requireObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be object`);
  }
}

function canonical(value) {
  return JSON.stringify(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
