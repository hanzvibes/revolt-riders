import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function getSupabaseBrowserClient() {
  // These are public Supabase browser credentials. The fallback keeps the PWA
  // usable on the hosting runtime, where client bundles do not receive runtime
  // environment variables after deployment.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://uloqjgwgupuaatdixvsa.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable__xL3dYFyGz8aicIEDUyHfQ_XGBsBdoa";
  if (!url || !key) throw new Error("Konfigurasi Supabase belum tersedia.");
  browserClient ??= createBrowserClient(url, key);
  return browserClient;
}
