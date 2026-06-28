import {
  createCharacter,
  serializeCharacter,
} from "../../domain/character/Character.js";
import { serializeNotes } from "../../domain/character/Notes.js";
import {
  addStructuredNote,
  findStructuredNoteById,
  removeStructuredNote,
  reorderStructuredNote,
  setGeneralNotes,
  updateStructuredNote,
} from "../../domain/character/NotesOperations.js";

export const NOTES_COMMAND_TYPES = Object.freeze({
  SET_GENERAL: "notes.general.set",
  ADD_STRUCTURED: "note.add",
  UPDATE_STRUCTURED: "note.update",
  REMOVE_STRUCTURED: "note.remove",
  REORDER_STRUCTURED: "note.reorder",
});

export function createNotesCommandHandlerEntries() {
  return Object.freeze([
    Object.freeze({ type: NOTES_COMMAND_TYPES.SET_GENERAL, handler: handleSetGeneralNotesCommand }),
    Object.freeze({ type: NOTES_COMMAND_TYPES.ADD_STRUCTURED, handler: handleAddStructuredNoteCommand }),
    Object.freeze({ type: NOTES_COMMAND_TYPES.UPDATE_STRUCTURED, handler: handleUpdateStructuredNoteCommand }),
    Object.freeze({ type: NOTES_COMMAND_TYPES.REMOVE_STRUCTURED, handler: handleRemoveStructuredNoteCommand }),
    Object.freeze({ type: NOTES_COMMAND_TYPES.REORDER_STRUCTURED, handler: handleReorderStructuredNoteCommand }),
  ]);
}

export function handleSetGeneralNotesCommand(context) {
  const { session, command } = validateCommandContext(context, NOTES_COMMAND_TYPES.SET_GENERAL);
  validateExactPayloadKeys(command.payload, ["text"]);
  const previousText = session.character.notes.general;
  const notes = setGeneralNotes(session.character.notes, command.payload.text);
  if (notes === session.character.notes) {
    return noOpResult("set-general-notes-no-op", {}, "unchanged-general-notes");
  }
  return appliedResult(session.character, notes, {
    operation: "set-general-notes",
    previousLength: previousText.length,
    length: notes.general.length,
  });
}

export function handleAddStructuredNoteCommand(context) {
  const { session, command } = validateCommandContext(context, NOTES_COMMAND_TYPES.ADD_STRUCTURED);
  validateExactPayloadKeys(command.payload, ["note"]);
  const notes = addStructuredNote(session.character.notes, command.payload.note);
  const added = notes.structured.at(-1);
  return appliedResult(session.character, notes, {
    operation: "add-structured-note",
    noteId: added.id,
    index: notes.structured.length - 1,
  });
}

export function handleUpdateStructuredNoteCommand(context) {
  const { session, command } = validateCommandContext(context, NOTES_COMMAND_TYPES.UPDATE_STRUCTURED);
  validateExactPayloadKeys(command.payload, ["noteId", "patch"]);
  const noteId = normalizeNoteId(command.payload.noteId);
  const previous = findStructuredNoteById(session.character.notes, noteId);
  const notes = updateStructuredNote(session.character.notes, noteId, command.payload.patch);
  const current = findStructuredNoteById(notes, noteId);
  if (portableEqual(previous, current)) {
    return noOpResult("update-structured-note-no-op", { noteId }, "unchanged-structured-note");
  }
  return appliedResult(session.character, notes, {
    operation: "update-structured-note",
    noteId,
    index: notes.structured.findIndex(note => note.id === noteId),
  });
}

export function handleRemoveStructuredNoteCommand(context) {
  const { session, command } = validateCommandContext(context, NOTES_COMMAND_TYPES.REMOVE_STRUCTURED);
  validateExactPayloadKeys(command.payload, ["noteId"]);
  const noteId = normalizeNoteId(command.payload.noteId);
  const previous = findStructuredNoteById(session.character.notes, noteId);
  const previousIndex = session.character.notes.structured.findIndex(note => note.id === noteId);
  const notes = removeStructuredNote(session.character.notes, noteId);
  return appliedResult(session.character, notes, {
    operation: "remove-structured-note",
    noteId,
    title: previous.title,
    previousIndex,
  });
}

export function handleReorderStructuredNoteCommand(context) {
  const { session, command } = validateCommandContext(context, NOTES_COMMAND_TYPES.REORDER_STRUCTURED);
  validateExactPayloadKeys(command.payload, ["noteId", "targetIndex"]);
  const noteId = normalizeNoteId(command.payload.noteId);
  const previousIndex = session.character.notes.structured.findIndex(note => note.id === noteId);
  const notes = reorderStructuredNote(session.character.notes, noteId, command.payload.targetIndex);
  if (notes === session.character.notes) {
    return noOpResult("reorder-structured-note-no-op", { noteId }, "already-at-index");
  }
  return appliedResult(session.character, notes, {
    operation: "reorder-structured-note",
    noteId,
    previousIndex,
    targetIndex: command.payload.targetIndex,
  });
}

function appliedResult(character, notes, receipt) {
  const snapshot = serializeCharacter(character);
  return {
    status: "applied",
    character: createCharacter({
      ...snapshot,
      notes: serializeNotes(notes),
    }),
    receipt,
    diagnostics: [],
  };
}

function noOpResult(operation, ids, reason) {
  return { status: "no-op", receipt: { operation, ...ids, reason }, diagnostics: [] };
}

function validateCommandContext(context, expectedType) {
  requirePlainObject(context, "Notes command context");
  requirePlainObject(context.session, "Notes command session");
  requirePlainObject(context.command, "Notes command");
  if (context.command.type !== expectedType) {
    throw new Error(`Notes command type must be ${expectedType}`);
  }
  requirePlainObject(context.command.payload, "Notes command payload");
  requirePlainObject(context.session.character, "Notes command Character");
  requirePlainObject(context.session.character.notes, "Notes command Character notes");
  if (!Array.isArray(context.session.character.notes.structured)) {
    throw new Error("Notes command Character structured notes must be an array");
  }
  return context;
}

function validateExactPayloadKeys(payload, expectedKeys) {
  const keys = Reflect.ownKeys(payload);
  if (keys.length !== expectedKeys.length || keys.some(key => typeof key !== "string" || !expectedKeys.includes(key))) {
    throw new Error("Notes command payload contains unsupported properties");
  }
}

function normalizeNoteId(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error("Notes command noteId must be a non-empty string");
  }
  return value;
}

function portableEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (left === null || right === null) return false;
  if (typeof left !== "object" || typeof right !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return left.length === right.length && left.every((item, index) => portableEqual(item, right[index]));
  }
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length && leftKeys.every((key, index) => key === rightKeys[index] && portableEqual(left[key], right[key]));
}

function requirePlainObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value) || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new Error(`${label} must be a plain object`);
  }
}
