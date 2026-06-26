import {
  serializeCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";

const HTML_SHELL_SCHEMA_VERSION = 5;

export function renderCharacterMobileSheetHtml(renderModel, options = {}) {
  const model = serializeCharacterMobileSheetRenderModel(renderModel);
  const shellMode = normalizeMode(options.mode ?? "creation");

  return [
    `<article class="singular-mobile-sheet" data-schema-version="${HTML_SHELL_SCHEMA_VERSION}" data-mode="${shellMode}">`,
    renderToolbar(model.toolbar, shellMode),
    renderSummary(model.summary, shellMode),
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

function renderSummary(summary, mode) {
  return [
    "<section class=\"singular-mobile-sheet__summary\" aria-label=\"Resumo\">",
    renderIdentitySummary(summary.identity),
    renderAttributeStrip(summary.attributes, mode),
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

function renderAttributeStrip(attributes, mode) {
  return [
    "<div class=\"singular-mobile-sheet__attribute-strip\" role=\"group\" aria-label=\"Atributos principais\">",
    attributes.map(item => renderAttributeControl(item, mode)).join(""),
    "</div>",
  ].join("");
}

function renderAttributeControl(item, mode) {
  const key = escapeAttribute(item.id);
  const label = escapeText(item.label);
  const value = formatValue(item.value);
  if (mode === "table") {
    return [
      `<dl class="singular-mobile-sheet__stat" data-attribute="${key}" data-status="${escapeAttribute(item.status)}">`,
      `<dt>${label}</dt>`,
      `<dd>${value}</dd>`,
      "</dl>",
    ].join("");
  }

  return [
    `<div class="singular-mobile-sheet__stat singular-mobile-sheet__attribute-control" data-attribute="${key}" data-status="${escapeAttribute(item.status)}">`,
    `<button type="button" class="singular-mobile-sheet__attribute-adjust" data-attribute-key="${key}" data-attribute-adjust="-1" aria-label="Diminuir ${key}">−</button>`,
    "<dl>",
    `<dt>${label}</dt>`,
    `<dd>${value}</dd>`,
    "</dl>",
    `<button type="button" class="singular-mobile-sheet__attribute-adjust" data-attribute-key="${key}" data-attribute-adjust="1" aria-label="Aumentar ${key}">+</button>`,
    "</div>",
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
    ? renderCharacterSummaryEditor(card)
    : renderCardBody(card);

  return [
    `<section class="singular-mobile-sheet__card" data-card="${escapeAttribute(card.id)}" data-status="${escapeAttribute(card.status)}">`,
    `<h2>${escapeText(card.title)}</h2>`,
    body,
    "</section>",
  ].join("");
}

function renderCardBody(card) {
  if (card.items.length === 0) {
    return "<p class=\"singular-mobile-sheet__empty\">Nenhum item declarado.</p>";
  }
  return ["<dl>", card.items.map(renderCardItem).join(""), "</dl>"].join("");
}

function renderCharacterSummaryEditor(card) {
  const name = findCardItem(card, "name");
  const concept = findCardItem(card, "concept");
  const readOnlyItems = card.items.filter(item => !["name", "concept"].includes(item.id));

  return [
    '<div class="singular-mobile-sheet__summary-editor" data-role="character-summary-editor">',
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
    throw new Error(`Character summary card is missing item: ${id}`);
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
      `<dd>${formatValue(item.value)}${renderItemDetails(item)}</dd>`,
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

function renderItemDetails(item) {
  const details = [];
  if (Object.prototype.hasOwnProperty.call(item, "points")) {
    details.push(`${formatValue(item.points)} pts`);
  }
  if (item.levels !== undefined && item.levels !== null) {
    details.push(`Nv ${formatValue(item.levels)}`);
  }
  if (item.attribute || item.difficulty) {
    details.push([item.attribute, item.difficulty].filter(Boolean).join("/"));
  }
  if (item.importedLevel !== undefined && item.importedLevel !== null) {
    details.push(`NH ${formatValue(item.importedLevel)}`);
  }
  if (item.importedRelativeLevel !== undefined && item.importedRelativeLevel !== null) {
    details.push(`rel ${formatSignedNumber(item.importedRelativeLevel)}`);
  }
  if (item.skill) {
    details.push(`base ${item.skill}`);
  }
  if (item.defaultPenalty !== undefined && item.defaultPenalty !== null) {
    details.push(`pd ${formatSignedNumber(item.defaultPenalty)}`);
  }
  if (item.maximumRelativeLevel !== undefined && item.maximumRelativeLevel !== null) {
    details.push(`máx ${formatSignedNumber(item.maximumRelativeLevel)}`);
  }
  if (item.notes) {
    details.push(item.notes);
  }
  if (details.length === 0) return "";
  return ` <small>${escapeText(details.join(" · "))}</small>`;
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

function formatSignedNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return formatValue(value);
  return number > 0 ? `+${number}` : String(number);
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
