"use client";

import { AppShell } from "@/components/app-shell";
import { CommunityFeed } from "@/components/community-feed";
import { DesktopFeedRail } from "@/components/desktop-feed-rail";
import { useDataCache } from "@/context/data-cache-context";
import { Plus } from "lucide-react";
import { useState } from "react";

const FEED_STAFF_ROLES = new Set(["road_captain", "admin", "superadmin"]);

export default function DashboardPage() {
  const { account } = useDataCache();
  const [composerOpen, setComposerOpen] = useState(false);
  const canPost =
    account?.status === "active" &&
    FEED_STAFF_ROLES.has(account.role);

  return (
    <AppShell
      active="Home"
      title="REVOLT RIDERS"
      eyebrow={null}
      socialHeader
      headerAction={
        canPost ? (
          <button
            type="button"
            className="social-header-create"
            onClick={() => setComposerOpen(true)}
            aria-label="Buat post"
            title="Buat post"
          >
            <Plus aria-hidden="true" />
          </button>
        ) : null
      }
    >
      <div className="dashboard-social-feed-v1">
        <main className="dashboard-social-feed-main" aria-label="Feed Revolt Riders">
          <CommunityFeed
            composerOpen={composerOpen}
            onComposerOpenChange={setComposerOpen}
          />
        </main>
        <DesktopFeedRail />
      </div>
    </AppShell>
  );
}
