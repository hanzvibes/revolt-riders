import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("garage page delegates data, mutations, and form lifecycle", async () => {
  const page = await read("app/garage/page.tsx");
  const controller = await read(
    "app/garage/garage-controller.ts",
  );
  const data = await read("app/garage/garage-data.ts");
  const actions = await read(
    "app/garage/garage-actions.ts",
  );
  const form = await read(
    "app/garage/garage-form-sheet.tsx",
  );

  assert.ok(page.length < 16_000);
  assert.match(page, /useGarageController/);
  assert.match(page, /GarageFormSheet/);
  assert.doesNotMatch(page, /\buseState\s*\(/);
  assert.doesNotMatch(page, /\buseEffect\s*\(/);
  assert.doesNotMatch(page, /getSupabaseBrowserClient/);
  assert.doesNotMatch(page, /\.rpc\(/);

  assert.match(controller, /fetchWithCache<Motorcycle\[\]>/);
  assert.match(controller, /"garage:" \+ memberExternalId/);
  assert.match(controller, /ttlMs: 90_000/);
  assert.match(controller, /saveMotorcycleRecord/);
  assert.match(controller, /deleteMotorcycleRecord/);
  assert.match(controller, /confirmAction/);

  assert.match(data, /from\("member_motorcycles"\)/);
  assert.match(actions, /save_member_motorcycle/);
  assert.match(actions, /delete_member_motorcycle/);
  assert.match(form, /garage-form/);
  assert.match(form, /Primary bike/);
});

test("garage form model preserves primary and visibility defaults", async () => {
  const model = await read("app/garage/garage-model.ts");

  assert.match(model, /isPrimary: false/);
  assert.match(model, /isVisibleToMembers: true/);
  assert.match(model, /motorcycleToForm/);
  assert.match(model, /getPrimaryMotorcycle/);
});

test("garage delete remains destructive and RPC-only", async () => {
  const controller = await read(
    "app/garage/garage-controller.ts",
  );
  const actions = await read(
    "app/garage/garage-actions.ts",
  );

  assert.match(controller, /confirmLabel: "Hapus Motor"/);
  assert.match(controller, /destructive: true/);
  assert.match(controller, /if \(!confirmed\) return/);
  assert.match(actions, /rpc\(\s*"delete_member_motorcycle"/);
  assert.doesNotMatch(
    actions,
    /from\("member_motorcycles"\)\.(insert|update|delete)/,
  );
});

test("garage save and delete error paths remain explicit", async () => {
  const controller = await read(
    "app/garage/garage-controller.ts",
  );
  const actions = await read(
    "app/garage/garage-actions.ts",
  );

  assert.match(controller, /Data motor belum dapat disimpan\./);
  assert.match(controller, /Motor belum dapat dihapus\./);
  assert.match(actions, /if \(error\) throw error/);
});
