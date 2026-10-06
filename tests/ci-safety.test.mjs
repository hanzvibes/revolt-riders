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
  assert.match(pkg.scripts.test, /--test-name-pattern|--test-reporter|--test-only|--test-concurrency|--experimental-test-isolation|--test/);
  assert.doesNotMatch(pkg.scripts.test, /database-integrity\.test\.mjs/);
  assert.equal(pkg.scripts["test:production-integrity"], "node --test tests/database-integrity.test.mjs");

  assert.equal(await exists(".github/workflows/production-integrity.yml"), true);
  const workflow = await read(".github/workflows/production-integrity.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /pnpm test:production-integrity/);
});

test("main CI gates high production dependency vulnerabilities", async () => {
  const workflow = await read(".github/workflows/ui-quality.yml");
  assert.match(workflow, /Production dependency audit/);
  assert.match(workflow, /pnpm audit --prod --audit-level high/);
});

test("main CI runs a real non-destructive Chromium smoke flow", async () => {
  const pkg = JSON.parse(await read("package.json"));
  assert.equal(pkg.scripts["test:browser"], "playwright test");
  assert.ok(pkg.devDependencies?.["@playwright/test"], "@playwright/test must be a dev dependency");
  assert.equal(await exists("playwright.config.ts"), true);
  assert.equal(await exists("tests/browser/public-smoke.spec.ts"), true);

  const workflow = await read(".github/workflows/ui-quality.yml");
  assert.match(workflow, /playwright install.*chromium/i);
  assert.match(workflow, /Browser smoke/);
  assert.match(workflow, /pnpm test:browser/);
});
