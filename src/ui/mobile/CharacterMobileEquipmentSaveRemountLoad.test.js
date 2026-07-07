import test from "node:test";
import assert from "node:assert/strict";

import { createCharacter } from "../../domain/character/Character.js";
import {
  bootstrapCharacterMobileCompositionRoot,
} from "./CharacterMobileCompositionRoot.js";

function character() {
  return createCharacter({
    identity: {
      id: "character-a6-equipment-save-remount-load",
      name: "Ayla",
      concept: "Batedora com carga",
    },
    metadata: {
      createdAt: "2026-07-06T20:10:00.000Z",
      updatedAt: "2026-07-06T20:10:00.000Z",
      source: "alpha-a6-equipment-save-remount-load",
    },
  });
}

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
  };
}

function runtime() {
  let sequence = 0;
  return {
    clock: { now: () => "2026-07-06T20:10:00.000Z" },
    idGenerator: {
      next(prefix) {
        sequence += 1;
        return `${prefix}:a6-save-remount-load-${sequence}`;
      },
    },
  };
}

function rootFixture() {
  const attributes = new Map();
  const listeners = new Map();
  const inputValues = new Map();
  let innerHtml = "";
  const documentRef = {
    createElement(tagName) {
      return createElement(tagName, documentRef);
    },
  };
  let equipmentEditor = createEquipmentEditor(documentRef);
  return {
    get innerHTML() {
      return innerHtml;
    },
    set innerHTML(value) {
      innerHtml = String(value);
      equipmentEditor = createEquipmentEditor(documentRef);
    },
    ownerDocument: documentRef,
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    addEventListener(type, listener, options = {}) {
      const entries = listeners.get(type) ?? [];
      if (options?.capture) entries.unshift(listener);
      else entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter(entry => entry !== listener));
    },
    querySelector(selector) {
      if (selector === '[data-role="equipment-editor"]') {
        return innerHtml.includes('data-role="equipment-editor"')
          ? equipmentEditor
          : null;
      }
      if (selector === '[data-role="equipment-container-id"]') {
        return equipmentEditor.querySelector(selector);
      }
      if (inputValues.has(selector)) return { value: inputValues.get(selector) };
      return null;
    },
    querySelectorAll() {
      return [];
    },
    setInput(selector, value) {
      inputValues.set(selector, value);
    },
    async dispatch(type, event) {
      const entries = [...(listeners.get(type) ?? [])];
      let stopped = false;
      const wrappedEvent = {
        ...event,
        preventDefault() {
          event.preventDefault?.();
        },
        stopImmediatePropagation() {
          stopped = true;
          event.stopImmediatePropagation?.();
        },
      };
      for (const listener of entries) {
        await listener(wrappedEvent);
        if (stopped) break;
      }
    },
  };
}

function createEquipmentEditor(documentRef) {
  const button = createElement("button", documentRef);
  const editor = createElement("div", documentRef);
  button.parentElement = editor;
  button.setAttribute("data-action", "equipment-add");
  editor.children.push(button);
  editor.ownerDocument = documentRef;
  editor.querySelector = selector => {
    if (selector === '[data-role="equipment-container-id"]') {
      return findElementByAttribute(editor, "data-role", "equipment-container-id");
    }
    if (selector === '[data-action="equipment-add"]') return button;
    return null;
  };
  editor.insertBefore = (child, before) => {
    child.parentElement = editor;
    const index = editor.children.indexOf(before);
    if (index === -1) editor.children.push(child);
    else editor.children.splice(index, 0, child);
  };
  editor.append = child => {
    child.parentElement = editor;
    editor.children.push(child);
  };
  return editor;
}

function createElement(tagName, documentRef) {
  return {
    tagName,
    ownerDocument: documentRef,
    parentElement: null,
    textContent: "",
    value: "",
    attributes: new Map(),
    children: [],
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
      if (name === "data-role" && value === "equipment-container-id") {
        this.value = "";
      }
    },
    append(child) {
      child.parentElement = this;
      this.children.push(child);
    },
  };
}

function findElementByAttribute(element, name, value) {
  if (element.attributes?.get(name) === value) return element;
  for (const child of element.children ?? []) {
    const match = findElementByAttribute(child, name, value);
    if (match !== null) return match;
  }
  return null;
}

function click(action) {
  return {
    target: {
      dataset: { action },
      parentElement: null,
    },
    preventDefault() {},
  };
}

function fillEquipment(root, input) {
  root.setInput('[data-role="equipment-name"]', input.name);
  root.setInput('[data-role="equipment-kind"]', input.kind);
  root.setInput('[data-role="equipment-quantity"]', String(input.quantity));
  root.setInput('[data-role="equipment-weight-kg"]', String(input.weightKg));
  root.setInput('[data-role="equipment-cost"]', String(input.cost));
  root.setInput('[data-role="equipment-state"]', input.state);
  root.setInput('[data-role="equipment-notes"]', input.notes);
}

function assertContainerSelector(select, containerId) {
  assert.notEqual(select, null);
  assert.equal(select.tagName, "select");
  assert.deepEqual(select.children.map(option => ({
    value: option.value,
    text: option.textContent,
  })), [
    { value: "", text: "Raiz do inventário" },
    { value: containerId, text: "Mochila" },
  ]);
}

test("A6 mobile equipment containers survive save, remount and load with visible totals", async () => {
  const storage = createMemoryStorage();
  const namespace = "test.mobile.a6-equipment-save-remount-load";
  const firstRoot = rootFixture();
  const mounted = await bootstrapCharacterMobileCompositionRoot({
    root: firstRoot,
    character: character(),
    sessionId: "session-a6-equipment-save-remount-load",
    storage,
    namespace,
    runtime: runtime(),
    mode: "creation",
  });

  fillEquipment(firstRoot, {
    name: "Mochila",
    kind: "container",
    quantity: 1,
    weightKg: 0.5,
    cost: 60,
    state: "carried",
    notes: "Recipiente principal",
  });
  await firstRoot.dispatch("click", click("equipment-add"));

  const containerId = mounted.character.equipment[0].id;
  const containerSelect = firstRoot.querySelector('[data-role="equipment-container-id"]');
  assertContainerSelector(containerSelect, containerId);
  containerSelect.value = containerId;

  fillEquipment(firstRoot, {
    name: "Corda 15 m",
    kind: "item",
    quantity: 2,
    weightKg: 1.5,
    cost: 30,
    state: "stored",
    notes: "Guardada dentro da mochila",
  });
  await firstRoot.dispatch("click", click("equipment-add"));

  assert.equal(firstRoot.getAttribute("data-last-command-status"), "applied");
  assert.equal(mounted.session.history[0].commandType, "equipment.add");
  assert.equal(mounted.session.history[1].commandType, "equipment.add-child");
  assert.equal(mounted.character.equipment.length, 1);
  assert.equal(mounted.character.equipment[0].children.length, 1);
  assert.equal(mounted.character.equipment[0].children[0].name, "Corda 15 m");
  assert.match(firstRoot.innerHTML, /Mochila/);
  assert.match(firstRoot.innerHTML, /Corda 15 m/);
  assert.match(firstRoot.innerHTML, /data-depth="1"/);
  assert.match(firstRoot.innerHTML, /<dt>Quantidade<\/dt><dd>3<\/dd>/);
  assert.match(firstRoot.innerHTML, /<dt>Peso<\/dt><dd>3.5 kg<\/dd>/);
  assert.match(firstRoot.innerHTML, /Guardado/);

  await firstRoot.dispatch("click", click("persistence-save"));
  const saved = await mounted.repositories.session.load("session-a6-equipment-save-remount-load");

  assert.match(saved.character.equipment[0].children[0].id, /^equipment:a6-save-remount-load-/);
  assert.notEqual(saved.character.equipment[0].children[0].id, containerId);
  assert.equal(saved.character.equipment[0].children[0].state, "stored");

  mounted.compositionRoot.destroy();

  const remountRoot = rootFixture();
  const remounted = await bootstrapCharacterMobileCompositionRoot({
    root: remountRoot,
    character: character(),
    sessionId: "session-a6-equipment-save-remount-load",
    storage,
    namespace,
    runtime: runtime(),
    mode: "creation",
  });
  await remountRoot.dispatch("click", click("persistence-load"));

  assert.equal(remounted.character.equipment.length, 1);
  assert.equal(remounted.character.equipment[0].id, containerId);
  assert.equal(remounted.character.equipment[0].children.length, 1);
  assert.equal(remounted.character.equipment[0].children[0].name, "Corda 15 m");
  assert.equal(remounted.character.equipment[0].children[0].state, "stored");
  assert.match(remountRoot.innerHTML, /Mochila/);
  assert.match(remountRoot.innerHTML, /Corda 15 m/);
  assert.match(remountRoot.innerHTML, /data-depth="1"/);
  assert.match(remountRoot.innerHTML, /<dt>Peso<\/dt><dd>3.5 kg<\/dd>/);
  assert.match(remountRoot.innerHTML, /<dt>Custo<\/dt><dd>\$ 120<\/dd>/);
});
