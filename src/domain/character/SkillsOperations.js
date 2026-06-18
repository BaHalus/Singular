export function addSkill(skills, skill) {
  return [
    ...skills,
    skill,
  ];
}

export function removeSkill(skills, skillId) {
  return skills.filter(
    skill => skill.id !== skillId
  );
}

export function renameSkill(skills, skillId, name) {
  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          name: String(name),
        }
      : skill
  );
}

export function updateSkillNotes(skills, skillId, notes) {
  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          notes: String(notes),
        }
      : skill
  );
}

export function setSkillSpecialization(skills, skillId, specialization) {
  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          specialization: String(specialization),
        }
      : skill
  );
}

export function setSkillBase(skills, skillId, attribute, difficulty) {
  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          attribute,
          difficulty,
        }
      : skill
  );
}

export function setSkillPoints(skills, skillId, points) {
  if (typeof points !== "number" || points < 0) {
    throw new Error("Skill points must be non-negative number");
  }

  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          points,
        }
      : skill
  );
}

export function setSkillImportedLevel(skills, skillId, importedLevel) {
  if (importedLevel !== null && typeof importedLevel !== "number") {
    throw new Error("Skill importedLevel must be number or null");
  }

  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          importedLevel,
        }
      : skill
  );
}

export function addSkillTag(skills, skillId, tag) {
  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          tags: skill.tags.includes(tag)
            ? skill.tags
            : [
                ...skill.tags,
                tag,
              ],
        }
      : skill
  );
}

export function removeSkillTag(skills, skillId, tag) {
  return skills.map(skill =>
    skill.id === skillId
      ? {
          ...skill,
          tags: skill.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : skill
  );
}
