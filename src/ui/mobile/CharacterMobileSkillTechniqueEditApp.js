import {
  bootstrapCharacterMobileTraitEditApp,
  injectMobileTraitEditControls,
} from "./CharacterMobileTraitEditApp.js";
import {
  escapeAttribute,
  escapeSelectorValue,
  escapeTextContent as escapeText,
  findDataTarget,
  normalizeOptionalText,
  readDataset,
  readInputValue,
  readNumberInputValue as readInputNumber,
  renderTextareaText,
  requirePlainObject,
  resolveMobileRoot,
  splitTextList,
} from "./MobileInlineEditHelpers.js";

const SKILL_ATTRIBUTES = Object.freeze(["ST", "DX", "IQ", "HT", "Will", "Per"]);
const SKILL_DIFFICULTIES = Object.freeze(["E", "A", "H", "VH"]);
const TECHNIQUE_DIFFICULTIES = Object.freeze(["A", "H"]);

export async function bootstrapCharacterMobileSkillTechniqueEditApp(options = {}) {
  requirePlainObject(options, "Character mobile skill technique edit bootstrap options");
  const app = await bootstrapCharacterMobileTraitEditApp(options);
  const mounted = mountCharacterMobileSkillTechniqueEditApp(app, options);
  const previousDestroy = app.traitEdit?.destroy;

  return Object.freeze({
    get character() { return mounted.character; },
    get session() { return mounted.session; },
    get html() { return mounted.html; },
    get mode() { return mounted.mode; },
    interactions: mounted.interactions,
    modeSync: mounted.modeSync,
    ui: mounted.ui,
    persistence: mounted.persistence,
    commands: mounted.commands,
    repositories: mounted.repositories,
    runtime: mounted.runtime,
    postRenderLifecycle: mounted.postRenderLifecycle,
    render: mounted.render,
    skillTechniqueEdit: Object.freeze({
      destroy() {
        mounted.skillTechniqueEdit.destroy();
        previousDestroy?.();
      },
    }),
  });
}

export function mountCharacterMobileSkillTechniqueEditApp(app, options = {}) {
  const root = options.root ?? resolveMobileRoot(
    options.document,
    "Character mobile skill technique edit bootstrap root was not found",
  );
  const postRenderLifecycle = requirePostRenderLifecycle(app.postRenderLifecycle);
  const lifecycleApp = exposePostRenderLifecycle(app, postRenderLifecycle);
  const useDomMount = canMountSkillTechniqueControlsWithDom(root);

  const mountSkillTechniqueEditors = context => {
    injectCurrentSkillTechniqueControls(context.root, {
      character: context.character,
      mode: context.mode,
      modeSync: lifecycleApp.modeSync,
    });
  };
  const unregisterPostRender = postRenderLifecycle.register(mountSkillTechniqueEditors);

  const render = useDomMount
    ? (renderOptions = {}) => {
      const result = lifecycleApp.render({
        ...renderOptions,
        skipPostRenderLifecycle: true,
      });
      if (!renderOptions.skipPostRenderLifecycle) {
        runPostRenderLifecycle(postRenderLifecycle, root, lifecycleApp, renderOptions);
      }
      return result;
    }
    : (renderOptions = {}) => renderLegacySkillTechniqueControls(root, lifecycleApp, renderOptions);

  if (useDomMount) {
    mountSkillTechniqueEditors(readPostRenderContext(root, lifecycleApp));
  } else {
    render();
  }

  const handleClick = event => {
    const actionTarget = findDataTarget(event?.target, "action");
    const action = actionTarget === null ? null : readDataset(actionTarget, "action");
    if (!["skill-update", "technique-update"].includes(action)) return null;
    event.preventDefault?.();

    if (lifecycleApp.mode !== "creation") {
      root.setAttribute?.("data-last-command-status", "blocked-by-mode");
      return null;
    }
    if (lifecycleApp.ui.getState().busy) {
      root.setAttribute?.("data-last-command-status", "busy");
      return null;
    }

    const result = action === "skill-update"
      ? lifecycleApp.commands.updateSkill({
        skillId: readDataset(actionTarget, "skillId"),
        patch: readSkillPatch(root, readDataset(actionTarget, "skillId")),
      })
      : lifecycleApp.commands.updateTechnique({
        techniqueId: readDataset(actionTarget, "techniqueId"),
        patch: readTechniquePatch(root, readDataset(actionTarget, "techniqueId")),
      });

    root.setAttribute?.("data-last-command-status", result.status);
    if (["applied", "no-op"].includes(result.status)) render();
    return result;
  };

  root.addEventListener("click", handleClick);

  return Object.freeze({
    get character() { return lifecycleApp.character; },
    get session() { return lifecycleApp.session; },
    get html() { return root.innerHTML; },
    get mode() { return lifecycleApp.mode; },
    interactions: lifecycleApp.interactions,
    modeSync: lifecycleApp.modeSync,
    ui: lifecycleApp.ui,
    persistence: lifecycleApp.persistence,
    commands: lifecycleApp.commands,
    repositories: lifecycleApp.repositories,
    runtime: lifecycleApp.runtime,
    postRenderLifecycle,
    render,
    skillTechniqueEdit: Object.freeze({
      destroy() {
        unregisterPostRender();
        root.removeEventListener?.("click", handleClick);
      },
    }),
  });
}

export function injectMobileSkillTechniqueEditControls(html, character, mode) {
  const marker = 'data-card="skills-techniques"';
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;

  const sectionStart = html.lastIndexOf("<section", markerIndex);
  const headerEnd = html.indexOf("</h2>", markerIndex);
  const sectionEnd = html.indexOf("</section>", markerIndex);
  if (sectionStart < 0 || headerEnd < 0 || sectionEnd < 0) return html;

  return [
    html.slice(0, sectionStart),
    html.slice(sectionStart, headerEnd + "</h2>".length),
    renderSkillTechniqueBody(character.skills ?? [], character.techniques ?? [], mode),
    "</section>",
    html.slice(sectionEnd + "</section>".length),
  ].join("");
}

function injectCurrentSkillTechniqueControls(root, { character, mode, modeSync }) {
  const section = root.querySelector?.('[data-card="skills-techniques"]') ?? null;
  const mounted = section !== null
    ? replaceSkillTechniqueSectionBody(section, renderSkillTechniqueBody(
      character.skills ?? [],
      character.techniques ?? [],
      mode,
    ))
    : false;
  modeSync.sync();
  return mounted;
}

function replaceSkillTechniqueSectionBody(section, bodyHtml) {
  const header = section.querySelector?.("h2") ?? null;
  if (header === null) return false;

  while (header.nextSibling !== null) {
    header.nextSibling.remove();
  }

  const documentRef = section.ownerDocument ?? globalThis.document;
  const template = documentRef?.createElement?.("template") ?? null;
  if (template === null || typeof section.append !== "function") return false;

  template.innerHTML = bodyHtml;
  const nodes = Array.from(template.content?.childNodes ?? []);
  if (nodes.length === 0) return false;
  section.append(...nodes);
  return true;
}

function canMountSkillTechniqueControlsWithDom(root) {
  const section = root.querySelector?.('[data-card="skills-techniques"]') ?? null;
  return section !== null &&
    typeof section.querySelector === "function" &&
    typeof section.append === "function" &&
    (section.ownerDocument?.createElement ?? globalThis.document?.createElement) !== undefined;
}

function renderLegacySkillTechniqueControls(root, app, renderOptions = {}) {
  const mode = renderOptions.mode ?? app.mode;
  const session = app.persistence.getActiveSession();
  root.innerHTML = injectMobileSkillTechniqueEditControls(
    injectMobileTraitEditControls(
      app.render({ mode, skipPostRenderLifecycle: true }),
      session.character,
      mode,
    ),
    session.character,
    mode,
  );
  app.modeSync.sync();
  return root.innerHTML;
}

function renderSkillTechniqueBody(skills, techniques, mode) {
  const editor = mode === "creation" ? renderCreationEditors() : "";
  const empty = skills.length === 0 && techniques.length === 0;
  const list = empty
    ? '<p class="singular-mobile-sheet__empty">Nenhuma perícia ou técnica declarada.</p>'
    : [
      '<dl class="singular-mobile-sheet__skill-technique-list">',
      skills.map((skill, index) => renderSkillItem(skill, mode, index, skills.length)).join(""),
      techniques.map((technique, index) => renderTechniqueItem(
        technique,
        mode,
        index,
        techniques.length,
      )).join(""),
      "</dl>",
    ].join("");
  return `${editor}${list}`;
}

function renderCreationEditors() {
  return [
    '<div class="singular-mobile-sheet__skill-editor" data-role="skill-editor">',
    '<h3>Nova perícia</h3>',
    '<label>Nome<input type="text" data-role="skill-name" autocomplete="off"></label>',
    '<label>Especialização<input type="text" data-role="skill-specialization" autocomplete="off"></label>',
    '<label>TL<input type="text" data-role="skill-tech-level" autocomplete="off"></label>',
    `<label>Atributo<select data-role="skill-attribute">${renderOptions(SKILL_ATTRIBUTES, "")}</select></label>`,
    `<label>Dif<select data-role="skill-difficulty">${renderOptions(SKILL_DIFFICULTIES, "")}</select></label>`,
    '<label>Pontos<input type="number" min="0" step="1" data-role="skill-points" value="0"></label>',
    '<label>Tags<input type="text" data-role="skill-tags" autocomplete="off"></label>',
    '<label>Notas<textarea data-role="skill-notes" autocomplete="off"></textarea></label>',
    '<button type="button" data-action="skill-add">Adicionar perícia</button>',
    "</div>",
    '<div class="singular-mobile-sheet__technique-editor" data-role="technique-editor">',
    '<h3>Nova técnica</h3>',
    '<label>Nome<input type="text" data-role="technique-name" autocomplete="off"></label>',
    '<label>Especialização<input type="text" data-role="technique-specialization" autocomplete="off"></label>',
    '<label>Perícia base (ID)<input type="text" data-role="technique-skill-id" autocomplete="off"></label>',
    '<label>Perícia base<input type="text" data-role="technique-skill-name" autocomplete="off"></label>',
    '<label>Especialização base<input type="text" data-role="technique-skill-specialization" autocomplete="off"></label>',
    `<label>Dif<select data-role="technique-difficulty">${renderOptions(TECHNIQUE_DIFFICULTIES, "")}</select></label>`,
    '<label>Pontos<input type="number" min="0" step="1" data-role="technique-points" value="0"></label>',
    '<label>PD<input type="number" step="1" data-role="technique-default-penalty"></label>',
    '<label>Máx rel.<input type="number" step="1" data-role="technique-maximum-relative-level"></label>',
    '<label>Tags<input type="text" data-role="technique-tags" autocomplete="off"></label>',
    '<label>Notas<textarea data-role="technique-notes" autocomplete="off"></textarea></label>',
    '<button type="button" data-action="technique-add">Adicionar técnica</button>',
    "</div>",
  ].join("");
}

function renderSkillItem(skill, mode, index, total) {
  const id = escapeAttribute(skill.id);
  const controls = mode === "creation" ? renderSkillControls(skill, index, total) : "";
  const editor = mode === "creation" ? renderSkillInlineEditor(skill) : "";
  return [
    `<div data-skill-id="${id}">`,
    "<dt>Perícia</dt>",
    `<dd>${escapeText(formatNamedSpecialization(skill.name, skill.specialization) || "Perícia sem nome")}${renderSkillDetails(skill)}${controls}${editor}</dd>`,
    "</div>",
  ].join("");
}

function renderTechniqueItem(technique, mode, index, total) {
  const id = escapeAttribute(technique.id);
  const controls = mode === "creation" ? renderTechniqueControls(technique, index, total) : "";
  const editor = mode === "creation" ? renderTechniqueInlineEditor(technique) : "";
  return [
    `<div data-technique-id="${id}">`,
    "<dt>Técnica</dt>",
    `<dd>${escapeText(formatNamedSpecialization(technique.name, technique.specialization) || "Técnica sem nome")}${renderTechniqueDetails(technique)}${controls}${editor}</dd>`,
    "</div>",
  ].join("");
}

function renderSkillControls(skill, index, total) {
  const id = escapeAttribute(skill.id);
  const name = escapeAttribute(formatNamedSpecialization(skill.name, skill.specialization) || "perícia");
  const up = index > 0
    ? `<button type="button" data-action="skill-reorder" data-skill-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="skill-reorder" data-skill-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__skill-actions">',
    up,
    down,
    `<button type="button" data-action="skill-remove" data-skill-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderTechniqueControls(technique, index, total) {
  const id = escapeAttribute(technique.id);
  const name = escapeAttribute(formatNamedSpecialization(technique.name, technique.specialization) || "técnica");
  const up = index > 0
    ? `<button type="button" data-action="technique-reorder" data-technique-id="${id}" data-target-index="${index - 1}" aria-label="Mover ${name} para cima">↑</button>`
    : "";
  const down = index < total - 1
    ? `<button type="button" data-action="technique-reorder" data-technique-id="${id}" data-target-index="${index + 1}" aria-label="Mover ${name} para baixo">↓</button>`
    : "";
  return [
    '<span class="singular-mobile-sheet__technique-actions">',
    up,
    down,
    `<button type="button" data-action="technique-remove" data-technique-id="${id}" aria-label="Excluir ${name}">Excluir</button>`,
    "</span>",
  ].join("");
}

function renderSkillInlineEditor(skill) {
  const id = escapeAttribute(skill.id);
  const tags = Array.isArray(skill.tags) ? skill.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__skill-technique-inline-editor" data-role="skill-inline-editor" data-skill-id="${id}">`,
    `<label>Nome <input type="text" data-role="skill-edit-name-${id}" value="${escapeAttribute(skill.name ?? "")}" autocomplete="off"></label>`,
    `<label>Especialização <input type="text" data-role="skill-edit-specialization-${id}" value="${escapeAttribute(skill.specialization ?? "")}" autocomplete="off"></label>`,
    `<label>TL <input type="text" data-role="skill-edit-tech-level-${id}" value="${escapeAttribute(skill.techLevel ?? "")}" autocomplete="off"></label>`,
    `<label>Atributo <select data-role="skill-edit-attribute-${id}">${renderOptions(SKILL_ATTRIBUTES, skill.attribute)}</select></label>`,
    `<label>Dif <select data-role="skill-edit-difficulty-${id}">${renderOptions(SKILL_DIFFICULTIES, skill.difficulty)}</select></label>`,
    `<label>Pontos <input type="number" min="0" step="1" data-role="skill-edit-points-${id}" value="${escapeAttribute(skill.points ?? "")}"></label>`,
    `<label>Tags <input type="text" data-role="skill-edit-tags-${id}" value="${escapeAttribute(tags)}" autocomplete="off"></label>`,
    `<label>Notas <textarea data-role="skill-edit-notes-${id}" autocomplete="off">${renderTextareaText(skill.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="skill-update" data-skill-id="${id}">Salvar perícia</button>`,
    "</div>",
  ].join("");
}

function renderTechniqueInlineEditor(technique) {
  const id = escapeAttribute(technique.id);
  const tags = Array.isArray(technique.tags) ? technique.tags.join(", ") : "";
  return [
    `<div class="singular-mobile-sheet__skill-technique-inline-editor" data-role="technique-inline-editor" data-technique-id="${id}">`,
    `<label>Nome <input type="text" data-role="technique-edit-name-${id}" value="${escapeAttribute(technique.name ?? "")}" autocomplete="off"></label>`,
    `<label>Especialização <input type="text" data-role="technique-edit-specialization-${id}" value="${escapeAttribute(technique.specialization ?? "")}" autocomplete="off"></label>`,
    `<label>Perícia base (ID) <input type="text" data-role="technique-edit-skill-id-${id}" value="${escapeAttribute(technique.skillId ?? "")}" autocomplete="off"></label>`,
    `<label>Perícia base <input type="text" data-role="technique-edit-skill-name-${id}" value="${escapeAttribute(technique.skillName ?? "")}" autocomplete="off"></label>`,
    `<label>Especialização base <input type="text" data-role="technique-edit-skill-specialization-${id}" value="${escapeAttribute(technique.skillSpecialization ?? "")}" autocomplete="off"></label>`,
    `<label>Dif <select data-role="technique-edit-difficulty-${id}">${renderOptions(TECHNIQUE_DIFFICULTIES, technique.difficulty)}</select></label>`,
    `<label>Pontos <input type="number" min="0" step="1" data-role="technique-edit-points-${id}" value="${escapeAttribute(technique.points ?? "")}"></label>`,
    `<label>PD <input type="number" step="1" data-role="technique-edit-default-penalty-${id}" value="${escapeAttribute(technique.defaultPenalty ?? "")}"></label>`,
    `<label>Máx rel. <input type="number" step="1" data-role="technique-edit-maximum-relative-level-${id}" value="${escapeAttribute(technique.maximumRelativeLevel ?? "")}"></label>`,
    `<label>Tags <input type="text" data-role="technique-edit-tags-${id}" value="${escapeAttribute(tags)}" autocomplete="off"></label>`,
    `<label>Notas <textarea data-role="technique-edit-notes-${id}" autocomplete="off">${renderTextareaText(technique.notes ?? "")}</textarea></label>`,
    `<button type="button" data-action="technique-update" data-technique-id="${id}">Salvar técnica</button>`,
    "</div>",
  ].join("");
}

function renderOptions(values, activeValue) {
  return [
    '<option value=""></option>',
    values.map(value => {
      const selected = value === activeValue ? " selected" : "";
      return `<option value="${escapeAttribute(value)}"${selected}>${escapeText(value)}</option>`;
    }).join(""),
  ].join("");
}

function renderSkillDetails(skill) {
  const details = [];
  if (skill.attribute || skill.difficulty) details.push([skill.attribute, skill.difficulty].filter(Boolean).join("/"));
  if (skill.points !== undefined && skill.points !== null) details.push(`${formatValue(skill.points)} pts`);
  if (skill.importedLevel !== undefined && skill.importedLevel !== null) details.push(`NH importado ${formatValue(skill.importedLevel)}`);
  if (skill.importedRelativeLevel !== undefined && skill.importedRelativeLevel !== null) details.push(`rel. importado ${formatSignedNumber(skill.importedRelativeLevel)}`);
  if (skill.notes) details.push(skill.notes);
  if (Array.isArray(skill.tags) && skill.tags.length > 0) details.push(`Tags ${skill.tags.join(", ")}`);
  if (details.length === 0) return "";
  return ` <small>${escapeText(details.join(" · "))}</small>`;
}

function renderTechniqueDetails(technique) {
  const details = [];
  const baseSkill = formatNamedSpecialization(technique.skillName, technique.skillSpecialization);
  if (baseSkill) details.push(`base ${baseSkill}`);
  if (technique.difficulty) details.push(technique.difficulty);
  if (technique.points !== undefined && technique.points !== null) details.push(`${formatValue(technique.points)} pts`);
  if (technique.defaultPenalty !== undefined && technique.defaultPenalty !== null) details.push(`pd ${formatSignedNumber(technique.defaultPenalty)}`);
  if (technique.maximumRelativeLevel !== undefined && technique.maximumRelativeLevel !== null) details.push(`máx ${formatSignedNumber(technique.maximumRelativeLevel)}`);
  if (technique.importedLevel !== undefined && technique.importedLevel !== null) details.push(`NH importado ${formatValue(technique.importedLevel)}`);
  if (technique.importedRelativeLevel !== undefined && technique.importedRelativeLevel !== null) details.push(`rel. importado ${formatSignedNumber(technique.importedRelativeLevel)}`);
  if (technique.notes) details.push(technique.notes);
  if (Array.isArray(technique.tags) && technique.tags.length > 0) details.push(`Tags ${technique.tags.join(", ")}`);
  if (details.length === 0) return "";
  return ` <small>${escapeText(details.join(" · "))}</small>`;
}

function readSkillPatch(root, skillId) {
  const suffix = escapeSelectorValue(skillId);
  return {
    name: readInputValue(root, `[data-role="skill-edit-name-${suffix}"]`),
    specialization: readInputValue(root, `[data-role="skill-edit-specialization-${suffix}"]`),
    techLevel: normalizeOptionalText(readInputValue(root, `[data-role="skill-edit-tech-level-${suffix}"]`)),
    attribute: normalizeOptionalText(readInputValue(root, `[data-role="skill-edit-attribute-${suffix}"]`)),
    difficulty: normalizeOptionalText(readInputValue(root, `[data-role="skill-edit-difficulty-${suffix}"]`)),
    points: readInputNumber(root, `[data-role="skill-edit-points-${suffix}"]`, 0),
    notes: readInputValue(root, `[data-role="skill-edit-notes-${suffix}"]`),
    tags: splitTextList(readInputValue(root, `[data-role="skill-edit-tags-${suffix}"]`)),
  };
}

function readTechniquePatch(root, techniqueId) {
  const suffix = escapeSelectorValue(techniqueId);
  return {
    name: readInputValue(root, `[data-role="technique-edit-name-${suffix}"]`),
    specialization: readInputValue(root, `[data-role="technique-edit-specialization-${suffix}"]`),
    skillId: normalizeOptionalText(readInputValue(root, `[data-role="technique-edit-skill-id-${suffix}"]`)),
    skillName: readInputValue(root, `[data-role="technique-edit-skill-name-${suffix}"]`),
    skillSpecialization: readInputValue(root, `[data-role="technique-edit-skill-specialization-${suffix}"]`),
    difficulty: normalizeOptionalText(readInputValue(root, `[data-role="technique-edit-difficulty-${suffix}"]`)),
    points: readInputNumber(root, `[data-role="technique-edit-points-${suffix}"]`, 0),
    defaultPenalty: readInputNumber(root, `[data-role="technique-edit-default-penalty-${suffix}"]`, null),
    maximumRelativeLevel: readInputNumber(root, `[data-role="technique-edit-maximum-relative-level-${suffix}"]`, null),
    notes: readInputValue(root, `[data-role="technique-edit-notes-${suffix}"]`),
    tags: splitTextList(readInputValue(root, `[data-role="technique-edit-tags-${suffix}"]`)),
  };
}

function formatNamedSpecialization(name, specialization) {
  if (specialization === null || specialization === undefined || specialization === "") {
    return name ?? "";
  }
  return `${name ?? ""} (${specialization})`;
}

function runPostRenderLifecycle(postRenderLifecycle, root, app, renderOptions = {}) {
  postRenderLifecycle.run(readPostRenderContext(root, app, renderOptions));
}

function readPostRenderContext(root, app, renderOptions = {}) {
  const session = typeof app.persistence?.getActiveSession === "function"
    ? app.persistence.getActiveSession()
    : app.session;
  const character = session?.character ?? app.character;
  return {
    root,
    character,
    session,
    mode: renderOptions.mode ?? app.mode,
  };
}

function requirePostRenderLifecycle(postRenderLifecycle) {
  if (postRenderLifecycle === null || typeof postRenderLifecycle !== "object") {
    throw new Error("Character mobile skill technique edit requires a post-render lifecycle");
  }
  if (typeof postRenderLifecycle.register !== "function") {
    throw new Error("Character mobile skill technique edit post-render lifecycle must register enhancers");
  }
  if (typeof postRenderLifecycle.run !== "function") {
    throw new Error("Character mobile skill technique edit post-render lifecycle must run enhancers");
  }
  return postRenderLifecycle;
}

function exposePostRenderLifecycle(app, postRenderLifecycle) {
  const descriptors = Object.getOwnPropertyDescriptors(app);
  descriptors.postRenderLifecycle = {
    value: postRenderLifecycle,
    enumerable: true,
    configurable: false,
    writable: false,
  };
  return Object.freeze(Object.defineProperties({}, descriptors));
}

function formatValue(value) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

function formatSignedNumber(value) {
  if (value === undefined || value === null || value === "") return "—";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number > 0 ? `+${number}` : String(number);
}
