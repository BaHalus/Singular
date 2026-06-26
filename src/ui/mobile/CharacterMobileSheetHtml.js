import {
  serializeCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";

const HTML_SHELL_SCHEMA_VERSION = 3;

/**
 * Renderiza o shell HTML portátil para a ficha mobile.
 *
 * Esta camada não calcula regra, nível, ponto, carga ou derivado de GURPS.
 * Ela apenas transforma um render model já validado em marcação semântica.
 */
export function renderCharacterMobileSheetHtml(renderModel, options = {}) {
  const model = serializeCharacterMobileSheetRenderModel(renderModel);
  const shellMode = normalizeMode(options.mode ?? "creation");

  return [
    `<article class="singular-mobile-sheet" data-schema-version="${HTML_SHELL_SCHEMA_VERSION}" data-mode="${shellMode}">`,
    renderToolbar(model.toolbar, shellMode),
    renderSummary(model.summary),
    renderCards(model.cards, shellMode),
    renderSections(model.sections),
    "</article>",
  ].join("");
}

export function getCharacterMobileSheetHtmlSchemaVersion() {
  return HTML_SHELL_SCHEMA_VERSION;
}

function renderToolbar(toolbar, mode) {
  const actions = toolbar.actions
    .map(action => [
      `<button type="button" class="singular-mobile-sheet__action"`,
      ` data-action="${escapeAttribute(action.id)}"`,
      ` data-status="${escapeAttribute(action.status)}"`,
      action.id === `mode-${mode}` ? " aria-pressed=\"true\"" : "",
      ">",
      escapeText(action.label),
      "</button>",
    ].join(""))
    .join("");

  return [
    "<header class=\"singular-mobile-sheet__toolbar\">",
    `<h1 class="singular-mobile-sheet__title">${escapeText(toolbar.title)}</h1>`,
    `<nav class="singular-mobile-sheet__actions" aria-label="Ações da ficha">${actions}</nav>`,
    "</header>",
  ].join("");
}

function renderSummary(summary) {
  return [
    "<section class=\"singular-mobile-sheet__summary\" aria-label=\"Resumo\">",
    renderIdentitySummary(summary.identity),
    renderAttributeStrip(summary.attributes),
    renderPoolStrip(summary.pools),
    "</section>",
  ].join("");
}

function renderIdentitySummary(items) {
  return [
    "<div class=\"singular-mobile-sheet__identity-summary\">",
    items.map(renderTextItem).join(""),
    "</div>",
  ].join("");
}

function renderAttributeStrip(attributes) {
  return [
    "<dl class=\"singular-mobile-sheet__attribute-strip\" aria-label=\"Atributos principais\">",
    attributes.map(item => [
      `<div class="singular-mobile-sheet__stat" data-status="${escapeAttribute(item.status)}">`,
      `<dt>${escapeText(item.label)}</dt>`,
      `<dd>${formatValue(item.value)}</dd>`,
      "</div>",
    ].join("")).join(""),
    "</dl>",
  ].join("");
}

function renderPoolStrip(pools) {
  return [
    "<div class=\"singular-mobile-sheet__pool-strip\" role=\"group\" aria-label=\"PV e PF atuais\">",
    pools.map(renderPoolControl).join(""),
    "</div>",
  ].join("");
}

function renderPoolControl(pool) {
  const id = escapeAttribute(pool.id);
  const label = localizedPoolLabel(pool.id, pool.label);

  return [
    `<div class="singular-mobile-sheet__pool" data-pool="${id}">`,
    `<button type="button" class="singular-mobile-sheet__pool-adjust" data-pool-key="${id}" data-pool-adjust="-1" aria-label="Diminuir ${escapeAttribute(label)}">−</button>`,
    "<dl>",
    `<dt>${escapeText(label)}</dt>`,
    `<dd>${formatPool(pool.current, pool.maximum)}</dd>`,
    "</dl>",
    `<button type="button" class="singular-mobile-sheet__pool-adjust" data-pool-key="${id}" data-pool-adjust="1" aria-label="Aumentar ${escapeAttribute(label)}">+</button>`,
    "</div>",
  ].join("");
}

function renderCards(cards, mode) {
  return [
    "<main class=\"singular-mobile-sheet__cards\">",
    cards.map(card => renderCard(card, mode)).join(""),
    "</main>",
  ].join("");
}

function renderCard(card, mode) {
  const body = card.id === "identity" && mode === "creation"
    ? renderIdentityEditor(card)
    : ["<dl>", card.items.map(renderCardItem).join(""), "</dl>"].join("");

  return [
    `<section class="singular-mobile-sheet__card" data-card="${escapeAttribute(card.id)}" data-status="${escapeAttribute(card.status)}">`,
    `<h2>${escapeText(card.title)}</h2>`,
    body,
    "</section>",
  ].join("");
}

function renderIdentityEditor(card) {
  const name = findCardItem(card, "name");
  const concept = findCardItem(card, "concept");
  const readOnlyItems = card.items.filter(item => !["name", "concept"].includes(item.id));

  return [
    '<div class="singular-mobile-sheet__identity-editor" data-role="character-summary-editor">',
    '<label>Nome',
    `<input type="text" data-role="character-name" value="${escapeAttribute(name.value)}" autocomplete="off">`,
    "</label>",
    '<label>Conceito',
    `<input type="text" data-role="character-concept" value="${escapeAttribute(concept.value)}" autocomplete="off">`,
    "</label>",
    '<button type="button" data-action="character-summary-save">Aplicar identidade</button>',
    "</div>",
    readOnlyItems.length === 0
      ? ""
      : ["<dl>", readOnlyItems.map(renderCardItem).join(""), "</dl>"].join(""),
  ].join("");
}

function findCardItem(card, id) {
  const item = card.items.find(candidate => candidate.id === id);
  if (!item) {
    throw new Error(`Character mobile identity card is missing item: ${id}`);
  }
  return item;
}

function renderSections(sections) {
  return [
    "<aside class=\"singular-mobile-sheet__sections\" aria-label=\"Seções da ficha\">",
    sections.map(section => [
      `<section class="singular-mobile-sheet__section-marker" data-section="${escapeAttribute(section.id)}" data-status="${escapeAttribute(section.status)}"`,
      section.collapsed ? " data-collapsed=\"true\"" : " data-collapsed=\"false\"",
      ">",
      `<h2>${escapeText(section.title)}</h2>`,
      "</section>",
    ].join("")).join(""),
    "</aside>",
  ].join("");
}

function renderCardItem(item) {
  if (Object.prototype.hasOwnProperty.call(item, "current")) {
    return [
      "<div>",
      `<dt>${escapeText(localizedPoolLabel(item.id, item.label))}</dt>`,
      `<dd>${formatPool(item.current, item.maximum)}</dd>`,
      "</div>",
    ].join("");
  }

  if (Object.prototype.hasOwnProperty.call(item, "value")) {
    return [
      "<div>",
      `<dt>${escapeText(item.label)}</dt>`,
      `<dd>${formatValue(item.value)}</dd>`,
      "</div>",
    ].join("");
  }

  return [
    "<div>",
    `<dt>${escapeText(item.label)}</dt>`,
    `<dd>${formatValue(item.base)} / ${formatValue(item.override)}</dd>`,
    "</div>",
  ].join("");
}

function renderTextItem(item) {
  return [
    `<p data-item="${escapeAttribute(item.id)}">`,
    `<span>${escapeText(item.label)}</span>`,
    `<strong>${escapeText(item.value)}</strong>`,
    "</p>",
  ].join("");
}

function localizedPoolLabel(id, fallback) {
  if (id === "HP") return "PV";
  if (id === "FP") return "PF";
  if (id === "EnergyReserve") return "Reserva de Energia";
  return fallback;
}

function normalizeMode(value) {
  if (!["creation", "table"].includes(value)) {
    throw new Error("Character mobile sheet HTML mode is invalid");
  }
  return value;
}

function formatPool(current, maximum) {
  return `${formatValue(current)} / ${formatValue(maximum)}`;
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  return escapeText(String(value));
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}
