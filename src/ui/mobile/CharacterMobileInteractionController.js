export function mountCharacterMobileInteractionController(options = {}) {
  requirePlainObject(options, "Character mobile interaction options");
  requireFunction(options.commands?.adjustPoolCurrent, "Mobile pool command");
  requireFunction(options.commands?.setCharacterSummary, "Mobile character summary command");
  requireFunction(options.commands?.adjustAttributeBase, "Mobile attribute command");
  requireFunction(options.commands?.addAttack, "Mobile attack addition command");
  requireFunction(options.commands?.removeAttack, "Mobile attack removal command");
  requireFunction(options.commands?.reorderAttack, "Mobile attack reorder command");
  requireFunction(options.commands?.addEquipment, "Mobile equipment addition command");
  requireFunction(options.commands?.removeEquipment, "Mobile equipment removal command");
  requireFunction(options.commands?.reorderEquipment, "Mobile equipment reorder command");
  requireFunction(options.commands?.setEquipmentState, "Mobile equipment state command");
  requireFunction(options.commands?.addSpell, "Mobile spell addition command");
  requireFunction(options.commands?.removeSpell, "Mobile spell removal command");
  requireFunction(options.commands?.reorderSpell, "Mobile spell reorder command");
  requireFunction(options.commands?.addTrait, "Mobile trait addition command");
  requireFunction(options.commands?.removeTrait, "Mobile trait removal command");
  requireFunction(options.commands?.reorderTrait, "Mobile trait reorder command");
  requireFunction(options.ui?.getState, "Mobile UI state reader");
  requireFunction(options.getMode, "Mobile mode reader");
  requireFunction(options.setMode, "Mobile mode writer");
  requireFunction(options.readCharacterSummary, "Mobile character summary reader");
  requireFunction(options.readAttackDraft, "Mobile attack draft reader");
  requireFunction(options.readEquipmentDraft, "Mobile equipment draft reader");
  requireFunction(options.readSpellDraft, "Mobile spell draft reader");
  requireFunction(options.readTraitDraft, "Mobile trait draft reader");
  requireFunction(options.render, "Mobile render callback");
  requireFunction(options.syncMode, "Mobile mode sync callback");
  const powerCommands = createOptionalPowerCommands(options.commands);
  const powerReaders = createOptionalPowerReaders(options);
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

    if (["attack-add", "attack-remove", "attack-reorder"].includes(action)) {
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

    if (["equipment-add", "equipment-remove", "equipment-reorder", "equipment-state-set"].includes(action)) {
      event.preventDefault?.();
      if (structuralActionBlocked(options, root)) return null;

      if (action === "equipment-add") {
        return applyResult(
          options.commands.addEquipment(options.readEquipmentDraft()),
          root,
          rerender,
        );
      }

      const itemId = readDataset(actionTarget, "equipmentId");
      if (action === "equipment-remove") {
        return applyResult(
          options.commands.removeEquipment({ itemId }),
          root,
          rerender,
        );
      }

      if (action === "equipment-state-set") {
        return applyResult(
          options.commands.setEquipmentState({
            itemId,
            state: readDataset(actionTarget, "equipmentState"),
          }),
          root,
          rerender,
        );
      }

      const targetIndexValue = readDataset(actionTarget, "targetIndex");
      return applyResult(
        options.commands.reorderEquipment({
          itemId,
          targetIndex: targetIndexValue === null
            ? Number.NaN
            : Number(targetIndexValue),
        }),
        root,
        rerender,
      );
    }

    if (["spell-add", "spell-remove", "spell-reorder"].includes(action)) {
      event.preventDefault?.();
      if (structuralActionBlocked(options, root)) return null;

      if (action === "spell-add") {
        return applyResult(
          options.commands.addSpell(options.readSpellDraft()),
          root,
          rerender,
        );
      }

      const spellId = readDataset(actionTarget, "spellId");
      if (action === "spell-remove") {
        return applyResult(
          options.commands.removeSpell({ spellId }),
          root,
          rerender,
        );
      }

      const targetIndexValue = readDataset(actionTarget, "targetIndex");
      return applyResult(
        options.commands.reorderSpell({
          spellId,
          targetIndex: targetIndexValue === null
            ? Number.NaN
            : Number(targetIndexValue),
        }),
        root,
        rerender,
      );
    }

    if (["trait-add", "trait-remove", "trait-reorder"].includes(action)) {
      event.preventDefault?.();
      if (structuralActionBlocked(options, root)) return null;

      if (action === "trait-add") {
        return applyResult(
          options.commands.addTrait(options.readTraitDraft()),
          root,
          rerender,
        );
      }

      const traitId = readDataset(actionTarget, "traitId");
      if (action === "trait-remove") {
        return applyResult(
          options.commands.removeTrait({ traitId }),
          root,
          rerender,
        );
      }

      const targetIndexValue = readDataset(actionTarget, "targetIndex");
      return applyResult(
        options.commands.reorderTrait({
          traitId,
          targetIndex: targetIndexValue === null
            ? Number.NaN
            : Number(targetIndexValue),
        }),
        root,
        rerender,
      );
    }

    if (["power-add", "power-rename", "power-remove"].includes(action)) {
      event.preventDefault?.();
      if (structuralActionBlocked(options, root)) return null;

      if (action === "power-add") {
        return applyResult(
          powerCommands.addPower(powerReaders.readPowerDraft()),
          root,
          rerender,
        );
      }

      const powerId = readDataset(actionTarget, "powerId");
      if (action === "power-remove") {
        return applyResult(
          powerCommands.removePower({ powerId }),
          root,
          rerender,
        );
      }

      return applyResult(
        powerCommands.renamePower(powerReaders.readPowerRenameDraft(powerId)),
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

function createOptionalPowerCommands(commands) {
  return Object.freeze({
    addPower: optionalFunction(commands?.addPower, "Mobile power addition command"),
    renamePower: optionalFunction(commands?.renamePower, "Mobile power rename command"),
    removePower: optionalFunction(commands?.removePower, "Mobile power removal command"),
  });
}

function createOptionalPowerReaders(options) {
  return Object.freeze({
    readPowerDraft: optionalFunction(options.readPowerDraft, "Mobile power draft reader"),
    readPowerRenameDraft: optionalFunction(
      options.readPowerRenameDraft,
      "Mobile power rename reader",
    ),
  });
}

function optionalFunction(value, label) {
  if (value === undefined || value === null) {
    return () => {
      throw new Error(`${label} must be a function`);
    };
  }
  requireFunction(value, label);
  return value;
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
