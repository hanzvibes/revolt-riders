import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("floating bottom navigation geometry has one CSS owner", async () => {
  const systemUi = await read("app/system-ui.css");
  const bottomNav = await read("app/bottom-navigation.css");

  assert.doesNotMatch(systemUi, /\/\* Floating bottom nav \*\//);
  assert.doesNotMatch(systemUi, /\/\* Compact mobile bottom navigation spacing \*\//);
  assert.match(bottomNav, /\.app-shell \.bottom/);
  assert.match(bottomNav, /grid-template-columns:\s*repeat\(5,/);
  assert.match(bottomNav, /safe-area-inset-bottom/);
});

test("dedicated bottom navigation stylesheet does not escalate with important", async () => {
  const bottomNav = await read("app/bottom-navigation.css");
  assert.equal((bottomNav.match(/!important/g) || []).length, 0);
});

test("bottom navigation keeps desktop hiding and reduced-motion behavior", async () => {
  const bottomNav = await read("app/bottom-navigation.css");

  assert.match(bottomNav, /@media\s*\(min-width:\s*721px\)/);
  assert.match(bottomNav, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(bottomNav, /transition:\s*none/);
});
