import { validateIdGenerator } from "../../application/ports/RuntimePorts.js";

export function createCryptoIdGenerator(options = {}) {
  if (
    options === null ||
    typeof options !== "object" ||
    Array.isArray(options)
  ) {
    throw new Error("Crypto ID generator options must be a plain object");
  }

  const cryptoRef = options.crypto ?? globalThis.crypto;
  const randomUUID = options.randomUUID ?? cryptoRef?.randomUUID?.bind(cryptoRef);
  if (typeof randomUUID !== "function") {
    throw new Error("Crypto ID generator requires randomUUID");
  }

  const generator = {
    next(prefix) {
      if (typeof prefix !== "string" || prefix.trim() === "") {
        throw new Error("Crypto ID prefix must be a non-empty string");
      }
      const id = randomUUID();
      if (typeof id !== "string" || id.trim() === "") {
        throw new Error("Crypto randomUUID must return a non-empty string");
      }
      return `${prefix}:${id}`;
    },
  };

  validateIdGenerator(generator);
  return Object.freeze(generator);
}
