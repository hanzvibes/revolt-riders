import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Sesi login tidak ditemukan." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Konfigurasi server belum lengkap." }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = authHeader.slice("Bearer ".length);
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  const caller = userData.user;
  if (userError || !caller) {
    return json({ error: "Sesi login tidak valid." }, 401);
  }

  const { data: callerAccount, error: callerError } = await adminClient
    .from("member_accounts")
    .select("id,user_id,member_external_id,role,status")
    .eq("user_id", caller.id)
    .maybeSingle();

  if (
    callerError ||
    !callerAccount ||
    callerAccount.status !== "active" ||
    !["admin", "superadmin"].includes(callerAccount.role)
  ) {
    return json({ error: "Akses admin diperlukan." }, 403);
  }

  let payload: { memberExternalId?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Payload tidak valid." }, 400);
  }

  const memberExternalId = payload.memberExternalId?.trim().toUpperCase() ?? "";
  const password = payload.password ?? "";
  if (!/^RR-[0-9]{3,}$/.test(memberExternalId)) {
    return json({ error: "Member ID tidak valid." }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password minimal 8 karakter." }, 400);
  }

  const { data: targetAccount, error: targetError } = await adminClient
    .from("member_accounts")
    .select("id,user_id,member_external_id,role,status")
    .eq("member_external_id", memberExternalId)
    .maybeSingle();

  if (targetError || !targetAccount?.user_id) {
    return json({ error: "Akun member belum terhubung." }, 404);
  }

  if (
    callerAccount.role !== "superadmin" &&
    ["admin", "superadmin"].includes(targetAccount.role)
  ) {
    return json({ error: "Hanya Superadmin yang dapat mereset password Admin." }, 403);
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(
    targetAccount.user_id,
    { password },
  );

  if (updateError) {
    return json({ error: updateError.message || "Password gagal diubah." }, 400);
  }

  return json({
    ok: true,
    memberExternalId: targetAccount.member_external_id,
    message: "Password berhasil direset.",
  });
});
