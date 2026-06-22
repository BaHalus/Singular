import { validateCharacter } from "../character/Character.js";
import { evaluateCharacterPointDomains } from "./CharacterPointDomains.js";
import { createPointLedger } from "./PointLedger.js";

export function evaluateCharacterPointLedger(character) {
  validateCharacter(character);
  const domains = evaluateCharacterPointDomains(character);
  return createPointLedger({
    characterId: character.identity.id,
    pointBudget: character.pointBudget,
    domainReports: domains.reports,
    discrepancies: domains.discrepancies,
  });
}
