import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

const importTsModule = async (path) => {
  const source = await read(path);
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
};

const activeAdmin = {
  member_external_id: "RR-001",
  role: "admin",
  status: "active",
};

test("access cache keeps data when the same member access is refreshed", async () => {
  const { hasMemberAccessChanged } = await importTsModule(
    "context/access-cache-policy.ts",
  );

  assert.equal(hasMemberAccessChanged(activeAdmin, { ...activeAdmin }), false);
  assert.equal(hasMemberAccessChanged(null, activeAdmin), false);
});

test("access cache invalidates when member identity, role, or status changes", async () => {
  const { hasMemberAccessChanged } = await importTsModule(
    "context/access-cache-policy.ts",
  );

  assert.equal(
    hasMemberAccessChanged(activeAdmin, { ...activeAdmin, role: "member" }),
    true,
  );
  assert.equal(
    hasMemberAccessChanged(activeAdmin, { ...activeAdmin, status: "inactive" }),
    true,
  );
  assert.equal(
    hasMemberAccessChanged(activeAdmin, {
      ...activeAdmin,
      member_external_id: "RR-002",
    }),
    true,
  );
});

test("access cache fails closed when a previously authorized account disappears", async () => {
  const { hasMemberAccessChanged } = await importTsModule(
    "context/access-cache-policy.ts",
  );
  const cache = await read("context/data-cache-context.tsx");

  assert.equal(hasMemberAccessChanged(activeAdmin, null), true);
  assert.equal(hasMemberAccessChanged(null, null), false);
  assert.match(cache, /const failClosedAccess = useCallback/);
  assert.match(cache, /if \(accountError\) \{\s*failClosedAccess\(/);
  assert.match(
    cache,
    /catch \{\s*failClosedAccess\("Gagal memeriksa sesi pengguna\."\)/,
  );
});

test("stale in-flight requests cannot repopulate cache after an access boundary change", async () => {
  const cache = await read("context/data-cache-context.tsx");

  assert.match(cache, /const cacheEpochRef = useRef\(0\)/);
  assert.match(cache, /cacheEpochRef\.current \+= 1/);
  assert.match(cache, /const requestEpoch = cacheEpochRef\.current/);
  assert.match(cache, /if \(cacheEpochRef\.current === requestEpoch\)/);
  assert.match(
    cache,
    /hasMemberAccessChanged\(accountRef\.current, nextAccount\)/,
  );
});
