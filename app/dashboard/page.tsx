"use client";

import { AppShell } from "@/components/app-shell";
import { CommunityFeed } from "@/components/community-feed";

export default function DashboardPage() {
  return (
    <AppShell active="Home" title="Beranda">
      <div className="dashboard-social-feed-v1">
        <main className="dashboard-social-feed-main" aria-label="Feed Revolt Riders">
          <CommunityFeed />
        </main>
      </div>
    </AppShell>
  );
}
