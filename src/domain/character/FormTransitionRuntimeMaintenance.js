import { consumeFormTransitionCosts } from "./FormTransitionExecutorResources.js";

export function processFormTransitionMaintenance(character, runtime, evaluation) {
  if (evaluation.dueMaintenance.length === 0) {
    return {
      success: true,
      pools: character.pools,
      maintenance: runtime.maintenance,
      consumedResources: [],
      error: null,
    };
  }

  const costs = evaluation.dueMaintenance.map(entry => ({
    id: entry.costId,
    resource: entry.resource,
    resourceKey: entry.resourceKey,
    amount: entry.dueAmount,
  }));

  try {
    const consumed = consumeFormTransitionCosts(character, costs);
    const dueById = new Map(
      evaluation.dueMaintenance.map(entry => [entry.costId, entry]),
    );
    const maintenance = runtime.maintenance.map(entry => {
      const due = dueById.get(entry.costId);
      if (!due) return entry;
      const lastChargedAt = addSeconds(
        runtime.startedAt,
        due.totalIntervals * entry.intervalSeconds,
      );
      return {
        ...entry,
        chargedIntervals: due.totalIntervals,
        lastChargedAt,
        nextDueAt: addSeconds(lastChargedAt, entry.intervalSeconds),
      };
    });

    return {
      success: true,
      pools: consumed.pools,
      maintenance,
      consumedResources: consumed.consumedResources,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      pools: character.pools,
      maintenance: runtime.maintenance,
      consumedResources: [],
      error: {
        code: "MAINTENANCE_PAYMENT_FAILED",
        message: error.message,
      },
    };
  }
}

function addSeconds(timestamp, seconds) {
  return new Date(Date.parse(timestamp) + seconds * 1000).toISOString();
}
