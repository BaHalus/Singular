import { resolveSkillTechniqueMechanics } from "../../engine/skills/SkillTechniqueMechanicsResolver.js";

export function mountCharacterMobileSkillTechniqueMechanicsProjection(app) {
  const lifecycle = app.postRenderLifecycle;
  if (typeof lifecycle?.register !== "function") {
    throw new Error("Skill technique mechanics projection requires post-render lifecycle");
  }

  const unregister = lifecycle.register(({ root, character }) => {
    const report = resolveSkillTechniqueMechanics({
      attributes: character.attributes,
      secondaryCharacteristics: character.secondaryCharacteristics,
      skills: character.skills,
      techniques: character.techniques,
    });
    projectResults(root, "data-skill-id", report.skills);
    projectResults(root, "data-technique-id", report.techniques);
  });

  return Object.freeze({
    ...app,
    skillTechniqueMechanicsProjection: Object.freeze({ destroy: unregister }),
  });
}

function projectResults(root, attribute, results) {
  const items = [...root.querySelectorAll?.(`[${attribute}]`) ?? []];
  for (const result of results) {
    const item = items.find(candidate => candidate.getAttribute(attribute) === result.id);
    const container = item?.querySelector?.("dd") ?? null;
    if (container === null) continue;
    container.querySelector?.("[data-role='skill-technique-mechanics']")?.remove();
    const summary = container.ownerDocument.createElement("small");
    summary.dataset.role = "skill-technique-mechanics";
    summary.dataset.authority = "engine.skills-techniques";
    summary.dataset.status = result.status;
    summary.textContent = formatResult(result);
    container.append(" ", summary);
  }
}

function formatResult(result) {
  if (result.status !== "resolved") return `NH bloqueado · ${result.diagnostics.join(", ")}`;
  const diagnostics = result.diagnostics.length === 0 ? "" : ` · ${result.diagnostics.join(", ")}`;
  const relative = result.relativeLevel > 0 ? `+${result.relativeLevel}` : String(result.relativeLevel);
  return `NH ${result.level} · rel. ${relative} · base ${result.base}${diagnostics}`;
}
