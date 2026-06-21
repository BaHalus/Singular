import { createCharacter } from "./Character.js";
import {
  createTemplateApplication,
  createTemplateApplicationEvent,
  serializeTemplateApplications,
} from "./TemplateApplications.js";
import {
  appendTemplateComponents,
  cloneTemplateComponents,
  removeTemplateComponents,
  TEMPLATE_COMPONENT_KEYS,
} from "./TemplateComponentOperations.js";
import {
  resolveTemplateComposition,
  serializeResolvedTemplateComposition,
} from "./TemplateDependencyResolver.js";
import {
  createTemplate,
  serializeTemplates,
} from "./Templates.js";

const OPERATIONS = ["apply", "remove", "update"];
const HARD_REASONS = new Set([
  "template-not-found",
  "template-application-not-found",
  "template-application-not-active",
  "template-already-applied",
  "template-composition-overlap-active",
  "template-composition-blocked",
  "template-active-application-dependency",
  "template-active-form-dependency",
  "template-update-id-mismatch",
  "template-application-id-conflict",
]);

export class TemplateApplicationOperationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "TemplateApplicationOperationError";
    this.code = code;
    this.details = details;
  }
}

export function analyzeTemplateApplicationOperation(character, input = {}) {
  validateCharacterShape(character);
  const request = normalizeRequest(input);

  if (request.operation === "apply") {
    return analyzeApply(character, request);
  }
  if (request.operation === "remove") {
    return analyzeRemove(character, request);
  }
  return analyzeUpdate(character, request);
}

export function planTemplateApplicationOperation(
  character,
  input = {},
  options = {},
) {
  if (!isPlainObject(options)) {
    throw new Error("Template application plan options must be object");
  }

  const analysis = analyzeTemplateApplicationOperation(character, input);
  const request = normalizeRequest(input);
  const plannedAt = normalizeTimestamp(options.now);
  const operationId = options.operationId ?? generateOperationId();
  const applicationId = determinePlannedApplicationId(
    analysis,
    request,
    options,
  );
  const eventId = options.eventId ?? `${operationId}:event`;
  const plan = {
    id: options.planId ?? generatePlanId(),
    operationId,
    eventId,
    plannedAt,
    characterId: character.identity.id,
    operation: request.operation,
    applicationId,
    previousApplicationId: analysis.application?.id ?? null,
    rootTemplateId: analysis.rootTemplateId,
    request: serializeRequest(request),
    choices: cloneValue(analysis.choices),
    packageComparison: cloneValue(analysis.packageComparison),
    analysis: cloneValue(analysis),
    analysisFingerprint: createAnalysisFingerprint(analysis),
    status: analysis.status,
    reasons: [...analysis.reasons],
  };
  plan.planFingerprint = createPlanFingerprint(plan);
  return deepFreeze(plan);
}

export function executeTemplateApplicationPlan(
  character,
  plan,
  options = {},
) {
  validateCharacterShape(character);
  validatePlan(plan);
  if (!isPlainObject(options)) {
    throw new Error("Template application execution options must be object");
  }
  if (plan.characterId !== character.identity.id) {
    throw new TemplateApplicationOperationError(
      "PLAN_CHARACTER_MISMATCH",
      "Template application plan belongs to another character",
    );
  }

  const currentAnalysis = analyzeTemplateApplicationOperation(
    character,
    deserializeRequest(plan.request),
  );
  const currentFingerprint = createAnalysisFingerprint(currentAnalysis);
  if (currentFingerprint !== plan.analysisFingerprint) {
    throw new TemplateApplicationOperationError(
      "PLAN_STALE",
      "Template application plan is stale",
      {
        expectedFingerprint: plan.analysisFingerprint,
        currentFingerprint,
        currentAnalysis,
      },
    );
  }

  if (currentAnalysis.status === "no-op") {
    return {
      character,
      receipt: createNoOpReceipt(character, plan, currentAnalysis),
      plan,
      changed: false,
    };
  }
  if (currentAnalysis.status !== "ready") {
    throw new TemplateApplicationOperationError(
      "PLAN_NOT_READY",
      "Template application plan is not ready",
      {
        status: currentAnalysis.status,
        reasons: currentAnalysis.reasons,
      },
    );
  }

  const executedAt = normalizeTimestamp(options.now ?? plan.plannedAt);
  if (plan.operation === "apply") {
    return executeApply(character, plan, currentAnalysis, executedAt, options);
  }
  if (plan.operation === "remove") {
    return executeRemove(character, plan, currentAnalysis, executedAt, options);
  }
  return executeUpdate(character, plan, currentAnalysis, executedAt, options);
}

export function compareTemplatePackageVersions(
  templates,
  rootTemplateId,
  replacementTemplate,
) {
  if (!Array.isArray(templates)) {
    throw new Error("Template package comparison templates must be array");
  }
  const replacement = createTemplate(replacementTemplate);
  if (replacement.id !== rootTemplateId) {
    throw new Error("Replacement template id must match rootTemplateId");
  }

  const currentResolution = resolveTemplateComposition(templates, {
    rootTemplateIds: [rootTemplateId],
  });
  const candidateTemplates = replaceTemplate(templates, replacement);
  const candidateResolution = resolveTemplateComposition(candidateTemplates, {
    rootTemplateIds: [rootTemplateId],
  });
  const currentFingerprints = createTemplateFingerprintMap(
    templates,
    currentResolution.orderedTemplateIds,
  );
  const candidateFingerprints = createTemplateFingerprintMap(
    candidateTemplates,
    candidateResolution.orderedTemplateIds,
  );
  const allIds = [...new Set([
    ...currentResolution.orderedTemplateIds,
    ...candidateResolution.orderedTemplateIds,
  ])];

  const addedTemplateIds = [];
  const removedTemplateIds = [];
  const changedTemplateIds = [];
  const unchangedTemplateIds = [];
  for (const templateId of allIds) {
    const before = currentFingerprints.get(templateId) ?? null;
    const after = candidateFingerprints.get(templateId) ?? null;
    if (before === null) addedTemplateIds.push(templateId);
    else if (after === null) removedTemplateIds.push(templateId);
    else if (before === after) unchangedTemplateIds.push(templateId);
    else changedTemplateIds.push(templateId);
  }

  return deepFreeze({
    rootTemplateId,
    currentStatus: currentResolution.status,
    candidateStatus: candidateResolution.status,
    addedTemplateIds,
    removedTemplateIds,
    changedTemplateIds,
    unchangedTemplateIds,
    changed: addedTemplateIds.length > 0 ||
      removedTemplateIds.length > 0 ||
      changedTemplateIds.length > 0,
    currentCompositionFingerprint:
      createCompositionFingerprint(currentResolution, templates),
    candidateCompositionFingerprint:
      createCompositionFingerprint(candidateResolution, candidateTemplates),
  });
}

function analyzeApply(character, request) {
  const template = findTemplate(character, request.templateId);
  const reasons = [];
  let resolution = null;
  let compositionFingerprint = null;
  let overlapApplicationIds = [];

  if (template === null) {
    reasons.push("template-not-found");
  } else {
    resolution = resolveTemplateComposition(character.templates, {
      rootTemplateIds: [template.id],
    });
    reasons.push(...resolutionReasons(resolution));
    compositionFingerprint = createCompositionFingerprint(
      resolution,
      character.templates,
    );

    const active = getActiveApplications(character);
    if (active.some(application => application.rootTemplateId === template.id)) {
      reasons.push("template-already-applied");
    }
    overlapApplicationIds = active
      .filter(application => intersects(
        application.resolvedTemplateIds,
        resolution.orderedTemplateIds,
      ))
      .map(application => application.id);
    if (overlapApplicationIds.length > 0) {
      reasons.push("template-composition-overlap-active");
    }
  }

  const uniqueReasons = unique(reasons);
  return finalizeAnalysis({
    operation: "apply",
    rootTemplateId: template?.id ?? request.templateId,
    template,
    application: null,
    resolution,
    compositionFingerprint,
    overlapApplicationIds,
    activeDependentApplicationIds: [],
    activeFormDependencies: [],
    choices: cloneValue(request.choices),
    packageComparison: null,
    reasons: uniqueReasons,
  });
}

function analyzeRemove(character, request) {
  const application = findApplication(character, request.applicationId);
  const reasons = [];
  let activeDependentApplicationIds = [];
  let activeFormDependencies = [];

  if (application === null) {
    reasons.push("template-application-not-found");
  } else if (application.status !== "active") {
    reasons.push("template-application-not-active");
  } else {
    activeDependentApplicationIds = findActiveDependentApplications(
      character,
      application,
    );
    activeFormDependencies = findActiveFormDependencies(
      character,
      application.resolvedTemplateIds,
    );
    if (activeDependentApplicationIds.length > 0) {
      reasons.push("template-active-application-dependency");
    }
    if (activeFormDependencies.length > 0) {
      reasons.push("template-active-form-dependency");
    }
  }

  return finalizeAnalysis({
    operation: "remove",
    rootTemplateId: application?.rootTemplateId ?? null,
    template: application === null
      ? null
      : findTemplate(character, application.rootTemplateId),
    application,
    resolution: null,
    compositionFingerprint: application?.compositionFingerprint ?? null,
    overlapApplicationIds: [],
    activeDependentApplicationIds,
    activeFormDependencies,
    choices: cloneValue(application?.choices ?? {}),
    packageComparison: null,
    reasons: unique(reasons),
  });
}

function analyzeUpdate(character, request) {
  const application = findApplication(character, request.applicationId);
  const reasons = [];
  let replacementTemplate = request.replacementTemplate;
  let resolution = null;
  let compositionFingerprint = null;
  let packageComparison = null;
  let overlapApplicationIds = [];
  let activeDependentApplicationIds = [];
  let activeFormDependencies = [];

  if (application === null) {
    reasons.push("template-application-not-found");
  } else if (application.status !== "active") {
    reasons.push("template-application-not-active");
  } else {
    if (replacementTemplate.id !== application.rootTemplateId) {
      reasons.push("template-update-id-mismatch");
    } else {
      const candidateTemplates = replaceTemplate(
        character.templates,
        replacementTemplate,
      );
      resolution = resolveTemplateComposition(candidateTemplates, {
        rootTemplateIds: [application.rootTemplateId],
      });
      reasons.push(...resolutionReasons(resolution));
      compositionFingerprint = createCompositionFingerprint(
        resolution,
        candidateTemplates,
      );
      packageComparison = compareTemplatePackageVersions(
        character.templates,
        application.rootTemplateId,
        replacementTemplate,
      );

      overlapApplicationIds = getActiveApplications(character)
        .filter(candidate => candidate.id !== application.id)
        .filter(candidate => intersects(
          candidate.resolvedTemplateIds,
          resolution.orderedTemplateIds,
        ))
        .map(candidate => candidate.id);
      if (overlapApplicationIds.length > 0) {
        reasons.push("template-composition-overlap-active");
      }
      activeDependentApplicationIds = findActiveDependentApplications(
        character,
        application,
      );
      activeFormDependencies = findActiveFormDependencies(
        character,
        [...new Set([
          ...application.resolvedTemplateIds,
          ...resolution.orderedTemplateIds,
        ])],
      );
      if (activeDependentApplicationIds.length > 0) {
        reasons.push("template-active-application-dependency");
      }
      if (activeFormDependencies.length > 0) {
        reasons.push("template-active-form-dependency");
      }
    }
  }

  const choices = request.hasChoices
    ? cloneValue(request.choices)
    : cloneValue(application?.choices ?? {});
  const analysis = finalizeAnalysis({
    operation: "update",
    rootTemplateId: application?.rootTemplateId ?? replacementTemplate.id,
    template: replacementTemplate,
    application,
    resolution,
    compositionFingerprint,
    overlapApplicationIds,
    activeDependentApplicationIds,
    activeFormDependencies,
    choices,
    packageComparison,
    reasons: unique(reasons),
  });

  if (
    analysis.status === "ready" &&
    packageComparison !== null &&
    packageComparison.changed === false &&
    canonicalStringify(choices) === canonicalStringify(application.choices)
  ) {
    return deepFreeze({ ...analysis, status: "no-op" });
  }
  return analysis;
}

function finalizeAnalysis(input) {
  const status = input.reasons.some(reason => HARD_REASONS.has(reason))
    ? "blocked"
    : input.reasons.length > 0 ? "pending" : "ready";
  return deepFreeze({
    operation: input.operation,
    status,
    executable: status === "ready",
    rootTemplateId: input.rootTemplateId,
    template: input.template === null ? null : serializeTemplates([input.template])[0],
    application: input.application === null
      ? null
      : serializeTemplateApplications([input.application])[0],
    resolution: input.resolution === null
      ? null
      : serializeResolvedTemplateComposition(input.resolution),
    compositionFingerprint: input.compositionFingerprint,
    overlapApplicationIds: [...input.overlapApplicationIds],
    activeDependentApplicationIds: [...input.activeDependentApplicationIds],
    activeFormDependencies: cloneValue(input.activeFormDependencies),
    choices: cloneValue(input.choices),
    packageComparison: cloneValue(input.packageComparison),
    reasons: [...input.reasons],
  });
}

function executeApply(character, plan, analysis, executedAt, options) {
  assertApplicationIdAvailable(character, plan.applicationId);
  const templates = character.templates;
  const materialized = materializeComposition(
    character,
    analysis.resolution.orderedTemplateIds,
    templates,
    plan.applicationId,
    analysis.rootTemplateId,
    analysis.compositionFingerprint,
  );
  const receipt = createReceipt({
    id: plan.operationId,
    operation: "apply",
    executedAt,
    characterId: character.identity.id,
    applicationId: plan.applicationId,
    previousApplicationId: null,
    rootTemplateId: analysis.rootTemplateId,
    resolvedTemplateIds: analysis.resolution.orderedTemplateIds,
    componentIds: materialized.componentIds,
    choices: analysis.choices,
    packageComparison: null,
    planFingerprint: plan.planFingerprint,
  });
  const rootTemplate = findTemplate(character, analysis.rootTemplateId);
  const application = createApplicationRecord({
    id: plan.applicationId,
    rootTemplate,
    resolvedTemplateIds: analysis.resolution.orderedTemplateIds,
    compositionFingerprint: analysis.compositionFingerprint,
    choices: analysis.choices,
    replacesApplicationId: null,
    appliedAt: executedAt,
    componentIds: materialized.componentIds,
    historyEvent: createLifecycleEvent(plan, receipt, "applied", executedAt),
    notes: options.notes ?? "",
  });
  const nextCharacter = createCharacter({
    ...character,
    ...materialized.characterCollections,
    templateApplications: [...character.templateApplications, application],
    metadata: touchMetadata(character.metadata, executedAt),
  });
  return { character: nextCharacter, receipt, plan, changed: true };
}

function executeRemove(character, plan, analysis, executedAt, options) {
  const application = findApplication(character, analysis.application.id);
  const stripped = removeTemplateComponents(
    character,
    record => record?.importMeta?.templateApplicationId === application.id,
  );
  const receipt = createReceipt({
    id: plan.operationId,
    operation: "remove",
    executedAt,
    characterId: character.identity.id,
    applicationId: application.id,
    previousApplicationId: application.id,
    rootTemplateId: application.rootTemplateId,
    resolvedTemplateIds: application.resolvedTemplateIds,
    componentIds: application.componentIds,
    choices: application.choices,
    packageComparison: null,
    planFingerprint: plan.planFingerprint,
  });
  const event = createLifecycleEvent(plan, receipt, "removed", executedAt);
  const nextApplications = character.templateApplications.map(candidate => (
    candidate.id === application.id
      ? createTemplateApplication({
        ...candidate,
        status: "removed",
        removedAt: executedAt,
        history: [...candidate.history, event],
        notes: options.notes ?? candidate.notes,
      })
      : candidate
  ));
  const nextCharacter = createCharacter({
    ...character,
    ...stripped,
    templateApplications: nextApplications,
    metadata: touchMetadata(character.metadata, executedAt),
  });
  return { character: nextCharacter, receipt, plan, changed: true };
}

function executeUpdate(character, plan, analysis, executedAt, options) {
  assertApplicationIdAvailable(character, plan.applicationId);
  const previous = findApplication(character, analysis.application.id);
  const replacement = createTemplate(analysis.template);
  const candidateTemplates = replaceTemplate(character.templates, replacement);
  const stripped = removeTemplateComponents(
    character,
    record => record?.importMeta?.templateApplicationId === previous.id,
  );
  const candidateCharacter = { ...character, ...stripped };
  const materialized = materializeComposition(
    candidateCharacter,
    analysis.resolution.orderedTemplateIds,
    candidateTemplates,
    plan.applicationId,
    analysis.rootTemplateId,
    analysis.compositionFingerprint,
  );
  const receipt = createReceipt({
    id: plan.operationId,
    operation: "update",
    executedAt,
    characterId: character.identity.id,
    applicationId: plan.applicationId,
    previousApplicationId: previous.id,
    rootTemplateId: analysis.rootTemplateId,
    resolvedTemplateIds: analysis.resolution.orderedTemplateIds,
    componentIds: materialized.componentIds,
    choices: analysis.choices,
    packageComparison: analysis.packageComparison,
    planFingerprint: plan.planFingerprint,
  });
  const previousEvent = createLifecycleEvent(
    plan,
    receipt,
    "updated",
    executedAt,
    `${plan.eventId}:previous`,
  );
  const nextEvent = createLifecycleEvent(
    plan,
    receipt,
    "updated",
    executedAt,
    `${plan.eventId}:current`,
  );
  const rootTemplate = candidateTemplates.find(item => (
    item.id === analysis.rootTemplateId
  ));
  const nextApplication = createApplicationRecord({
    id: plan.applicationId,
    rootTemplate,
    resolvedTemplateIds: analysis.resolution.orderedTemplateIds,
    compositionFingerprint: analysis.compositionFingerprint,
    choices: analysis.choices,
    replacesApplicationId: previous.id,
    appliedAt: executedAt,
    componentIds: materialized.componentIds,
    historyEvent: nextEvent,
    notes: options.notes ?? previous.notes,
  });
  const applications = character.templateApplications.map(candidate => (
    candidate.id === previous.id
      ? createTemplateApplication({
        ...candidate,
        status: "removed",
        removedAt: executedAt,
        replacedByApplicationId: nextApplication.id,
        history: [...candidate.history, previousEvent],
      })
      : candidate
  ));
  applications.push(nextApplication);

  const nextCharacter = createCharacter({
    ...character,
    ...materialized.characterCollections,
    templates: candidateTemplates,
    templateApplications: applications,
    metadata: touchMetadata(character.metadata, executedAt),
  });
  return { character: nextCharacter, receipt, plan, changed: true };
}

function materializeComposition(
  character,
  templateIds,
  templates,
  applicationId,
  rootTemplateId,
  compositionFingerprint,
) {
  let collections = pickCharacterCollections(character);
  const componentIds = emptyComponentIds();

  for (const templateId of templateIds) {
    const template = templates.find(item => item.id === templateId);
    if (!template) {
      throw new TemplateApplicationOperationError(
        "TEMPLATE_MISSING_DURING_EXECUTION",
        "Resolved template disappeared during execution",
        { templateId },
      );
    }
    const cloned = cloneTemplateComponents(template, {
      idNamespace: `${applicationId}:${templateId}`,
      provenance: {
        templateApplicationId: applicationId,
        templateRootId: rootTemplateId,
        templateCompositionFingerprint: compositionFingerprint,
      },
    });
    collections = appendTemplateComponents(collections, cloned);
    for (const key of TEMPLATE_COMPONENT_KEYS) {
      componentIds[key].push(...cloned.componentIds[key]);
    }
  }

  return {
    characterCollections: collections,
    componentIds,
  };
}

function pickCharacterCollections(character) {
  return Object.fromEntries(
    TEMPLATE_COMPONENT_KEYS.map(key => [key, character[key]]),
  );
}

function createApplicationRecord(input) {
  return createTemplateApplication({
    id: input.id,
    templateId: input.rootTemplate.id,
    rootTemplateId: input.rootTemplate.id,
    templateName: input.rootTemplate.name,
    templateType: input.rootTemplate.templateType,
    importedPoints: input.rootTemplate.importedPoints,
    resolvedTemplateIds: input.resolvedTemplateIds,
    compositionFingerprint: input.compositionFingerprint,
    choices: input.choices,
    replacesApplicationId: input.replacesApplicationId,
    replacedByApplicationId: null,
    status: "active",
    appliedAt: input.appliedAt,
    removedAt: null,
    componentIds: input.componentIds,
    history: [input.historyEvent],
    notes: input.notes,
  });
}

function createLifecycleEvent(plan, receipt, type, occurredAt, id = plan.eventId) {
  return createTemplateApplicationEvent({
    id,
    type,
    occurredAt,
    operationId: plan.operationId,
    planFingerprint: plan.planFingerprint,
    receipt,
  });
}

function createReceipt(input) {
  return deepFreeze({
    id: input.id,
    operation: input.operation,
    executedAt: input.executedAt,
    characterId: input.characterId,
    applicationId: input.applicationId,
    previousApplicationId: input.previousApplicationId,
    rootTemplateId: input.rootTemplateId,
    resolvedTemplateIds: [...input.resolvedTemplateIds],
    componentIds: cloneValue(input.componentIds),
    choices: cloneValue(input.choices),
    packageComparison: cloneValue(input.packageComparison),
    planFingerprint: input.planFingerprint,
  });
}

function createNoOpReceipt(character, plan, analysis) {
  return deepFreeze({
    id: plan.operationId,
    operation: plan.operation,
    status: "no-op",
    executedAt: plan.plannedAt,
    characterId: character.identity.id,
    applicationId: analysis.application?.id ?? null,
    previousApplicationId: analysis.application?.id ?? null,
    rootTemplateId: analysis.rootTemplateId,
    resolvedTemplateIds: analysis.application?.resolvedTemplateIds ?? [],
    componentIds: analysis.application?.componentIds ?? emptyComponentIds(),
    choices: cloneValue(analysis.choices),
    packageComparison: cloneValue(analysis.packageComparison),
    planFingerprint: plan.planFingerprint,
  });
}

function normalizeRequest(input) {
  if (!isPlainObject(input)) {
    throw new Error("Template application operation input must be object");
  }
  const operation = input.operation ?? "apply";
  if (!OPERATIONS.includes(operation)) {
    throw new Error("Template application operation is invalid");
  }
  const hasChoices = Object.hasOwn(input, "choices");
  const choices = normalizeChoices(input.choices);

  if (operation === "apply") {
    return {
      operation,
      templateId: requiredString(
        input.templateId,
        "Template apply operation templateId must be non-empty string",
      ),
      applicationId: normalizeNullableString(input.applicationId),
      replacementTemplate: null,
      hasChoices,
      choices,
    };
  }

  const applicationId = requiredString(
    input.applicationId,
    "Template operation applicationId must be non-empty string",
  );
  if (operation === "remove") {
    return {
      operation,
      templateId: null,
      applicationId,
      replacementTemplate: null,
      hasChoices: false,
      choices: {},
    };
  }

  return {
    operation,
    templateId: null,
    applicationId,
    replacementTemplate: createTemplate(input.replacementTemplate ?? {}),
    hasChoices,
    choices,
  };
}

function serializeRequest(request) {
  return {
    operation: request.operation,
    templateId: request.templateId,
    applicationId: request.applicationId,
    replacementTemplate: request.replacementTemplate === null
      ? null
      : serializeTemplates([request.replacementTemplate])[0],
    hasChoices: request.hasChoices,
    choices: cloneValue(request.choices),
  };
}

function deserializeRequest(request) {
  return {
    operation: request.operation,
    templateId: request.templateId,
    applicationId: request.applicationId,
    replacementTemplate: request.replacementTemplate,
    ...(request.hasChoices ? { choices: request.choices } : {}),
  };
}

function determinePlannedApplicationId(analysis, request, options) {
  if (request.operation === "remove") return request.applicationId;
  const id = options.applicationId ?? request.applicationId ?? generateApplicationId();
  if (typeof id !== "string" || id === "") {
    throw new Error("Planned template application id must be non-empty string");
  }
  return id;
}

function assertApplicationIdAvailable(character, applicationId) {
  if (character.templateApplications.some(item => item.id === applicationId)) {
    throw new TemplateApplicationOperationError(
      "APPLICATION_ID_CONFLICT",
      "Template application id already exists",
      { applicationId },
    );
  }
}

function findTemplate(character, templateId) {
  return character.templates.find(item => item.id === templateId) ?? null;
}

function findApplication(character, applicationId) {
  return character.templateApplications.find(item => item.id === applicationId) ?? null;
}

function getActiveApplications(character) {
  return character.templateApplications.filter(item => item.status === "active");
}

function findActiveDependentApplications(character, application) {
  return getActiveApplications(character)
    .filter(candidate => candidate.id !== application.id)
    .filter(candidate => candidate.resolvedTemplateIds.includes(
      application.rootTemplateId,
    ))
    .map(candidate => candidate.id);
}

function findActiveFormDependencies(character, templateIds) {
  const ids = new Set(templateIds);
  const dependencies = [];
  for (const set of character.alternateFormSets ?? []) {
    const active = set.forms?.find(form => form.id === set.activeFormId) ?? null;
    if (active?.templateId && ids.has(active.templateId)) {
      dependencies.push({
        formSetId: set.id,
        formId: active.id,
        templateId: active.templateId,
      });
    }
  }
  return dependencies;
}

function resolutionReasons(resolution) {
  if (resolution.status === "blocked") return ["template-composition-blocked"];
  if (resolution.status === "pending") return ["template-composition-pending"];
  return [];
}

function createAnalysisFingerprint(analysis) {
  return canonicalStringify({
    operation: analysis.operation,
    status: analysis.status,
    rootTemplateId: analysis.rootTemplateId,
    template: analysis.template,
    application: analysis.application,
    resolution: analysis.resolution,
    compositionFingerprint: analysis.compositionFingerprint,
    overlapApplicationIds: analysis.overlapApplicationIds,
    activeDependentApplicationIds: analysis.activeDependentApplicationIds,
    activeFormDependencies: analysis.activeFormDependencies,
    choices: analysis.choices,
    packageComparison: analysis.packageComparison,
    reasons: analysis.reasons,
  });
}

function createPlanFingerprint(plan) {
  return canonicalStringify({
    operationId: plan.operationId,
    eventId: plan.eventId,
    characterId: plan.characterId,
    operation: plan.operation,
    applicationId: plan.applicationId,
    previousApplicationId: plan.previousApplicationId,
    rootTemplateId: plan.rootTemplateId,
    request: plan.request,
    choices: plan.choices,
    packageComparison: plan.packageComparison,
    analysisFingerprint: plan.analysisFingerprint,
  });
}

function createCompositionFingerprint(resolution, templates) {
  const snapshots = resolution.orderedTemplateIds.map(templateId => {
    const template = templates.find(item => item.id === templateId);
    return template === undefined ? null : serializeTemplates([template])[0];
  });
  return canonicalStringify({
    resolution: serializeResolvedTemplateComposition(resolution),
    templates: snapshots,
  });
}

function createTemplateFingerprintMap(templates, templateIds) {
  return new Map(templateIds.map(templateId => {
    const template = templates.find(item => item.id === templateId);
    return [
      templateId,
      template === undefined
        ? null
        : canonicalStringify(serializeTemplates([template])[0]),
    ];
  }));
}

function replaceTemplate(templates, replacement) {
  let found = false;
  const next = templates.map(template => {
    if (template.id !== replacement.id) return template;
    found = true;
    return replacement;
  });
  if (!found) next.push(replacement);
  return next;
}

function normalizeChoices(value) {
  if (value === undefined || value === null) return {};
  if (!isPlainObject(value)) {
    throw new Error("Template application choices must be object");
  }
  return cloneValue(value);
}

function validatePlan(plan) {
  if (!isPlainObject(plan)) throw new Error("Template application plan must be object");
  for (const key of [
    "id",
    "operationId",
    "eventId",
    "plannedAt",
    "characterId",
    "operation",
    "applicationId",
    "analysisFingerprint",
    "planFingerprint",
  ]) {
    requiredString(plan[key], `Template application plan ${key} is required`);
  }
  if (!OPERATIONS.includes(plan.operation)) {
    throw new Error("Template application plan operation is invalid");
  }
  if (!isPlainObject(plan.request) || !isPlainObject(plan.analysis)) {
    throw new Error("Template application plan snapshots are invalid");
  }
}

function validateCharacterShape(character) {
  if (!isPlainObject(character)) throw new Error("Character must be object");
  if (!isPlainObject(character.identity) || typeof character.identity.id !== "string") {
    throw new Error("Character identity.id must be string");
  }
  if (!Array.isArray(character.templates)) {
    throw new Error("Character templates must be array");
  }
  if (!Array.isArray(character.templateApplications)) {
    throw new Error("Character templateApplications must be array");
  }
  for (const key of TEMPLATE_COMPONENT_KEYS) {
    if (!Array.isArray(character[key])) {
      throw new Error(`Character ${key} must be array`);
    }
  }
}

function emptyComponentIds() {
  return Object.fromEntries(TEMPLATE_COMPONENT_KEYS.map(key => [key, []]));
}

function touchMetadata(metadata, updatedAt) {
  return { ...metadata, updatedAt };
}

function normalizeTimestamp(value) {
  if (value === undefined || value === null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "string" || value === "" || Number.isNaN(Date.parse(value))) {
    throw new Error("Template operation timestamp must be valid string, Date or null");
  }
  return value;
}

function normalizeNullableString(value) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("Template operation optional id must be string or null");
  }
  return value;
}

function requiredString(value, message) {
  if (typeof value !== "string" || value === "") throw new Error(message);
  return value;
}

function intersects(left, right) {
  const rightSet = new Set(right);
  return left.some(item => rightSet.has(item));
}

function unique(values) {
  return [...new Set(values)];
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, canonicalize(value[key])]),
    );
  }
  return value;
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generateOperationId() {
  return `template_operation_${Math.random().toString(36).slice(2, 10)}`;
}

function generatePlanId() {
  return `template_plan_${Math.random().toString(36).slice(2, 10)}`;
}

function generateApplicationId() {
  return `template_application_${Math.random().toString(36).slice(2, 10)}`;
}
