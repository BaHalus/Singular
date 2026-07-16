import { createEquipmentModifierList } from "../../domain/character/EquipmentModifiers.js";
import { resolveEquipmentTotals } from "../../engine/equipment/EquipmentTotalsResolver.js";

export function createEquipmentModifierReadProjection(equipment = []) {
  if (!Array.isArray(equipment)) {
    throw new Error("Equipment modifier read projection requires equipment array");
  }

  const report = resolveEquipmentTotals(equipment);
  return deepFreeze(projectItems(equipment, report.entries));
}

function projectItems(items, entries, parentId = null, depth = 0) {
  return items.flatMap((item, index) => {
    const entry = entries[index];
    if (!entry || entry.id !== item.id) {
      throw new Error("Equipment modifier read projection entry mismatch");
    }
    const modifierRows = normalizeModifierRows(item);
    const projected = {
      itemId: item.id,
      parentId,
      depth,
      status: entry.status,
      authority: "engine.equipment",
      baseUnitCost: entry.unitCost,
      adjustedUnitCost: entry.adjustmentBreakdown.cost.finalUnitValue,
      baseUnitWeightKg: entry.unitWeightKg,
      adjustedUnitWeightKg: entry.adjustmentBreakdown.weight.finalUnitValue,
      selfTotals: cloneValue(entry.selfTotals),
      totals: cloneValue(entry.totals),
      modifiers: flattenModifierRows(modifierRows),
      breakdown: cloneValue(entry.adjustmentBreakdown),
      diagnostics: cloneValue(entry.diagnostics),
    };
    return [
      projected,
      ...projectItems(item.children ?? [], entry.children, item.id, depth + 1),
    ];
  });
}

function normalizeModifierRows(item) {
  if (item.modifierList !== null && item.modifierList !== undefined) {
    return createEquipmentModifierList(item.modifierList).rows;
  }
  if (!Array.isArray(item.modifiers) || item.modifiers.length === 0) return [];
  return createEquipmentModifierList({
    type: "eqp_modifier_list",
    id: `${item.id}:modifiers`,
    rows: item.modifiers,
  }).rows;
}

function flattenModifierRows(rows, parentId = null, depth = 0, parentEnabled = true) {
  return rows.flatMap(row => {
    const effectiveEnabled = parentEnabled && row.enabled;
    const projected = {
      id: row.id,
      parentId,
      depth,
      kind: row.kind,
      name: row.name,
      notes: row.notes,
      enabled: row.enabled,
      effectiveEnabled,
      costAdjustment: row.kind === "modifier" ? cloneValue(row.costAdjustment) : null,
      weightAdjustment: row.kind === "modifier" ? cloneValue(row.weightAdjustment) : null,
      applicability: row.kind === "modifier" ? cloneValue(row.applicability) : null,
      featureCount: row.kind === "modifier" ? row.features.length : 0,
    };
    return row.kind === "container"
      ? [projected, ...flattenModifierRows(row.children, row.id, depth + 1, effectiveEnabled)]
      : [projected];
  });
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }
  return value;
}

function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(item => deepFreeze(item, seen));
  return Object.freeze(value);
}
