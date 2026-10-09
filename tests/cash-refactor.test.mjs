import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) =>
  readFile(new URL("../" + path, import.meta.url), "utf8");

test("cash screen delegates data, mutations, and derived state", async () => {
  const screen = await read("components/cash-screen.tsx");
  const controller = await read(
    "components/cash-screen-controller.ts",
  );
  const data = await read("components/cash-data.ts");
  const actions = await read("components/cash-actions.ts");
  const model = await read("components/cash-model.ts");

  assert.ok(
    screen.length < 22_000,
    "cash screen should stay presentation-focused",
  );
  assert.match(screen, /useCashScreenController/);
  assert.doesNotMatch(screen, /\buseState\s*\(/);
  assert.doesNotMatch(screen, /\buseEffect\s*\(/);
  assert.doesNotMatch(screen, /getSupabaseBrowserClient/);
  assert.doesNotMatch(screen, /fetchWithCache/);
  assert.doesNotMatch(screen, /promptAction/);

  assert.match(controller, /useMemberAccess/);
  assert.match(controller, /fetchWithCache<CashSnapshot>/);
  assert.match(controller, /ttlMs: 30_000/);
  assert.match(controller, /deriveCashWorkspace/);
  assert.match(controller, /createCashTransaction/);
  assert.match(controller, /voidCashTransaction/);

  assert.match(data, /get_member_cash_summary/);
  assert.match(data, /from\("cash_transactions"\)/);
  assert.match(data, /from\("club_cash_transactions"\)/);
  assert.match(data, /from\("member_dues"\)/);

  assert.match(actions, /club_cash_transactions/);
  assert.match(actions, /void_club_cash_transaction/);
  assert.match(actions, /text\/csv;charset=utf-8/);

  assert.match(model, /visibleTransactions/);
  assert.match(model, /categories/);
  assert.match(model, /duesTotal/);
});

test("cash data keeps staff and member visibility separated", async () => {
  const data = await read("components/cash-data.ts");

  assert.match(data, /if \(isCashStaffRole\(account\.role\)\)/);
  assert.match(data, /\.limit\(250\)/);
  assert.match(
    data,
    /\.eq\("member_external_id", account\.member_external_id\)/,
  );
  assert.match(data, /\.limit\(24\)/);
  assert.match(data, /source: "import" as const/);
  assert.match(data, /source: "production" as const/);
});

test("cash create mutation validates amount and session", async () => {
  const actions = await read("components/cash-actions.ts");

  assert.match(actions, /Sesi login tidak ditemukan/);
  assert.match(actions, /Number\.isFinite\(parsedAmount\)/);
  assert.match(actions, /parsedAmount <= 0/);
  assert.match(actions, /created_by: userId/);
  assert.match(actions, /if \(error\) throw error/);
});

test("cash correction preserves audit-safe RPC and explicit reason", async () => {
  const controller = await read(
    "components/cash-screen-controller.ts",
  );
  const actions = await read("components/cash-actions.ts");

  assert.match(controller, /Koreksi Transaksi/);
  assert.match(controller, /destructive: true/);
  assert.match(controller, /if \(!reason\.trim\(\)\)/);
  assert.match(controller, /Alasan koreksi wajib diisi\./);
  assert.match(actions, /void_club_cash_transaction/);
  assert.match(actions, /p_reason: reason/);
});

test("cash refresh invalidates every derived dashboard cache", async () => {
  const controller = await read(
    "components/cash-screen-controller.ts",
  );

  assert.match(controller, /invalidateCache\("cash:"\)/);
  assert.match(
    controller,
    /invalidateCache\("dashboard_club_stats"\)/,
  );
  assert.match(
    controller,
    /invalidateCache\("admin_dashboard_overview"\)/,
  );
  assert.match(controller, /await load\(true\)/);
});
