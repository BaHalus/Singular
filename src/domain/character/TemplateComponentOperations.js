export const TEMPLATE_COMPONENT_KEYS = [
  "advantages",
  "perks",
  "disadvantages",
  "quirks",
  "skills",
  "techniques",
  "spells",
  "languages",
  "familiarities",
  "equipment",
];

export function cloneTemplateComponents(template, options = {}) {
  if (!template || typeof template !== "object" || Array.isArray(template)) {
    throw new Error("Template must be an object");
  }

  const idNamespace = options.idNamespace ?? generateComponentNamespace();
  const provenance = normalizePlainObject(
    options.provenance,
    "Template component provenance must be object",
  );
  const componentIds = createEmptyComponentIds();
  const skillIdMap = new Map();
  const advantages = cloneFlatCollection(
    template.traits?.advantages ?? [],
    "advantages",
    template,
    idNamespace,
    provenance,
    componentIds,
  );
  const perks = cloneFlatCollection(
    template.traits?.perks ?? [],
    "perks",
    template,
    idNamespace,
    provenance,
    componentIds,
  );
  const disadvantages = cloneFlatCollection(
    template.traits?.disadvantages ?? [],
    "disadvantages",
    template,
    idNamespace,
    provenance,
    componentIds,
  );
  const quirks = cloneFlatCollection(
    template.traits?.quirks ?? [],
    "quirks",
    template,
    idNamespace,
    provenance,
    componentIds,
  );
  const skills = (template.skills ?? []).map((record, index) => {
    const clone = cloneRecord(
      record,
      "skills",
      index,
      template,
      idNamespace,
      provenance,
    );

    componentIds.skills.push(clone.id);
    skillIdMap.set(record.id, clone.id);

    return clone;
  });
  const techniques = (template.techniques ?? []).map((record, index) => {
    const clone = cloneRecord(
      record,
      "techniques",
      index,
      template,
      idNamespace,
      provenance,
    );

    if (record.skillId && skillIdMap.has(record.skillId)) {
      clone.skillId = skillIdMap.get(record.skillId);
    }

    componentIds.techniques.push(clone.id);

    return clone;
  });
  const spells = cloneFlatCollection(
    template.spells ?? [],
    "spells",
    template,
    idNamespace,
    provenance,
    componentIds,
  );
  const languages = cloneFlatCollection(
    template.languages ?? [],
    "languages",
    template,
    idNamespace,
    provenance,
    componentIds,
  );
  const familiarities = cloneFlatCollection(
    template.familiarities ?? [],
    "familiarities",
    template,
    idNamespace,
    provenance,
    componentIds,
  );
  const equipment = (template.equipment ?? []).map((record, index) => {
    const clone = cloneEquipmentRecord(
      record,
      [index],
      template,
      idNamespace,
      provenance,
    );

    componentIds.equipment.push(clone.id);

    return clone;
  });

  return {
    advantages,
    perks,
    disadvantages,
    quirks,
    skills,
    techniques,
    spells,
    languages,
    familiarities,
    equipment,
    componentIds,
  };
}

export function appendTemplateComponents(character, cloned) {
  return {
    advantages: [...character.advantages, ...cloned.advantages],
    perks: [...character.perks, ...cloned.perks],
    disadvantages: [...character.disadvantages, ...cloned.disadvantages],
    quirks: [...character.quirks, ...cloned.quirks],
    skills: [...character.skills, ...cloned.skills],
    techniques: [...character.techniques, ...cloned.techniques],
    spells: [...character.spells, ...cloned.spells],
    languages: [...character.languages, ...cloned.languages],
    familiarities: [...character.familiarities, ...cloned.familiarities],
    equipment: [...character.equipment, ...cloned.equipment],
  };
}

export function removeTemplateComponents(character, predicate) {
  if (typeof predicate !== "function") {
    throw new Error("Template component removal predicate must be function");
  }

  return {
    advantages: removeFlatComponents(character.advantages, predicate),
    perks: removeFlatComponents(character.perks, predicate),
    disadvantages: removeFlatComponents(character.disadvantages, predicate),
    quirks: removeFlatComponents(character.quirks, predicate),
    skills: removeFlatComponents(character.skills, predicate),
    techniques: removeFlatComponents(character.techniques, predicate),
    spells: removeFlatComponents(character.spells, predicate),
    languages: removeFlatComponents(character.languages, predicate),
    familiarities: removeFlatComponents(character.familiarities, predicate),
    equipment: removeEquipmentComponents(character.equipment, predicate),
  };
}

function cloneFlatCollection(
  records,
  componentKey,
  template,
  idNamespace,
  provenance,
  componentIds,
) {
  return records.map((record, index) => {
    const clone = cloneRecord(
      record,
      componentKey,
      index,
      template,
      idNamespace,
      provenance,
    );

    componentIds[componentKey].push(clone.id);

    return clone;
  });
}

function cloneRecord(
  record,
  componentKey,
  index,
  template,
  idNamespace,
  provenance,
) {
  const cloned = cloneValue(record);
  const sourceComponentId = record.id ?? `${componentKey}-${index}`;

  return {
    ...cloned,
    id: createAppliedComponentId(
      idNamespace,
      componentKey,
      sourceComponentId,
      index,
    ),
    importMeta: createComponentProvenance(
      cloned.importMeta,
      template,
      componentKey,
      sourceComponentId,
      provenance,
    ),
  };
}

function cloneEquipmentRecord(
  record,
  path,
  template,
  idNamespace,
  provenance,
) {
  const cloned = cloneValue(record);
  const sourceComponentId = record.id ?? `equipment-${path.join("-")}`;

  return {
    ...cloned,
    id: createAppliedComponentId(
      idNamespace,
      "equipment",
      sourceComponentId,
      path.join("-"),
    ),
    importMeta: createComponentProvenance(
      cloned.importMeta,
      template,
      "equipment",
      sourceComponentId,
      provenance,
    ),
    children: (record.children ?? []).map((child, index) => (
      cloneEquipmentRecord(
        child,
        [...path, index],
        template,
        idNamespace,
        provenance,
      )
    )),
  };
}

function createComponentProvenance(
  importMeta,
  template,
  componentType,
  sourceComponentId,
  provenance,
) {
  const sourceMeta = importMeta && typeof importMeta === "object" && !Array.isArray(importMeta)
    ? cloneValue(importMeta)
    : {};

  return {
    ...sourceMeta,
    templateId: template.id,
    templateName: template.name,
    templateComponentType: componentType,
    templateSourceComponentId: String(sourceComponentId),
    ...cloneValue(provenance),
  };
}

function removeFlatComponents(records, predicate) {
  return records.filter(record => !predicate(record));
}

function removeEquipmentComponents(records, predicate) {
  return records
    .filter(record => !predicate(record))
    .map(record => ({
      ...record,
      children: removeEquipmentComponents(record.children ?? [], predicate),
    }));
}

function createEmptyComponentIds() {
  return Object.fromEntries(
    TEMPLATE_COMPONENT_KEYS.map(key => [key, []]),
  );
}

function createAppliedComponentId(
  idNamespace,
  componentType,
  sourceComponentId,
  suffix,
) {
  return [
    "tpl",
    sanitizeIdPart(idNamespace),
    sanitizeIdPart(componentType),
    sanitizeIdPart(sourceComponentId),
    sanitizeIdPart(suffix),
  ].join("_");
}

function sanitizeIdPart(value) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "component";
}

function normalizePlainObject(value, errorMessage) {
  if (value === undefined || value === null) return {};

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(errorMessage);
  }

  return { ...value };
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map(cloneValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneValue(item)]),
    );
  }

  return value;
}

function generateComponentNamespace() {
  return `component_${Math.random().toString(36).slice(2, 10)}`;
}
