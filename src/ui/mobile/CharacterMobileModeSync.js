export function createCharacterMobileModeSync(options = {}) {
  requirePlainObject(options, "Character mobile mode sync options");
  requireFunction(options.getMode, "Character mobile mode reader");
  const root = options.root;
  if (!root || typeof root !== "object") {
    throw new Error("Character mobile mode sync root must be an object");
  }

  const sync = () => {
    const mode = options.getMode();
    root.setAttribute?.("data-mode", mode);
    root.querySelector?.(".singular-mobile-sheet")?.setAttribute?.("data-mode", mode);
    const editor = root.querySelector?.('[data-role="character-summary-editor"]');
    editor?.setAttribute?.("aria-hidden", mode === "table" ? "true" : "false");
    for (const button of root.querySelectorAll?.('[data-action^="mode-"]') ?? []) {
      const action = button.dataset?.action;
      button.setAttribute?.(
        "aria-pressed",
        action === `mode-${mode}` ? "true" : "false",
      );
    }
  };

  const Observer = options.MutationObserver ?? globalThis.MutationObserver;
  const observer = typeof Observer === "function" ? new Observer(sync) : null;
  observer?.observe(root, { childList: true });
  sync();

  return Object.freeze({
    sync,
    destroy() {
      observer?.disconnect();
    },
  });
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
