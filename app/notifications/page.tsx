import { AppShell } from "@/components/app-shell";
import { NotificationSettings } from "@/components/notification-settings";

export default function NotificationsPage() {
  return <AppShell active="Notifikasi" title="Notifikasi"><div className="page-wrap"><section className="page-intro"><div><em>MEMBER REMINDERS</em><h2>Notifikasi Revolt</h2><p>Kelola izin perangkat untuk agenda baru, pengingat RSVP, dan bulletin penting.</p></div></section><NotificationSettings/></div></AppShell>;
}
