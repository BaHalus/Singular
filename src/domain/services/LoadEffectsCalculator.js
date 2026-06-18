const LOAD_EFFECTS = {
  0: { moveMultiplier: 1.0, dodgePenalty: 0 },
  1: { moveMultiplier: 0.8, dodgePenalty: -1 },
  2: { moveMultiplier: 0.6, dodgePenalty: -2 },
  3: { moveMultiplier: 0.4, dodgePenalty: -3 },
  4: { moveMultiplier: 0.2, dodgePenalty: -4 },
};

export function calculateLoadEffects({ basicMove, dodge, encumbranceLevel }) {
  assertNumber(basicMove, "basicMove must be number");
  assertNumber(dodge, "dodge must be number");
  assertInteger(encumbranceLevel, "encumbranceLevel must be integer");

  if (basicMove < 0) {
    throw new Error("basicMove must be non-negative");
  }

  const effect = getLoadEffect(encumbranceLevel);

  return {
    encumbranceLevel,
    moveMultiplier: effect.moveMultiplier,
    effectiveMove: Math.floor(basicMove * effect.moveMultiplier),
    dodgePenalty: effect.dodgePenalty,
    effectiveDodge: dodge + effect.dodgePenalty,
  };
}

export function getLoadEffect(encumbranceLevel) {
  assertInteger(encumbranceLevel, "encumbranceLevel must be integer");

  if (!Object.hasOwn(LOAD_EFFECTS, encumbranceLevel)) {
    throw new Error("encumbranceLevel must be between 0 and 4");
  }

  return { ...LOAD_EFFECTS[encumbranceLevel] };
}

function assertNumber(value, message) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(message);
  }
}

function assertInteger(value, message) {
  if (!Number.isInteger(value)) {
    throw new Error(message);
  }
}
