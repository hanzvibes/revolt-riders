"use client";

import { BellRing, Check, Smartphone } from "lucide-react";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const toBase64Bytes = (value: string) => {
  const padded = `${value}${"=".repeat((4 - value.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(padded);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

export function NotificationSettings() {
  const [supported] = useState(() => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window);
  const [enabled, setEnabled] = useState(() => typeof window !== "undefined" && typeof Notification !== "undefined" && Notification.permission === "granted"); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  const enable = async () => {
    if (!supported) return setMessage("Browser ini belum mendukung notifikasi PWA.");
    const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
    if (!publicKey) return setMessage("Notifikasi belum diaktifkan oleh pengurus server.");
    setSaving(true); setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Izin notifikasi belum diberikan.");
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBase64Bytes(publicKey) });
      const json = subscription.toJSON(); const supabase = getSupabaseBrowserClient(); const { data: { user } } = await supabase.auth.getUser();
      if (!user || !json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new Error("Sesi atau subscription perangkat tidak valid.");
      const { error } = await supabase.from("push_subscriptions").upsert({ user_id: user.id, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent, updated_at: new Date().toISOString() }, { onConflict: "endpoint" });
      if (error) throw error;
      await supabase.from("notification_preferences").upsert({ user_id: user.id, event_reminders: true, announcement_alerts: true, updated_at: new Date().toISOString() });
      setEnabled(true); setMessage("Notifikasi perangkat aktif. Kamu akan menerima agenda dan bulletin penting saat layanan pengiriman diaktifkan.");
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Notifikasi belum dapat diaktifkan."); } finally { setSaving(false); }
  };
  return <section className="profile-edit card"><div className="section-title"><span><em>NOTIFIKASI</em><h3>Pengingat Revolt</h3></span><BellRing/></div><p>Aktifkan notifikasi untuk agenda baru, pengingat RSVP, dan bulletin penting.</p>{enabled ? <p className="success-message"><Check/>Notifikasi perangkat sudah diizinkan.</p> : <button className="outline-action" onClick={() => void enable()} disabled={saving || !supported}><Smartphone/>{saving ? "MENYIAPKAN…" : supported ? "AKTIFKAN NOTIFIKASI" : "TIDAK DIDUKUNG BROWSER"}</button>}{message && <p className={enabled ? "success-message" : "system-message"}>{message}</p>}</section>;
}
