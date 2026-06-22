const TOTAL_PATHS = [
  ["total_points"],
  ["totalPoints"],
  ["total_points_raw"],
  ["totalPointsRaw"],
  ["profile", "total_points"],
  ["profile", "totalPoints"],
  ["profile", "total_points_raw"],
  ["profile", "totalPointsRaw"],
];

const UNSPENT_PATHS = [
  ["unspent_points"],
  ["unspentPoints"],
  ["unspent_points_raw"],
  ["unspentPointsRaw"],
  ["profile", "unspent_points"],
  ["profile", "unspentPoints"],
  ["profile", "unspent_points_raw"],
  ["profile", "unspentPointsRaw"],
];

export function importPointBudget(source = {}) {
  if (!isPlainObject(source)) {
    throw new Error("Point budget import source must be object");
  }
  const total = collectCandidates(source, TOTAL_PATHS, "total points");
  const unspent = collectCandidates(source, UNSPENT_PATHS, "unspent points");
  const diagnostics = [
    ...total.diagnostics,
    ...unspent.diagnostics,
  ];
  const status = diagnostics.some(item => item.severity === "warning")
    ? "conflict"
    : total.candidates.length === 0 && unspent.candidates.length === 0
      ? "empty"
      : "ready";

  return {
    declaredPoints: null,
    importedPoints: total.value,
    importedUnspentPoints: unspent.value,
    source: {
      kind: status === "empty" ? "unknown" : "imported",
      provider: status === "empty" ? null : "gcs",
      format: status === "empty" ? null : "gcs",
      reference: null,
      version: source.version ?? null,
    },
    importMeta: {
      source: "gcs",
      status,
      totalPointCandidates: total.candidates,
      unspentPointCandidates: unspent.candidates,
      diagnostics,
    },
    notes: "",
    raw: {
      totalPoints: total.candidates,
      unspentPoints: unspent.candidates,
    },
  };
}

function collectCandidates(source, paths, label) {
  const candidates = [];
  const diagnostics = [];
  for (const path of paths) {
    const read = readPath(source, path);
    if (!read.present || read.value === null || read.value === "") continue;
    const parsed = normalizeFinite(read.value);
    if (parsed === null) {
      diagnostics.push({
        code: "point-budget-import-value-invalid",
        severity: "warning",
        field: label,
        path: path.join("."),
        raw: cloneValue(read.value),
      });
      continue;
    }
    candidates.push({
      path: path.join("."),
      value: parsed,
      raw: cloneValue(read.value),
    });
  }
  const values = [...new Set(candidates.map(item => item.value))];
  if (values.length > 1) {
    diagnostics.push({
      code: "point-budget-import-candidates-divergent",
      severity: "warning",
      field: label,
      values,
      paths: candidates.map(item => item.path),
    });
  }
  return {
    candidates,
    value: values.length === 1 ? values[0] : null,
    diagnostics,
  };
}

function readPath(source, path) {
  let current = source;
  for (const key of path) {
    if (!isPlainObject(current) || !hasOwn(current, key)) {
      return { present: false, value: null };
    }
    current = current[key];
  }
  return { present: true, value: current };
}

function normalizeFinite(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
