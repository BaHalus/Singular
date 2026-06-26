import { validateClock } from "../../application/ports/RuntimePorts.js";

export function createSystemClock(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new Error("System clock options must be a plain object");
  }

  const nowProvider = options.nowProvider ?? (() => new Date());
  if (typeof nowProvider !== "function") {
    throw new Error("System clock nowProvider must be a function");
  }

  const clock = {
    now() {
      return nowProvider();
    },
  };

  validateClock(clock);
  return Object.freeze(clock);
}
