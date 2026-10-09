import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

async function exists(path) {
  try {
    await access(new URL(path, root), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test("legacy Vinext Cloudflare D1 starter files are absent", async () => {
  const obsolete = [
    ".openai/hosting.json",
    "build/sites-vite-plugin.ts",
    "build/sites-vite-plugin.LICENSE",
    "cloudflare-env.d.ts",
    "db/index.ts",
    "db/schema.ts",
    "drizzle.config.ts",
    "drizzle/meta/_journal.json",
    "examples/d1/app/api/notes/route.ts",
    "examples/d1/db/schema.ts",
    "vite.config.ts",
    "scripts/install-ci.mjs",
    "scripts/install-ci.sh",
    "scripts/install-pnpm.sh",
    "scripts/pnpm-install.mjs",
    "scripts/run-framework.mjs",
    "scripts/sites-env.mjs",
    "scripts/sites-env.sh",
    "scripts/execution-profile.mjs",
    "scripts/build-verified.sh",
  ];

  for (const path of obsolete) {
    assert.equal(await exists(path), false, `${path} must be removed`);
  }
});

test("package manifest contains only the active Next Vercel Supabase toolchain", async () => {
  const pkg = JSON.parse(await read("package.json"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  assert.equal(pkg.name, "revolt-riders");
  assert.equal(pkg.scripts["install:ci"], undefined);
  assert.equal(pkg.scripts["db:generate"], undefined);

  for (const name of [
    "@cloudflare/vite-plugin",
    "@cloudflare/workers-types",
    "@vitejs/plugin-react",
    "@vitejs/plugin-rsc",
    "drizzle-kit",
    "drizzle-orm",
    "vinext",
    "vite",
    "wrangler",
  ]) {
    assert.equal(deps[name], undefined, `${name} must not remain as a direct dependency`);
  }
});

test("TypeScript and pnpm config no longer carry Cloudflare runtime policy", async () => {
  const tsconfig = JSON.parse(await read("tsconfig.json"));
  const workspace = await read("pnpm-workspace.yaml");

  assert.deepEqual(tsconfig.compilerOptions.types, ["node"]);
  assert.doesNotMatch(workspace, /SITES_/);
  assert.doesNotMatch(workspace, /miniflare/);
  assert.doesNotMatch(workspace, /workerd/);
});

test("README documents the real application and executable commands", async () => {
  const readme = await read("README.md");
  const pkg = JSON.parse(await read("package.json"));

  assert.match(readme, /^# Revolt Riders/m);
  assert.match(readme, /Next\.js/i);
  assert.match(readme, /Supabase/i);
  assert.match(readme, /Vercel/i);
  assert.doesNotMatch(readme, /# vinext-starter/i);

  for (const command of ["dev", "build", "start", "lint", "test", "audit:ui"]) {
    assert.ok(pkg.scripts[command], `package script ${command} must exist`);
    assert.match(readme, new RegExp(`pnpm ${command.replace(":", "\\:")}`));
  }
});
