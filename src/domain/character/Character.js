// src/Character.js

/**
 * Character (Aggregate Root - SINGULAR)
 * -------------------------------------
 * Núcleo estrutural do personagem.
 * Não contém regras de GURPS.
 * Não contém lógica de UI.
 * Apenas composição + integridade estrutural.
 */

export class Character {
  constructor(input = {}) {
    this.identity = input.identity ?? this._defaultIdentity();

    this.attributes = input.attributes ?? this._defaultAttributes();
    this.secondaryCharacteristics =
      input.secondaryCharacteristics ?? this._defaultSecondary();

    this.pools = input.pools ?? this._defaultPools();

    this.advantages = input.advantages ?? [];
    this.disadvantages = input.disadvantages ?? [];
    this.quirks = input.quirks ?? [];

    this.skills = input.skills ?? [];
    this.techniques = input.techniques ?? [];

    this.spells = input.spells ?? [];
    this.powers = input.powers ?? [];

    this.equipment = input.equipment ?? [];
    this.attacks = input.attacks ?? [];

    this.languages = input.languages ?? [];
    this.familiarities = input.familiarities ?? [];

    this.templates = input.templates ?? [];

    this.state = input.state ?? this._defaultState();

    this._validateInvariants();
  }

  // ---------------------------
  // Defaults
  // ---------------------------

  _defaultIdentity() {
    return {
      id: cryptoRandomId(),
      name: "Unnamed",
      concept: "",
      playerId: null,
      campaignId: null,
    };
  }

  _defaultAttributes() {
    return {
      ST: 10,
      DX: 10,
      IQ: 10,
      HT: 10,
    };
  }

  _defaultSecondary() {
    return {
      HP: null,
      FP: null,
      Will: null,
      Perception: null,
      BasicSpeed: null,
      BasicMove: null,
    };
  }

  _defaultPools() {
    return {
      HP: { current: null, max: null },
      FP: { current: null, max: null },
      ER: { current: null, max: null },
    };
  }

  _defaultState() {
    return {
      conditions: [],
      modifiers: [],
      combat: {
        engaged: false,
      },
    };
  }

  // ---------------------------
  // Invariants
  // ---------------------------

  _validateInvariants() {
    if (!this.identity?.id) {
      throw new Error("Character must have a valid identity.id");
    }

    if (!this.attributes) {
      throw new Error("Character must have attributes");
    }

    const required = ["ST", "DX", "IQ", "HT"];

    for (const attr of required) {
      if (typeof this.attributes[attr] !== "number") {
        throw new Error(`Missing or invalid attribute: ${attr}`);
      }
    }

    if (!this.state) {
      throw new Error("Character must have state");
    }
  // ---------------------------
  // Serialization
  // ---------------------------

  toJSON() {
    return {
      identity: this.identity,
      attributes: this.attributes,
      secondaryCharacteristics: this.secondaryCharacteristics,
      pools: this.pools,
      advantages: this.advantages,
      disadvantages: this.disadvantages,
      quirks: this.quirks,
      skills: this.skills,
      techniques: this.techniques,
      spells: this.spells,
      powers: this.powers,
      equipment: this.equipment,
      attacks: this.attacks,
      languages: this.languages,
      familiarities: this.familiarities,
      templates: this.templates,
      state: this.state,
    };
  }
}

// ---------------------------
// util interno (sem dependência externa)
// ---------------------------

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `char_${Math.random().toString(36).slice(2, 10)}`;
}
