export function addTechnique(techniques, technique) {
  return [
    ...techniques,
    technique,
  ];
}

export function removeTechnique(techniques, techniqueId) {
  return techniques.filter(
    technique => technique.id !== techniqueId
  );
}

export function renameTechnique(techniques, techniqueId, name) {
  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          name: String(name),
        }
      : technique
  );
}

export function updateTechniqueNotes(techniques, techniqueId, notes) {
  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          notes: String(notes),
        }
      : technique
  );
}

export function setTechniqueSpecialization(techniques, techniqueId, specialization) {
  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          specialization: String(specialization),
        }
      : technique
  );
}

export function setTechniqueSkillReference(techniques, techniqueId, skillId, skillName) {
  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          skillId,
          skillName: String(skillName),
        }
      : technique
  );
}

export function setTechniqueDifficulty(techniques, techniqueId, difficulty) {
  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          difficulty,
        }
      : technique
  );
}

export function setTechniquePoints(techniques, techniqueId, points) {
  if (typeof points !== "number" || points < 0) {
    throw new Error("Technique points must be non-negative number");
  }

  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          points,
        }
      : technique
  );
}

export function setTechniqueImportedLevel(techniques, techniqueId, importedLevel) {
  if (importedLevel !== null && typeof importedLevel !== "number") {
    throw new Error("Technique importedLevel must be number or null");
  }

  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          importedLevel,
        }
      : technique
  );
}

export function addTechniqueTag(techniques, techniqueId, tag) {
  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          tags: technique.tags.includes(tag)
            ? technique.tags
            : [
                ...technique.tags,
                tag,
              ],
        }
      : technique
  );
}

export function removeTechniqueTag(techniques, techniqueId, tag) {
  return techniques.map(technique =>
    technique.id === techniqueId
      ? {
          ...technique,
          tags: technique.tags.filter(
            existingTag => existingTag !== tag
          ),
        }
      : technique
  );
}
