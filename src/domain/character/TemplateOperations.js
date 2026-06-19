import { createCharacter } from "./Character.js";
import { createTemplateApplication } from "./TemplateApplications.js";

const FLAT_COMPONENT_KEYS = [
  "advantages",
  "perks",
  "disadvantages",
  "quirks",
  "skills",
  "techniques",
  "spells",
  "languages",
  "familiarities",
];

export function incorporateTemplate(character, templateId, options = {}) {
  const template = findTemplate(character, templateId);

  if (!template) {
    throw new Error("Template not found");
  }

  if (getActiveTemplateApplications(character).some(item => item.templateId === templateId)) {
    throw new Error("Template is already incorporated");
  }

  const applicationId = options.applicationId ?? generateTemplateApplicationId();

  if ((character.templateApplications ?? []).some(item => item.id === applicationId)) {
    throw new Error("Template application id already exists");
  }

  const appliedAt = normalizeTimestamp(options.now);
  const cloned = cloneTemplateComponents(template, applicationId);
  const application = createTemplateApplication({
    id: applicationId,
    templateId: template.id,
    templateName: template.name,
    templateType: template.templateType,
    importedPoints: template.importedPoints,
    status: "active",
    appliedAt,
    removedAt: null,
    componentIds: cloned.componentIds,
    notes: options.notes ?? "",
  });

  return createCharacter({
    ...character,
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
    templateApplications: [
      ...(character.templateApplications ?? []),
      application,
    ],
    metadata: touchMetadata(character.metadata, appliedAt),
  });
}

export function removeTemplateApplication(character, applicationId, options = {}) {
  const application = findTemplateApplication(character, applicationId);

  if (!application) {
    throw new Error("Template application not found");
  }

  if (application.status !== "active") {
    throw new Error("Template application is not active");
  }

  const removedAt = normalizeTimestamp(options.now);
  const nextApplications = character.templateApplications.map(item => (
    item.id === applicationId
      ? {
        ...item,
        status: "removed",
        removedAt,
      }
      : item
  ));

  return createCharacter({
    ...character,
    advantages: removeFlatComponents(character.advantages, applicationId),
    perks: removeFlatComponents(character.perks, applicationId),
    disadvantages: removeFlatComponents(character.disadvantages, applicationId),
    quirks: removeFlatComponents(character.quirks, applicationId),
    skills: removeFlatComponents(character.skills, applicationId),
    techniques: removeFlatComponents(character.techniques, applicationId),
    spells: removeFlatComponents(character.spells, applicationId),
    languages: removeFlatComponents(character.languages, applicationId),
    familiarities: removeFlatComponents(character.familiarities, applicationId),
    equipment: removeEquipmentComponents(character.equipment, applicationId),
    templateApplications: nextApplications,
    metadata: touchMetadata(character.metadata, removedAt),
  });
}

export function removeTemplatePackage(character, templateId, options = {}) {
  const template = findTemplate(character, templateId);

  if (!template) {
    throw new Error("Template not found");
  }

  if (getActiveTemplateApplications(character).some(item => item.templateId === templateId)) {
    throw new Error("Cannot remove template package while it is incorporated");
  }

  const updatedAt = normalizeTimestamp(options.now);

  return createCharacter({
    ...character,
    templates: character.templates.filter(item => item.id !== templateId),
    metadata: touchMetadata(character.metadata, updatedAt),
  });
}

export function findTemplate(character, templateId) {
  return (character.templates ?? []).find(item => item.id === templateId) ?? null;
}

export function findTemplateApplication(character, applicationId) {
  return (character.templateApplications ?? []).find(
    item => item.id === applicationId,
  ) ?? null;
}

export function getActiveTemplateApplications(character) {
  return (character.templateApplications ?? []).filter(item => item.status === "active");
}

function cloneTemplateComponents(template, applicationId) {
  const componentIds = createEmptyComponentIds();
  const skillIdMap = new Map();
  const advantages = cloneFlatCollection(
    template.traits.advantages,
    "advantages",
    template,
    applicationId,
    componentIds,
  );
  const perks = cloneFlatCollection(
    template.traits.perks,
    "perks",
    template,
    applicationId,
    componentIds,
  );
  const disadvantages = cloneFlatCollection(
    template.traits.disadvantages,
    "disadvantages",
    template,
    applicationId,
    componentIds,
  );
  const quirks = cloneFlatCollection(
    template.traits.quirks,
    "quirks",
    template,
    applicationId,
    componentIds,
  );
  const skills = template.skills.map((record, index) => {
    const clone = cloneRecord(
      record,
      "skills",
      index,
      template,
      applicationId,
    );

    componentIds.skills.push(clone.id);
    skillIdMap.set(record.id, clone.id);

    return clone;
  });
  const techniques = template.techniques.map((record, index) => {
    const clone = cloneRecord(
      record,
      "techniques",
      index,
      template,
      applicationId,
    );

    if (record.skillId && skillIdMap.has(record.skillId)) {
      clone.skillId = skillIdMap.get(record.skillId);
    }

    componentIds.techniques.push(clone.id);

    return clone;
  });
  const spells = cloneFlatCollection(
    template.spells,
    "spells",
    template,
    applicationId,
    componentIds,
  );
  const languages = cloneFlatCollection(
    template.languages,
    "languages",
    template,
    applicationId,
    componentIds,
  );
  const familiarities = cloneFlatCollection(
    template.familiarities,
    "familiarities",
    template,
    applicationId,
    componentIds,
  );
  const equipment = template.equipment.map((record, index) => {
    const clone = cloneEquipmentRecord(
      record,
      [index],
      template,
      applicationId,
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

function cloneFlatCollection(
  records,
  componentKey,
  template,
  applicationId,
  componentIds,
) {
  return records.map((record, index) => {
    const clone = cloneRecord(
      record,
      componentKey,
      index,
      template,
      applicationId,
    );

    componentIds[componentKey].push(clone.id);

    return clone;
  });
}

function cloneRecord(record, componentKey, index, template, applicationId) {
  const cloned = cloneValue(record);
  const sourceComponentId = record.id ?? `${componentKey}-${index}`;

  return {
    ...cloned,
    id: createAppliedComponentId(
      applicationId,
      componentKey,
      sourceComponentId,
      index,
    ),
    importMeta: createApplicationProvenance(
      cloned.importMeta,
      template,
      applicationId,
      componentKey,
      sourceComponentId,
    ),
  };
}

function cloneEquipmentRecord(record, path, template, applicationId) {
  const cloned = cloneValue(record);
  const sourceComponentId = record.id ?? `equipment-${path.join("-")}`;

  return {
    ...cloned,
    id: createAppliedComponentId(
      applicationId,
      "equipment",
      sourceComponentId,
      path.join("-"),
    ),
    importMeta: createApplicationProvenance(
      cloned.importMeta,
      template,
      applicationId,
      "equipment",
      sourceComponentId,
    ),
    children: (record.children ?? []).map((child, index) => (
      cloneEquipmentRecord(
        child,
        [...path, index],
        template,
        applicationId,
      )
    )),
  };
}

function createApplicationProvenance(
  importMeta,
  template,
  applicationId,
  componentType,
  sourceComponentId,
) {
  const sourceMeta = importMeta && typeof importMeta === "object" && !Array.isArray(importMeta)
    ? cloneValue(importMeta)
    : {};

  return {
    ...sourceMeta,
    templateApplicationId: applicationId,
    templateId: template.id,
    templateName: template.name,
    templateComponentType: componentType,
    templateSourceComponentId: String(sourceComponentId),
  };
}

function removeFlatComponents(records, applicationId) {
  return records.filter(record => !belongsToApplication(record, applicationId));
}

function removeEquipmentComponents(records, applicationId) {
  return records
    .filter(record => !belongsToApplication(record, applicationId))
    .map(record => ({
      ...record,
      children: removeEquipmentComponents(record.children ?? [], applicationId),
    }));
}

function belongsToApplication(record, applicationId) {
  return record?.importMeta?.templateApplicationId === applicationId;
}

function createEmptyComponentIds() {
  return Object.fromEntries([
    ...FLAT_COMPONENT_KEYS,
    "equipment",
  ].map(key => [key, []]));
}

function createAppliedComponentId(
  applicationId,
  componentType,
  sourceComponentId,
  suffix,
) {
  return [
    "tpl",
    sanitizeIdPart(applicationId),
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

function normalizeTimestamp(value) {
  if (value === undefined || value === null) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value !== "string" || value === "") {
    throw new Error("Template operation timestamp must be string, Date or null");
  }

  return value;
}

function touchMetadata(metadata, updatedAt) {
  return {
    ...metadata,
    updatedAt,
  };
}

function generateTemplateApplicationId() {
  return `template_application_${Math.random().toString(36).slice(2, 10)}`;
}
