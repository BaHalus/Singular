export function createCharacterMobilePostRenderLifecycle() {
  const entries = [];
  let active = true;

  return Object.freeze({
    register(enhancer) {
      requireFunction(enhancer, "Mobile post-render enhancer");
      if (!active) {
        throw new Error("Mobile post-render lifecycle is not active");
      }

      const entry = Object.freeze({ enhancer });
      entries.push(entry);
      let registered = true;

      return function unregister() {
        if (!registered) return false;
        registered = false;
        const index = entries.indexOf(entry);
        if (index < 0) return false;
        entries.splice(index, 1);
        return true;
      };
    },

    run(context) {
      requireContext(context);
      if (!active) return Object.freeze({ executed: 0 });

      const currentContext = Object.freeze({
        root: context.root,
        character: context.character,
        session: context.session,
        mode: context.mode,
      });
      const errors = [];
      let executed = 0;

      for (const entry of [...entries]) {
        if (!entries.includes(entry)) continue;
        try {
          entry.enhancer(currentContext);
          executed += 1;
        } catch (error) {
          errors.push(error);
        }
      }

      if (errors.length > 0) {
        throw new AggregateError(errors, "Mobile post-render enhancer failure");
      }

      return Object.freeze({ executed });
    },

    get size() {
      return entries.length;
    },

    destroy() {
      if (!active) return;
      active = false;
      entries.length = 0;
    },
  });
}

function requireContext(context) {
  if (context === null || typeof context !== "object" || Array.isArray(context)) {
    throw new Error("Mobile post-render context must be an object");
  }
  if (context.root === null || typeof context.root !== "object") {
    throw new Error("Mobile post-render context root must be an object");
  }
  if (context.session === null || typeof context.session !== "object") {
    throw new Error("Mobile post-render context session must be an object");
  }
  if (context.character === null || typeof context.character !== "object") {
    throw new Error("Mobile post-render context character must be an object");
  }
  if (context.mode !== "creation" && context.mode !== "table") {
    throw new Error("Mobile post-render context mode must be creation or table");
  }
}

function requireFunction(value, label) {
  if (typeof value !== "function") {
    throw new Error(`${label} must be a function`);
  }
}
