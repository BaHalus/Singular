import {
  serializeCharacterMobileSheetRenderModel,
} from "./CharacterMobileSheetRenderModel.js";

const HTML_SHELL_SCHEMA_VERSION = 10;

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
  let body;
  if (card.id === "identity" && mode === "creation") {
    body = renderCharacterSummaryEditor(card);
  } else if (card.id === "languages-culture") {
    body = renderLanguagesCultureCard(card);
  } else if (card.id === "attacks") {
    body = renderAttacksCard(card, mode);
  } else if (card.id === "equipment") {
    body = renderEquipmentCard(card);
  } else {
    body = renderCardBody(card);
  }

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

function renderLanguagesCultureCard(card) {
  if (card.items.length === 0) {
    return "<p class=\"singular-mobile-sheet__empty\">Nenhum idioma ou familiaridade cultural declarado.</p>";
  }
  return [
    '<dl class="singular-mobile-sheet__languages-culture-list">',
    card.items.map(renderLanguageCultureItem).join(""),
    "</dl>",
  ].join("");
}

function renderLanguageCultureItem(item) {
  return [
    `<div data-entry-kind="${escapeAttribute(item.entryKind)}" data-canonical-id="${escapeAttribute(item.canonicalId)}">`,
    `<dt>${escapeText(item.label)}</dt>`,
    `<dd>${formatValue(item.value)}${renderItemDetails(item)}</dd>`,
    "</div>",
  ].join("");
}

function renderAttacksCard(card, mode) {
  const editor = mode === "creation" ? renderAttackEditor() : "";
  const list = card.items.length === 0
    ? "<p class=\"singular-mobile-sheet__empty\">Nenhum ataque declarado.</p>"
    : [
      '<dl class="singular-mobile-sheet__attack-list">',
      card.items
        .map((item, index) => renderAttackItem(item, mode, index, card.items.length))
        .join(""),
      "</dl>",
    ].join("");
  return `${editor}${list}`;
}

function renderAttackEditor() {
  return [
    '<div class="singular-mobile-sheet__attack-editor" data-role="attack-editor">',
    '<label>Nome<input type="text" data-role="attack-name" autocomplete="off"></label>',
    '<label>Categoria<select data-role="attack-category"><option value="melee">Corpo a corpo</option><option value="ranged">À distância</option></select></label>',
    '<label>Perícia (ID)<input type="text" data-role="attack-skill-id" autocomplete="off"></label>',
    '<label>Dano declarado<input type="text" data-role="attack-damage-value" autocomplete="off"></label>',
    '<label>Tipo de dano<input type="text" data-role="attack-damage-type" autocomplete="off"></label>',
    '<label>Reach<input type="text" data-role="attack-reach" autocomplete="off"></label>',
    '<label>Alcance<input type="text" data-role="attack-range" autocomplete="off"></label>',
    '<label>Notas<input type="text" data-role="attack-notes" autocomplete="off"></label>',
    '<button type="button" data-action="attack-add">Adicionar ataque</button>',
    "</div>",
  ].join("");
}

function renderAttackItem(item, mode, index, total) {
  const controls = mode === "creation"
    ? renderAttackControls(item, index, total)
    : "";
  const editor = mode === "creation" ? renderAttackEditForm(item) : "";
  return [
    `<div data-attack-id="${escapeAttribute(item.id)}" data-attack-category="${escapeAttribute(item.category)}" data-damage-authority="${escapeAttribute(item.damageAuthority)}">`,
    `<dt>${escapeText(item.label)}</dt>`,
    `<dd>${formatValue(item.value)}${renderItemDetails(item)}${controls}${editor}</dd>`,
    "</div>",
  ].join("");
}

function renderAttackControls(item, index, total) {
  const id = escapeAttribute(item.id);
  const up = index > 0
    ? `<button type="button" data-action="attack-reorder" data-attack-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${escapeAttribute(item.value)} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="attack-reorder" data-attack-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${escapeAttribute(item.value)} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__attack-actions">',
    up,
    down,
    `<button type="button" data-action="attack-remove" data-attack-id="${id}" aria-label="Excluir ${escapeAttribute(item.value)}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderAttackEditForm(item) {
  const id = escapeAttribute(item.id);
  const value = inputValue(item.value);
  const skillId = inputValue(item.skillId);
  const damageValue = inputValue(item.damageValue);
  const damageType = inputValue(item.damageType);
  const reach = inputValue(item.reach);
  const range = inputValue(item.range);
  const notes = inputValue(item.notes);
  return [
    '<details class="singular-mobile-sheet__attack-edit">',
    '<summary>Editar ataque</summary>',
    `<div class="singular-mobile-sheet__attack-edit-form" data-attack-edit-id="${id}">`,
    `<label>Nome<input type="text" data-role="attack-edit-name" value="${value}" autocomplete="off"></label>`,
    '<label>Categoria<select data-role="attack-edit-category">',
    `<option value="melee"${selected(item.category === "melee")}>Corpo a corpo</option>`,
    `<option value="ranged"${selected(item.category === "ranged")}>À distância</option>`,
    "</select></label>",
    `<label>Perícia (ID)<input type="text" data-role="attack-edit-skill-id" value="${skillId}" autocomplete="off"></label>`,
    `<label>Dano declarado<input type="text" data-role="attack-edit-damage-value" value="${damageValue}" autocomplete="off"></label>`,
    `<label>Tipo de dano<input type="text" data-role="attack-edit-damage-type" value="${damageType}" autocomplete="off"></label>`,
    `<label>Reach<input type="text" data-role="attack-edit-reach" value="${reach}" autocomplete="off"></label>`,
    `<label>Alcance<input type="text" data-role="attack-edit-range" value="${range}" autocomplete="off"></label>`,
    `<label>Notas<input type="text" data-role="attack-edit-notes" value="${notes}" autocomplete="off"></label>`,
    `<button type="button" data-action="attack-update" data-attack-id="${id}">Aplicar edição</button>`,
    "</div>",
    "</details>",
  ].join("");
}

function renderEquipmentCard(card) {
  if (card.items.length === 0) {
    return "<p class=\"singular-mobile-sheet__empty\">Nenhum equipamento declarado.</p>";
  }
  return [
    '<dl class="singular-mobile-sheet__equipment-totals" aria-label="Totais de equipamentos">',
    `<div><dt>Quantidade</dt><dd>${formatValue(card.totals.quantity)}</dd></div>`,
    `<div><dt>Peso</dt><dd>${formatValue(card.totals.weightKg)} kg</dd></div>`,
    `<div><dt>Custo</dt><dd>$ ${formatValue(card.totals.cost)}</dd></div>`,
    "</dl>",
    '<dl class="singular-mobile-sheet__equipment-list">',
    card.items.map(renderEquipmentItem).join(""),
    "</dl>",
  ].join("");
}

function renderEquipmentItem(item) {
  const prefix = item.depth > 0 ? `${"↳ ".repeat(item.depth)}` : "";
  return [
    `<div data-equipment-id="${escapeAttribute(item.id)}" data-equipment-state="${escapeAttribute(item.state)}" data-depth="${escapeAttribute(item.depth)}">`,
    `<dt>${escapeText(item.label)}</dt>`,
    `<dd>${escapeText(`${prefix}${item.value}`)}${renderItemDetails(item)}</dd>`,
    "</div>",
  ].join("");
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
  if (!item) throw new Error(`Character summary card is missing item: ${id}`);
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
    details.push(`NH importado ${formatValue(item.importedLevel)}`);
  }
  if (item.importedRelativeLevel !== undefined && item.importedRelativeLevel !== null) {
    details.push(`rel. importado ${formatSignedNumber(item.importedRelativeLevel)}`);
  }
  if (item.skill) details.push(`base ${item.skill}`);
  if (item.defaultPenalty !== undefined && item.defaultPenalty !== null) {
    details.push(`pd ${formatSignedNumber(item.defaultPenalty)}`);
  }
  if (item.maximumRelativeLevel !== undefined && item.maximumRelativeLevel !== null) {
    details.push(`máx ${formatSignedNumber(item.maximumRelativeLevel)}`);
  }
  if (item.entryKind === "language") {
    details.push(`Fala ${localizedLanguageLevel(item.spokenLevel)}`);
    details.push(`Escrita ${localizedLanguageLevel(item.writtenLevel)}`);
    if (item.isNative) details.push("Idioma nativo");
  }
  if (item.entryKind === "familiarity" && item.isNative) {
    details.push("Cultura nativa");
  }
  if (item.importedCost !== undefined && item.importedCost !== null) {
    details.push(`Custo importado ${formatValue(item.importedCost)} pts`);
  }
  if (item.reference) details.push(`Ref. ${item.reference}`);
  if (item.damageValue || item.damageType) {
    const damage = [item.damageValue, item.damageType].filter(Boolean).join(" ");
    details.push(`Dano declarado ${damage}`);
  }
  if (item.reach) details.push(`Reach ${item.reach}`);
  if (item.range) details.push(`Alcance ${item.range}`);
  if (item.skillId) details.push(`Perícia ${item.skillId}`);
  if (item.sourceKind) {
    const source = localizedAttackSource(item.sourceKind);
    details.push(item.sourceId ? `${source} ${item.sourceId}` : source);
  }
  if (item.quantity !== undefined) details.push(`Qtd ${formatValue(item.quantity)}`);
  if (item.weightKg !== undefined) details.push(`${formatValue(item.weightKg)} kg/un`);
  if (item.cost !== undefined) details.push(`$ ${formatValue(item.cost)}/un`);
  if (item.state) details.push(localizedEquipmentState(item.state));
  if (item.uses !== undefined && item.uses !== null) {
    details.push(item.maxUses === null
      ? `Usos ${formatValue(item.uses)}`
      : `Usos ${formatValue(item.uses)}/${formatValue(item.maxUses)}`);
  }
  if (item.notes) details.push(item.notes);
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

function localizedLanguageLevel(level) {
  if (level === "none") return "Nenhum";
  if (level === "broken") return "Rudimentar";
  if (level === "accented") return "Com sotaque";
  if (level === "native") return "Nativo";
  return level;
}

function localizedAttackSource(kind) {
  if (kind === "manual") return "Origem manual";
  if (kind === "equipment") return "Origem equipamento";
  if (kind === "trait") return "Origem traço";
  if (kind === "spell") return "Origem magia";
  if (kind === "power") return "Origem poder";
  return "Outra origem";
}

function localizedEquipmentState(state) {
  if (state === "equipped") return "Equipado";
  if (state === "carried") return "Carregado";
  if (state === "stored") return "Guardado";
  if (state === "dropped") return "Largado";
  if (state === "ignored") return "Ignorado";
  return state;
}

function selected(condition) {
  return condition ? " selected" : "";
}

function inputValue(value) {
  if (value === null || value === undefined) return "";
  return escapeAttribute(value);
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
