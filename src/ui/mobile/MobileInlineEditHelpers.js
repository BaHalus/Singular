export function findDataTarget(target, key) {
  let current = target ?? null;
  while (current !== null) {
    if (readDataset(current, key) !== null) return current;
    current = current.parentElement ?? null;
  }
  return null;
}

export function readDataset(target, key) {
  if (!target || typeof target !== "object") return null;
  const value = target.dataset?.[key];
  return typeof value === "string" && value !== "" ? value : null;
}

export function readInputValue(root, selector) {
  const input = root.querySelector?.(selector);
  return typeof input?.value === "string" ? input.value : "";
}

export function readNumberInputValue(root, selector, fallback) {
  const raw = readInputValue(root, selector);
  if (raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function normalizeOptionalText(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function escapeSelectorValue(value) {
  return String(value ?? "").replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function escapeTextContent(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function escapeAttribute(value) {
  return escapeTextContent(value).replaceAll('"', "&quot;");
}

export function renderTextareaText(value) {
  return `\n${escapeTextContent(value)}`;
}

export function appendInlineEditorToDefinitionListItem(html, {
  entityId,
  markerAttribute,
  editorRole,
  renderEditor,
  entryKind,
}) {
  const id = escapeAttribute(entityId);
  const markerIndex = findDefinitionListItemMarkerIndex(html, { markerAttribute, id, entryKind });
  if (markerIndex < 0) return html;

  const ddEnd = html.indexOf("</dd>", markerIndex);
  if (ddEnd < 0) return html;

  const existingMarker = `data-role="${editorRole}" ${markerAttribute}="${id}"`;
  const existingIndex = html.indexOf(existingMarker, markerIndex);
  if (existingIndex >= 0 && existingIndex < ddEnd) return html;

  return `${html.slice(0, ddEnd)}${renderEditor()}${html.slice(ddEnd)}`;
}

export function appendInlineEditorToDefinitionListItemNode(root, {
  entityId,
  markerAttribute,
  editorRole,
  renderEditor,
  entryKind,
}) {
  const selectorId = escapeSelectorValue(entityId);
  const selector = renderDefinitionListItemSelector({ markerAttribute, selectorId, entryKind });
  const item = root.querySelector?.(selector) ?? null;
  if (item === null) return false;

  const existing = item.querySelector?.(
    `[data-role="${escapeSelectorValue(editorRole)}"][${markerAttribute}="${selectorId}"]`,
  ) ?? null;
  if (existing !== null) return true;

  const documentRef = item.ownerDocument ?? root.ownerDocument ?? globalThis.document;
  const template = documentRef?.createElement?.("template") ?? null;
  if (template === null || typeof item.append !== "function") return false;

  template.innerHTML = renderEditor();
  item.append(...template.content.childNodes);
  return true;
}

function findDefinitionListItemMarkerIndex(html, { markerAttribute, id, entryKind }) {
  const canonicalMarker = `${markerAttribute}="${id}"`;
  let markerIndex = html.indexOf(canonicalMarker);
  while (markerIndex >= 0) {
    if (entryKind === undefined || definitionListItemHasEntryKind(html, markerIndex, entryKind)) {
      return markerIndex;
    }
    markerIndex = html.indexOf(canonicalMarker, markerIndex + canonicalMarker.length);
  }
  return -1;
}

function definitionListItemHasEntryKind(html, markerIndex, entryKind) {
  const itemStart = html.lastIndexOf("<", markerIndex);
  const itemOpeningEnd = html.indexOf(">", markerIndex);
  const itemEnd = html.indexOf("</dd>", markerIndex);
  if (itemStart < 0 || itemOpeningEnd < 0 || itemEnd < 0 || itemOpeningEnd > itemEnd) return false;
  const itemOpening = html.slice(itemStart, itemOpeningEnd + 1);
  return itemOpening.includes(`data-entry-kind="${escapeAttribute(entryKind)}"`);
}

function renderDefinitionListItemSelector({ markerAttribute, selectorId, entryKind }) {
  const canonicalSelector = `[${markerAttribute}="${selectorId}"]`;
  return entryKind === undefined
    ? canonicalSelector
    : `[data-entry-kind="${escapeSelectorValue(entryKind)}"]${canonicalSelector}`;
}

export function resolveMobileRoot(documentOption, errorMessage) {
  const documentRef = documentOption ?? globalThis.document;
  const root = documentRef?.querySelector?.("[data-singular-mobile-root]") ?? null;
  if (root === null) throw new Error(errorMessage);
  return root;
}

export function requirePlainObject(value, label) {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
}

export function splitTextList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  return value.split(",").map(item => item.trim()).filter(Boolean);
}
