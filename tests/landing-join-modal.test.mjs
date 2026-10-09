import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const read = (file) => readFile(new URL(`../${file}`, import.meta.url), "utf8");

test("registration view owns inputs while page retains submission and modal state", async () => {
  const page = await read("app/page.tsx");
  const modal = await read("app/landing-join-modal.tsx");
  assert.match(page, /<LandingJoinModal/);
  assert.match(page, /rpc\("submit_join_request"/);
  assert.match(page, /onSubmit=\{handleSubmitJoin\}/);
  assert.match(page, /onReset=\{resetForm\}/);
  for (const id of ["join-full-name", "join-birth-place", "join-birth-date", "join-city", "join-instagram", "join-whatsapp"]) {
    assert.match(modal, new RegExp(`id="${id}"`));
    assert.match(modal, new RegExp(`htmlFor="${id}"`));
  }
  assert.match(modal, /role="alert"/);
  assert.match(modal, /aria-busy=\{formSubmitting\}/);
  assert.doesNotMatch(modal, /getSupabaseBrowserClient|submit_join_request/);
});

test("temporary dependency repair workflow is removed after patched lockfile is committed", async () => {
  const workflow = await read(".github/workflows/ui-quality.yml");
  const pkg = JSON.parse(await read("package.json"));
  assert.doesNotMatch(workflow, /dependency_lock_repair:/);
  assert.match(workflow, /Production dependency audit/);
  assert.equal(pkg.dependencies.next, "16.3.8");
});
