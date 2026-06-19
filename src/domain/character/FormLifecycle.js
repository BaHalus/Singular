import {
  advanceFormTransitionRuntime,
} from "./FormTransitionRuntimeEngine.js";
import {
  planFormTransition,
} from "./FormTransitionPlanner.js";
import {
  executeFormTransition,
} from "./FormTransitionExecutor.js";

export function advanceFormLifecycle(
  character,
  formSetId,
  context = {},
  options = {},
) {
  const advanced = advanceFormTransitionRuntime(
    character,
    formSetId,
    context,
  );

  if (options.executeReadyReturn !== true) {
    return {
      ...advanced,
      execution: null,
      executionStatus: advanced.returnPlan === null
        ? "not-requested"
        : "prepared",
    };
  }

  if (advanced.returnPlan === null) {
    return {
      ...advanced,
      execution: null,
      executionStatus: "not-requested",
    };
  }

  const executionContext = mergeContext(
    {
      ...context,
      intent: advanced.returnPlan.intent,
      bypassReturnTriggers: advanced.returnPlan.bypassReturnTriggers,
    },
    options.executionOptions?.context,
  );
  const executablePlan = planFormTransition(
    advanced.character,
    advanced.returnPlan.formSetId,
    advanced.returnPlan.targetFormId,
    executionContext,
  );

  if (!executablePlan.allowed || executablePlan.status !== "ready") {
    return {
      character: advanced.character,
      report: advanced.report,
      returnPlan: executablePlan,
      execution: null,
      executionStatus: "not-ready",
    };
  }

  const executionOptions = {
    ...(options.executionOptions ?? {}),
    now: options.executionOptions?.now ?? context.now,
    context: executionContext,
  };
  const execution = executeFormTransition(
    advanced.character,
    executablePlan,
    executionOptions,
  );

  return {
    character: execution.character,
    report: advanced.report,
    returnPlan: executablePlan,
    execution,
    executionStatus: "executed",
  };
}

export function advanceAllFormLifecycles(
  character,
  context = {},
  options = {},
) {
  let current = character;
  const results = [];

  for (const set of character.alternateFormSets) {
    const perSetOptions = {
      executeReadyReturn: options.executeReadyReturns === true,
      executionOptions: {
        ...(options.executionOptions ?? {}),
        ...(options.executionOptionsBySet?.[set.id] ?? {}),
      },
    };
    const result = advanceFormLifecycle(
      current,
      set.id,
      context,
      perSetOptions,
    );

    current = result.character;
    results.push({
      formSetId: set.id,
      report: result.report,
      returnPlan: result.returnPlan,
      execution: result.execution,
      executionStatus: result.executionStatus,
    });
  }

  return {
    character: current,
    results,
    executions: results
      .filter(result => result.execution !== null)
      .map(result => result.execution),
    pendingReturnPlans: results
      .filter(result => (
        result.returnPlan !== null &&
        result.execution === null
      ))
      .map(result => result.returnPlan),
  };
}

function mergeContext(base, override) {
  if (override === undefined || override === null) return base;

  if (!isPlainObject(override)) {
    throw new Error("Form lifecycle execution context must be object");
  }

  const result = {
    ...base,
    ...override,
  };

  for (const key of [
    "testResults",
    "requirementResults",
    "triggerResults",
    "impedimentResults",
    "resources",
  ]) {
    if (base[key] !== undefined || override[key] !== undefined) {
      result[key] = {
        ...(base[key] ?? {}),
        ...(override[key] ?? {}),
      };
    }
  }

  return result;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
