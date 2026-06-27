export function mountCharacterMobileInteractionController(options = {}) {
  requirePlainObject(options, "Character mobile interaction options");
  requireFunction(options.commands?.adjustPoolCurrent, "Mobile pool command");
  requireFunction(options.commands?.setCharacterSummary, "Mobile character summary command");
  requireFunction(options.commands?.adjustAttributeBase, "Mobile attribute command");
  requireFunction(options.commands?.addAttack, "Mobile attack addition command");
  requireFunction(options.commands?.updateAttack, "Mobile attack update command");
  requireFunction(options.commands?.removeAttack, "Mobile attack removal command");
  requireFunction(options.commands?.reorderAttack, "Mobile attack reorder command");
  requireFunction(options.ui?.getState, "Mobile UI state reader");
  requireFunction(options.getMode, "Mobile mode reader");
  requireFunction(options.setMode, "Mobile mode writer");
  requireFunction(options.readCharacterSummary, "Mobile character summary reader");
  requireFunction(options.readAttackDraft, "Mobile attack draft reader");
  requireFunction(options.readAttackPatch, "Mobile attack patch reader");
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
      if (options.ui.getState().busy) {
        setModeStatus(root, "busy");
        return null;
      }
      const nextMode = action === "mode-creation" ? "creation" : "table";
      if (options.getMode() === nextMode) {
        setModeStatus(root, "unchanged");
        return Object.freeze({ status: "unchanged", mode: nextMode });
      }
      options.setMode(nextMode);
      setModeStatus(root, "applied");
      setCommandStatus(root, "mode-changed");
      rerender();
      return Object.freeze({ status: "applied", mode: nextMode });
    }

    if (action === "character-summary-save") {
      event.preventDefault?.();
      if (structuralActionBlocked(options, root)) return null;
      return applyResult(
        options.commands.setCharacterSummary(options.readCharacterSummary()),
        root,
        rerender,
      );
    }

    if (["attack-add", "attack-update", "attack-remove", "attack-reorder"].includes(action)) {
      event.preventDefault?.();
      if (structuralActionBlocked(options, root)) return null;

      if (action === "attack-add") {
        return applyResult(
          options.commands.addAttack(options.readAttackDraft()),
          root,
          rerender,
        );
      }

      const attackId = readDataset(actionTarget, "attackId");
      if (action === "attack-update") {
        const editorTarget = findDataTarget(actionTarget, "attackEditId");
        if (
          editorTarget === null ||
          readDataset(editorTarget, "attackEditId") !== attackId
        ) {
          setCommandStatus(root, "invalid-control");
          return null;
        }
        return applyResult(
          options.commands.updateAttack({
            attackId,
            ...options.readAttackPatch(editorTarget),
          }),
          root,
          rerender,
        );
      }

      if (action === "attack-remove") {
        return applyResult(
          options.commands.removeAttack({ attackId }),
          root,
          rerender,
        );
      }

      const targetIndexValue = readDataset(actionTarget, "targetIndex");
      return applyResult(
        options.commands.reorderAttack({
          attackId,
          targetIndex: targetIndexValue === null
            ? Number.NaN
            : Number(targetIndexValue),
        }),
        root,
        rerender,
      );
    }

    const attributeTarget = findAttributeTarget(event?.target);
    if (attributeTarget !== null) {
      event.preventDefault?.();
      if (structuralActionBlocked(options, root)) return null;
      return applyResult(
        options.commands.adjustAttributeBase({
          attributeKey: readDataset(attributeTarget, "attributeKey"),
          delta: Number(readDataset(attributeTarget, "attributeAdjust")),
        }),
        root,
        rerender,
      );
    }

    const poolTarget = findPoolTarget(event?.target);
    if (poolTarget === null) return null;
    event.preventDefault?.();
    if (options.ui.getState().busy) {
      setCommandStatus(root, "busy");
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

function structuralActionBlocked(options, root) {
  if (options.getMode() !== "creation") {
    setCommandStatus(root, "blocked-by-mode");
    return true;
  }
  if (options.ui.getState().busy) {
    setCommandStatus(root, "busy");
    return true;
  }
  return false;
}

function applyResult(result, root, rerender) {
  setCommandStatus(root, result.status);
  if (["applied", "no-op"].includes(result.status)) rerender();
  return result;
}

function findAttributeTarget(target) {
  let current = target ?? null;
  while (current !== null) {
    if (
      readDataset(current, "attributeKey") !== null &&
      readDataset(current, "attributeAdjust") !== null
    ) {
      return current;
    }
    current = current.parentElement ?? null;
  }
  return null;
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

function setCommandStatus(root, value) {
  root.setAttribute?.("data-last-command-status", value);
}

function setModeStatus(root, value) {
  root.setAttribute?.("data-last-mode-status", value);
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
