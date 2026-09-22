"use client";

import { AppShell } from "@/components/app-shell";
import { CommunityFeed } from "@/components/community-feed";

export default function DashboardPage() {
  return (
    <AppShell active="Home" title="Beranda">
      <CommunityFeed />
    </AppShell>
  );
}
