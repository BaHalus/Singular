export function mountCharacterMobileInteractionController(options = {}) {
  requirePlainObject(options, "Character mobile interaction options");
  requireFunction(options.commands?.adjustPoolCurrent, "Mobile pool command");
  requireFunction(options.commands?.setCharacterSummary, "Mobile character summary command");
  requireFunction(options.ui?.getState, "Mobile UI state reader");
  requireFunction(options.getMode, "Mobile mode reader");
  requireFunction(options.setMode, "Mobile mode writer");
  requireFunction(options.readCharacterSummary, "Mobile character summary reader");
  requireFunction(options.render, "Mobile render callback");
  requireFunction(options.syncMode, "Mobile mode sync callback");
  const root = options.root;
  if (!root || typeof root !== "object") {
    throw new Error("Mobile interaction root must be an object");
  }
  requireFunction(root.addEventListener, "Mobile interaction root addEventListener");

  const rerender = () => {
    options.render();
    options.syncMode();
  };

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null
      ? null
      : readDataset(actionTarget, "action");

    if (action === "mode-creation" || action === "mode-table") {
      event.preventDefault?.();
      options.setMode(action === "mode-creation" ? "creation" : "table");
      setStatus(root, "mode-changed");
      rerender();
      return null;
    }

    if (action === "character-summary-save") {
      event.preventDefault?.();
      if (options.getMode() !== "creation") {
        setStatus(root, "blocked-by-mode");
        return null;
      }
      if (options.ui.getState().busy) {
        setStatus(root, "busy");
        return null;
      }
      return applyResult(
        options.commands.setCharacterSummary(options.readCharacterSummary()),
        root,
        rerender,
      );
    }

    const poolTarget = findPoolTarget(event?.target);
    if (poolTarget === null) return null;
    event.preventDefault?.();
    if (options.ui.getState().busy) {
      setStatus(root, "busy");
      return null;
    }
    return applyResult(
      options.commands.adjustPoolCurrent({
        poolKey: readDataset(poolTarget, "poolKey"),
        delta: Number(readDataset(poolTarget, "poolAdjust")),
      }),
      root,
      rerender,
    );
  };

  root.addEventListener("click", handleClick);
  return Object.freeze({
    handleClick,
    destroy() {
      root.removeEventListener?.("click", handleClick);
    },
  });
}

function applyResult(result, root, rerender) {
  setStatus(root, result.status);
  if (["applied", "no-op"].includes(result.status)) rerender();
  return result;
}

function findPoolTarget(target) {
  let current = target ?? null;
  while (current !== null) {
    if (
      readDataset(current, "poolKey") !== null &&
      readDataset(current, "poolAdjust") !== null
    ) {
      return current;
    }
    current = current.parentElement ?? null;
  }
  return null;
}

function findDataTarget(target, key) {
  let current = target ?? null;
  while (current !== null) {
    if (readDataset(current, key) !== null) return current;
    current = current.parentElement ?? null;
  }
  return null;
}

function readDataset(target, key) {
  if (!target || typeof target !== "object") return null;
  const value = target.dataset?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

function setStatus(root, value) {
  root.setAttribute?.("data-last-command-status", value);
}

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} must be a function`);
  }
}

function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype &&
      Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}
