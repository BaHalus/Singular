import { createCharacter } from "../character/Character.js";
import { createImportSnapshot } from "./ImportSnapshot.js";
import { importIdentity } from "./importers/IdentityImporter.js";
import {
  importAttributes,
  importSecondaryCharacteristics,
} from "./importers/AttributesImporter.js";
import { importTraits } from "./importers/TraitsImporter.js";

export function createSnapshotFromGcs(source = {}) {
  return createImportSnapshot({
    identity: importIdentity(source),
    attributes: importAttributes(source),
    secondaryCharacteristics: importSecondaryCharacteristics(source),
    traits: importTraits(source),
    raw: source,
  });
}

export function importCharacter(source = {}) {
  const snapshot = createSnapshotFromGcs(source);

  return createCharacter({
    identity: snapshot.identity,
    attributes: snapshot.attributes,
    secondaryCharacteristics: snapshot.secondaryCharacteristics,

    advantages: snapshot.traits.advantages,
    perks: snapshot.traits.perks,
    disadvantages: snapshot.traits.disadvantages,
    quirks: snapshot.traits.quirks,
  });
}
