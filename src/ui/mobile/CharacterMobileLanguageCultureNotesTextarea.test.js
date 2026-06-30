import test from "node:test";
import assert from "node:assert/strict";

import { injectMobileLanguageCultureEditControls } from "./CharacterMobileLanguageCultureEditApp.js";

const html = [
  '<section data-card="language-culture"><h2>Idiomas e Cultura</h2><dl>',
  '<div data-entry-kind="language" data-canonical-id="language:common"><dt>Idioma</dt><dd>Comum</dd></div>',
  '<div data-entry-kind="familiarity" data-canonical-id="familiarity:yrth"><dt>Familiaridade</dt><dd>Yrth</dd></div>',
  '</dl></section>',
].join("");

function character() {
  return {
    languages: [{
      id: "language:common",
      name: "Comum",
      spokenLevel: "native",
      writtenLevel: "accented",
      isNative: true,
      tags: ["materno"],
      notes: "Idioma de campanha",
    }],
    familiarities: [{
      id: "familiarity:yrth",
      name: "Yrth",
      isNative: false,
      tags: ["banestorm"],
      notes: "Conhece costumes locais",
    }],
  };
}

test("renders language and familiarity notes as textareas", () => {
  const source = character();
  source.languages[0].notes = `Linha 1
Linha 2 com & < >`;
  source.familiarities[0].notes = `Costumes
Etiqueta local`;

  const rendered = injectMobileLanguageCultureEditControls(html, source, "creation");

  assert.ok(rendered.includes(
    `<textarea data-role="language-edit-notes-language:common" autocomplete="off">
Linha 1
Linha 2 com &amp; &lt; &gt;</textarea>`,
  ));
  assert.ok(rendered.includes(
    `<textarea data-role="familiarity-edit-notes-familiarity:yrth" autocomplete="off">
Costumes
Etiqueta local</textarea>`,
  ));
  assert.doesNotMatch(rendered, /data-role="language-edit-notes-language:common" value=/);
  assert.doesNotMatch(rendered, /data-role="familiarity-edit-notes-familiarity:yrth" value=/);
});

test("preserves leading blank lines in language and familiarity notes", () => {
  const source = character();
  source.languages[0].notes = `
Linha inicial do idioma`;
  source.familiarities[0].notes = `
Linha inicial cultural`;

  const rendered = injectMobileLanguageCultureEditControls(html, source, "creation");

  assert.ok(rendered.includes(
    `<textarea data-role="language-edit-notes-language:common" autocomplete="off">

Linha inicial do idioma</textarea>`,
  ));
  assert.ok(rendered.includes(
    `<textarea data-role="familiarity-edit-notes-familiarity:yrth" autocomplete="off">

Linha inicial cultural</textarea>`,
  ));
});

test("keeps language culture note editors out of table mode", () => {
  const rendered = injectMobileLanguageCultureEditControls(html, character(), "table");

  assert.doesNotMatch(rendered, /data-role="language-inline-editor"/);
  assert.doesNotMatch(rendered, /data-role="familiarity-inline-editor"/);
  assert.match(rendered, /Comum/);
  assert.match(rendered, /Yrth/);
});
