import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

// TDD guardrails for delivery-safety infrastructure.
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const exists = async (path) => {
  try {
    await access(new URL(`../${path}`, import.meta.url), constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

test("normal CI isolates mutable production database integrity checks", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.scripts.test, "node --test tests/**/*.test.mjs");
  assert.equal(
    pkg.scripts["test:production-integrity"],
    "node --test tests/production/database-integrity.mjs",
  );

  assert.equal(await exists("tests/database-integrity.test.mjs"), false);
  assert.equal(await exists("tests/production/database-integrity.mjs"), true);

  const workflow = await read(".github/workflows/ui-quality.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  schedule:/m);
  assert.match(workflow, /production_integrity:/);
  assert.match(workflow, /name: Production database integrity/);
  assert.match(workflow, /pnpm test:production-integrity/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);

});

test("main CI gates high production dependency vulnerabilities", async () => {
  const workflow = await read(".github/workflows/ui-quality.yml");
  assert.match(workflow, /Production dependency audit/);
  assert.match(workflow, /pnpm audit --prod --audit-level high/);
});

test("main CI runs a real non-destructive Chrome browser smoke flow", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(
    pkg.scripts["test:browser"],
    "node --test tests/browser/public-smoke.mjs",
  );
  assert.equal(await exists("tests/browser/public-smoke.test.mjs"), false);
  assert.equal(await exists("tests/browser/public-smoke.mjs"), true);

  const workflow = await read(".github/workflows/ui-quality.yml");
  assert.match(workflow, /google-chrome --version/);
  assert.match(workflow, /chromedriver --version/);
  assert.match(workflow, /Browser smoke/);
  assert.match(workflow, /pnpm test:browser/);
});
