export function createNotes(input = {}) {
  const normalizedInput = input ?? {};
  requirePlainObject(normalizedInput, "Notes input");

  const notes = {
    general: normalizeText(normalizedInput.general ?? "", "Notes general text"),
    structured: createStructuredNotes(normalizedInput.structured ?? []),
  };

  validateNotes(notes);
  return notes;
}

export function createStructuredNotes(input = []) {
  if (!Array.isArray(input)) {
    throw new Error("Structured notes must be an array");
  }
  const notes = input.map(createStructuredNote);
  validateStructuredNotes(notes);
  return notes;
}

export function createStructuredNote(input = {}) {
  requirePlainObject(input, "Structured note input");

  return {
    id: input.id ?? generateStructuredNoteId(),
    title: normalizeText(input.title ?? "", "Structured note title"),
    text: normalizeText(input.text ?? "", "Structured note text"),
    category: normalizeNullableText(input.category ?? null, "Structured note category"),
    reference: normalizeNullableText(input.reference ?? null, "Structured note reference"),
    tags: normalizeTags(input.tags ?? []),
    metadata: clonePortableRecord(input.metadata ?? {}),
  };
}

export function validateNotes(notes) {
  requirePlainObject(notes, "Notes");
  normalizeText(notes.general, "Notes general text");
  validateStructuredNotes(notes.structured);
  return true;
}

export function validateStructuredNotes(notes) {
  if (!Array.isArray(notes)) {
    throw new Error("Structured notes must be an array");
  }
  const ids = new Set();
  for (const note of notes) {
    validateStructuredNote(note);
    if (ids.has(note.id)) {
      throw new Error(`Duplicate structured note id: ${note.id}`);
    }
    ids.add(note.id);
  }
  return true;
}

export function validateStructuredNote(note) {
  requirePlainObject(note, "Structured note");
  normalizeEntityId(note.id, "Structured note id must be a non-empty string");
  normalizeText(note.title, "Structured note title");
  normalizeText(note.text, "Structured note text");
  normalizeNullableText(note.category, "Structured note category");
  normalizeNullableText(note.reference, "Structured note reference");
  normalizeTags(note.tags);
  clonePortableRecord(note.metadata);
  return true;
}

export function serializeNotes(notes) {
  validateNotes(notes);
  return {
    general: notes.general,
    structured: serializeStructuredNotes(notes.structured),
  };
}

export function serializeStructuredNotes(notes) {
  validateStructuredNotes(notes);
  return notes.map(serializeStructuredNote);
}

export function serializeStructuredNote(note) {
  validateStructuredNote(note);
  return {
    id: note.id,
    title: note.title,
    text: note.text,
    category: note.category,
    reference: note.reference,
    tags: [...note.tags],
    metadata: clonePortableRecord(note.metadata),
  };
}

function normalizeEntityId(value, message) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(message);
  }
  return value;
}

function normalizeText(value, label) {
  if (typeof value !== "string") {
    throw new Error(`${label} must be string`);
  }
  return value;
}

function normalizeNullableText(value, label) {
  if (value !== null && typeof value !== "string") {
    throw new Error(`${label} must be string or null`);
  }
  return value;
}

function normalizeTags(value) {
  if (!Array.isArray(value)) {
    throw new Error("Structured note tags must be an array");
  }
  return value.map((tag, index) => {
    if (typeof tag !== "string") {
      throw new Error(`Structured note tag[${index}] must be string`);
    }
    return tag;
  });
}

function clonePortableRecord(value) {
  requirePlainObject(value, "Structured note metadata");
  return clonePortableJson(value);
}

function clonePortableJson(value, seen = new WeakMap()) {
  if (value === null) return null;
  if (["string", "boolean"].includes(typeof value)) return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Structured note metadata numbers must be finite");
    }
    return value;
  }
  if (typeof value !== "object") {
    throw new Error("Structured note metadata must be JSON-portable");
  }
  if (seen.has(value)) {
    throw new Error("Structured note metadata must not contain cycles");
  }
  if (Array.isArray(value)) {
    const clone = [];
    seen.set(value, clone);
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw new Error("Structured note metadata arrays must not be sparse");
      }
      clone.push(clonePortableJson(value[index], seen));
    }
    seen.delete(value);
    return clone;
  }
  requirePlainObject(value, "Structured note metadata value");
  const clone = {};
  seen.set(value, clone);
  for (const [key, item] of Object.entries(value)) {
    if (item === undefined) {
      throw new Error("Structured note metadata must not contain undefined");
    }
    clone[key] = clonePortableJson(item, seen);
  }
  seen.delete(value);
  return clone;
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

function generateStructuredNoteId() {
  return `note_${Math.random().toString(36).slice(2, 10)}`;
}
