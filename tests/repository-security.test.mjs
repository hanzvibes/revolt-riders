import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import test from "node:test";

const rootUrl = new URL("../", import.meta.url);
const privatePaths = [
  "DataMember.md",
  "members.csv",
  "public/members_import.csv",
];

async function exists(path) {
  try {
    await access(new URL(path, rootUrl), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function versionTuple(value) {
  const match = String(value).match(/(\d+)\.(\d+)\.(\d+)/);
  assert.ok(match, `Cannot parse semantic version from ${value}`);
  return match.slice(1).map(Number);
}

function isAtLeast(actual, minimum) {
  for (let index = 0; index < 3; index += 1) {
    if (actual[index] > minimum[index]) return true;
    if (actual[index] < minimum[index]) return false;
  }
  return true;
}

test("private member source files are not tracked or shipped", async () => {
  for (const path of privatePaths) {
    assert.equal(await exists(path), false, `${path} must not exist in the repository tree`);
  }
});

test("private member source paths stay ignored", async () => {
  const ignore = await readFile(new URL(".gitignore", rootUrl), "utf8");
  for (const path of ["/DataMember.md", "/members.csv", "/public/members_import.csv", "/private-data/"]) {
    assert.ok(ignore.split(/\r?\n/).includes(path), `${path} must be ignored`);
  }
});

test("Next.js stays on a patched release for GHSA-vcvr-r3jv-pc5j", async () => {
  const pkg = JSON.parse(await readFile(new URL("package.json", rootUrl), "utf8"));
  const actual = versionTuple(pkg.dependencies.next);
  assert.ok(isAtLeast(actual, [16, 3, 6]), `next ${pkg.dependencies.next} is below patched 16.3.6`);
});
