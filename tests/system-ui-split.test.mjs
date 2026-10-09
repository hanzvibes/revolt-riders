import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const files = ["app/system-ui.css", "app/system-ui-features.css", "app/system-ui-refinements.css"];

test("CSS import order matches the original cascade", async () => {
  const layout = await read("app/layout.tsx");
  let position = -1;
  for (const file of files) {
    const next = layout.indexOf(`import "./${file.slice(4)}";`);
    assert.ok(next > position, file);
    position = next;
  }
});
test("CSS file split retains expected section boundaries", async () => {
  const [core, features, refinements] = await Promise.all(files.map(read));
  assert.ok(core.startsWith("/* Revolt Riders system-wide premium UI layer."));
  assert.ok(features.startsWith("/* Dashboard density pass:"));
  assert.ok(refinements.startsWith("/* Remove decorative red kicker text system-wide */"));
  assert.ok([core, features, refinements].every(chunk => chunk.length > 10000));
});
