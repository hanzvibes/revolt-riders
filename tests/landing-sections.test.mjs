import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("landing page delegates only static sections", async () => {
  const page = await read("app/page.tsx");
  const sections = await read("app/landing-sections.tsx");

  assert.match(page, /<LandingCommunitySections \/>/);
  assert.match(page, /<LandingSocialSections \/>/);
  assert.match(sections, /id="about"/);
  assert.match(sections, /id="brotherhood"/);
  assert.match(sections, /id="values"/);
  assert.match(sections, /id="instagram"/);
  assert.match(sections, /partners-strip/);
  assert.match(sections, /closing-section/);
  assert.match(page, /onSubmit=\{handleSubmitJoin\}/);
  assert.match(page, /rpc\("submit_join_request"/);
  assert.match(page, /id="landing-mobile-drawer"/);
});

test("extracted static sections do not depend on parent mutable state", async () => {
  const sections = await read("app/landing-sections.tsx");
  assert.doesNotMatch(sections, /getSupabaseBrowserClient|useDataCache|useState|setIsJoinModalOpen/);
  assert.doesNotMatch(sections, /\buser\b|\bpublicEvents\b|\bgallery\b|\bcurrentYear\b/);
});
