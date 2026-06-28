import {
  createStructuredNote,
  serializeStructuredNote,
  serializeStructuredNotes,
  validateNotes,
  validateStructuredNotes,
} from "./Notes.js";

const STRUCTURED_NOTE_PATCH_KEYS = Object.freeze([
  "title",
  "text",
  "category",
  "reference",
  "tags",
  "metadata",
]);

export function setGeneralNotes(notes, text) {
  validateNotes(notes);
  if (typeof text !== "string") {
    throw new Error("General notes text must be string");
  }
  if (notes.general === text) return notes;
  return {
    ...notes,
    general: text,
    structured: serializeStructuredNotes(notes.structured),
  };
}

export function addStructuredNote(notes, input) {
  validateNotes(notes);
  const note = createStructuredNote(input);
  assertUniqueStructuredNoteId(notes.structured, note.id);
  return {
    ...notes,
    structured: [...serializeStructuredNotes(notes.structured), serializeStructuredNote(note)],
  };
}

export function updateStructuredNote(notes, noteId, patch) {
  validateNotes(notes);
  const id = normalizeNoteId(noteId);
  requirePlainObject(patch, "Structured note patch");
  validatePatchKeys(patch);

  let updated = false;
  const structured = notes.structured.map(note => {
    if (note.id !== id) return serializeStructuredNote(note);
    updated = true;
    return createStructuredNote({
      ...serializeStructuredNote(note),
      ...patch,
      id,
    });
  });

  if (!updated) {
    throw new Error(`Structured note not found: ${id}`);
  }
  return { ...notes, structured: serializeStructuredNotes(structured) };
}

export function removeStructuredNote(notes, noteId) {
  validateNotes(notes);
  const id = normalizeNoteId(noteId);
  const structured = notes.structured.filter(note => note.id !== id);
  if (structured.length === notes.structured.length) {
    throw new Error(`Structured note not found: ${id}`);
  }
  return { ...notes, structured: serializeStructuredNotes(structured) };
}

export function reorderStructuredNote(notes, noteId, targetIndex) {
  validateNotes(notes);
  const id = normalizeNoteId(noteId);
  if (!Number.isSafeInteger(targetIndex) || targetIndex < 0) {
    throw new Error("Structured note targetIndex must be a non-negative safe integer");
  }

  const currentIndex = notes.structured.findIndex(note => note.id === id);
  if (currentIndex === -1) {
    throw new Error(`Structured note not found: ${id}`);
  }
  if (targetIndex >= notes.structured.length) {
    throw new Error("Structured note targetIndex is out of bounds");
  }
  if (currentIndex === targetIndex) return notes;

  const structured = serializeStructuredNotes(notes.structured);
  const [note] = structured.splice(currentIndex, 1);
  structured.splice(targetIndex, 0, note);
  return { ...notes, structured };
}

export function findStructuredNoteById(notes, noteId) {
  validateNotes(notes);
  const id = normalizeNoteId(noteId);
  const note = notes.structured.find(item => item.id === id) ?? null;
  if (note === null) {
    throw new Error(`Structured note not found: ${id}`);
  }
  return note;
}

function assertUniqueStructuredNoteId(notes, noteId) {
  validateStructuredNotes(notes);
  if (notes.some(note => note.id === noteId)) {
    throw new Error(`Duplicate structured note id: ${noteId}`);
  }
}

function validatePatchKeys(patch) {
  const keys = Reflect.ownKeys(patch);
  if (keys.length === 0) {
    throw new Error("Structured note patch must not be empty");
  }
  if (keys.some(key => typeof key !== "string" || !STRUCTURED_NOTE_PATCH_KEYS.includes(key))) {
    throw new Error("Structured note patch contains unsupported properties");
  }
}

function normalizeNoteId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Structured note id must be a non-empty string");
  }
  return value;
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
