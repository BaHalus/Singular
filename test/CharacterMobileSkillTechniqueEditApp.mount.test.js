import test from "node:test";
import assert from "node:assert/strict";

import { mountCharacterMobileSkillTechniqueEditApp } from "../src/ui/mobile/CharacterMobileSkillTechniqueEditApp.js";

test("skill technique edit mount detaches only its own listener without observer", () => {
  const listeners = new Map();
  let observerConstructCalls = 0;
  let disconnectCalls = 0;
  let observeCalls = 0;
  let previousDestroyCalls = 0;
  let modeSyncCalls = 0;
  let renderCalls = 0;
  let registerCalls = 0;
  let unregisterCalls = 0;

  const root = createSkillTechniqueRoot(listeners);

  const MutationObserver = function MutationObserver() {
    observerConstructCalls += 1;
    return {
      observe() { observeCalls += 1; },
      disconnect() { disconnectCalls += 1; },
    };
  };

  const character = Object.freeze({
    identity: Object.freeze({ id: "character-1" }),
    skills: Object.freeze([]),
    techniques: Object.freeze([]),
  });
  const session = Object.freeze({ id: "session-1", character });
  const app = {
    character,
    session,
    mode: "creation",
    interactions: Object.freeze({}),
    modeSync: Object.freeze({ sync() { modeSyncCalls += 1; } }),
    ui: Object.freeze({ getState: () => Object.freeze({ busy: false }) }),
    persistence: Object.freeze({ getActiveSession: () => session }),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    postRenderLifecycle: Object.freeze({
      register(callback) {
        registerCalls += 1;
        assert.equal(typeof callback, "function");
        return () => { unregisterCalls += 1; };
      },
      run() {},
    }),
    render() { renderCalls += 1; },
    traitEdit: Object.freeze({ destroy() { previousDestroyCalls += 1; } }),
  };

  const mounted = mountCharacterMobileSkillTechniqueEditApp(app, { root, MutationObserver });

  assert.equal(listeners.has("click"), true);
  assert.equal(registerCalls, 1);
  assert.equal(observerConstructCalls, 0);
  assert.equal(observeCalls, 0);
  assert.equal(modeSyncCalls, 1);
  assert.equal(renderCalls, 0);
  assert.equal(mounted.character, app.character);
  assert.equal(mounted.session, app.session);
  assert.match(mounted.html, /data-role="skill-editor"/);
  assert.match(mounted.html, /data-role="technique-editor"/);

  mounted.skillTechniqueEdit.destroy();

  assert.equal(listeners.has("click"), false);
  assert.equal(unregisterCalls, 1);
  assert.equal(disconnectCalls, 0);
  assert.equal(previousDestroyCalls, 0);
});

function createSkillTechniqueRoot(listeners) {
  const header = { nextSibling: null };
  const root = {
    innerHTML: [
      "<main data-singular-mobile-root>",
      '<section class="singular-mobile-sheet__card" data-card="skills-techniques">',
      "<h2>Perícias e Técnicas</h2>",
      "</section>",
      "</main>",
    ].join(""),
    ownerDocument: null,
    querySelector(selector) {
      if (selector === '[data-card="skills-techniques"]') return section;
      return null;
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    setAttribute() {},
  };

  const section = {
    ownerDocument: null,
    querySelector(selector) {
      return selector === "h2" ? header : null;
    },
    append(...nodes) {
      const sectionEnd = root.innerHTML.indexOf("</section>");
      assert.notEqual(sectionEnd, -1);
      const renderedNodes = nodes.map(node => String(node)).join("");
      root.innerHTML = `${root.innerHTML.slice(0, sectionEnd)}${renderedNodes}${root.innerHTML.slice(sectionEnd)}`;
    },
  };

  root.ownerDocument = {
    createElement(tagName) {
      assert.equal(tagName, "template");
      return createTemplateElement();
    },
  };
  section.ownerDocument = root.ownerDocument;

  return root;
}

function createTemplateElement() {
  return {
    content: { childNodes: [] },
    set innerHTML(value) { this.content.childNodes = [value]; },
  };
}
