import test from "node:test";
import assert from "node:assert/strict";

import {
  CHARACTER_MOBILE_COMPOSITION_MODULES,
  mountCharacterMobileCompositionRoot,
} from "../src/ui/mobile/CharacterMobileCompositionRoot.js";

test("composition root declares only independent mount modules", () => {
  assert.deepEqual(
    CHARACTER_MOBILE_COMPOSITION_MODULES.map(module => module.name),
    [
      "language-culture",
      "secondary-notes",
      "trait-edit",
      "skill-technique-edit",
      "language-culture-edit",
      "attack-edit",
      "equipment-edit",
      "equipment-container-selector",
      "spell-edit",
      "power-edit",
    ],
  );
  assert.equal(
    CHARACTER_MOBILE_COMPOSITION_MODULES.some(module => "bootstrap" in module),
    false,
  );
});

test("composition root mounts modules explicitly and destroys them in reverse order", () => {
  const calls = [];
  const app = createBaseApp(calls);
  const modules = [
    createModule("first", "firstMount", calls),
    createModule("second", "secondMount", calls),
    createModule("third", "thirdMount", calls),
  ];

  const mounted = mountCharacterMobileCompositionRoot(app, {}, modules);

  assert.deepEqual(calls, [
    "mount:first",
    "mount:second",
    "mount:third",
  ]);
  assert.equal(mounted.character, app.character);
  assert.equal(mounted.session, app.session);
  assert.equal(mounted.html, app.html);
  assert.equal(mounted.mode, app.mode);
  assert.equal(mounted.persistence, app.persistence);
  assert.equal(mounted.commands, app.commands);

  mounted.compositionRoot.destroy();

  assert.deepEqual(calls, [
    "mount:first",
    "mount:second",
    "mount:third",
    "destroy:third",
    "destroy:second",
    "destroy:first",
    "destroy:interactions",
    "destroy:mode-sync",
  ]);
});

function createBaseApp(calls) {
  const character = Object.freeze({ identity: Object.freeze({ id: "character-1" }) });
  const session = Object.freeze({ id: "session-1", character });

  return Object.freeze({
    get character() {
      return character;
    },
    get session() {
      return session;
    },
    get html() {
      return "<main></main>";
    },
    get mode() {
      return "creation";
    },
    interactions: Object.freeze({
      destroy() {
        calls.push("destroy:interactions");
      },
    }),
    modeSync: Object.freeze({
      sync() {},
      destroy() {
        calls.push("destroy:mode-sync");
      },
    }),
    ui: Object.freeze({}),
    persistence: Object.freeze({}),
    commands: Object.freeze({}),
    repositories: Object.freeze({}),
    runtime: Object.freeze({}),
    render() {},
  });
}

function createModule(name, destroyKey, calls) {
  return Object.freeze({
    name,
    destroyKey,
    mount(app) {
      calls.push(`mount:${name}`);
      return Object.freeze({
        get character() {
          return app.character;
        },
        get session() {
          return app.session;
        },
        get html() {
          return app.html;
        },
        get mode() {
          return app.mode;
        },
        interactions: app.interactions,
        modeSync: app.modeSync,
        ui: app.ui,
        persistence: app.persistence,
        commands: app.commands,
        repositories: app.repositories,
        runtime: app.runtime,
        render: app.render,
        [destroyKey]: Object.freeze({
          destroy() {
            calls.push(`destroy:${name}`);
          },
        }),
      });
    },
  });
}
