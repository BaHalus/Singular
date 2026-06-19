export function evaluateTransitionCosts(character, costs, context = {}) {
  const groups = new Map();

  for (const cost of costs) {
    const resourceKey = normalizeResourceKey(cost.resource);
    const groupKey = resourceKey ?? `unknown:${cost.resource}`;
    const group = groups.get(groupKey) ?? {
      resourceKey,
      required: 0,
      amountKnown: true,
      entries: [],
    };

    if (cost.amount === null) group.amountKnown = false;
    else group.required += cost.amount;

    group.entries.push(cost);
    groups.set(groupKey, group);
  }

  return [...groups.values()].flatMap(group => {
    const available = lookupAvailability(
      character,
      context.resources,
      group.resourceKey,
      group.entries[0]?.resource,
    );
    const payable = group.amountKnown && available !== null
      ? available >= group.required
      : null;

    return group.entries.map(cost => ({
      ...cloneValue(cost),
      resourceKey: group.resourceKey,
      available,
      totalRequired: group.amountKnown ? group.required : null,
      payable,
    }));
  });
}

export function normalizeResourceKey(value) {
  const normalized = normalizeText(value).replace(/[ _-]+/g, "");
  const aliases = {
    hp: "HP",
    pv: "HP",
    hitpoints: "HP",
    pontosdevida: "HP",

    fp: "FP",
    pf: "FP",
    fatiguepoints: "FP",
    pontosdefadiga: "FP",

    energyreserve: "EnergyReserve",
    reservadeenergia: "EnergyReserve",
    er: "EnergyReserve",
  };

  return aliases[normalized] ?? null;
}

function lookupAvailability(character, resources, resourceKey, originalName) {
  const contextual = lookupContextResource(resources, resourceKey, originalName);

  if (contextual !== null) return contextual;
  if (resourceKey === null) return null;

  return character.pools?.[resourceKey]?.current ?? null;
}

function lookupContextResource(resources, resourceKey, originalName) {
  if (!isPlainObject(resources)) return null;

  const candidates = [resourceKey, originalName]
    .filter(Boolean)
    .map(normalizeText);

  for (const [key, value] of Object.entries(resources)) {
    if (!candidates.includes(normalizeText(key))) continue;

    const current = typeof value === "number"
      ? value
      : isPlainObject(value)
        ? value.current
        : null;

    if (typeof current !== "number" || Number.isNaN(current)) {
      throw new Error(`Invalid transition resource value for ${key}`);
    }

    return current;
  }

  return null;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
