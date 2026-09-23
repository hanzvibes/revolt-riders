"use client";

import { AppShell } from "@/components/app-shell";
import { CommunityFeed } from "@/components/community-feed";
import { DesktopFeedRail } from "@/components/desktop-feed-rail";
import { useDataCache } from "@/context/data-cache-context";
import { Plus } from "lucide-react";
import { useState } from "react";
import "./dashboard-header.css";
import "./dashboard-feed-polish.css";

const FEED_STAFF_ROLES = new Set(["road_captain", "admin", "superadmin"]);

export default function DashboardPage() {
  const { account } = useDataCache();
  const [composerOpen, setComposerOpen] = useState(false);
  const canPost = account?.status === "active" && FEED_STAFF_ROLES.has(account.role);

  return (
    <AppShell active="Home" title="REVOLT RIDERS" eyebrow={null} socialHeader headerAction={canPost ? (
      <button type="button" className="social-header-create" onClick={() => setComposerOpen(true)} aria-label="Buat post" title="Buat post"><Plus aria-hidden="true" /></button>
    ) : null}>
      <div className="dashboard-social-feed-v1">
        <main className="dashboard-social-feed-main" aria-label="Feed Revolt Riders">
          <CommunityFeed composerOpen={composerOpen} onComposerOpenChange={setComposerOpen} />
        </main>
        <DesktopFeedRail />
      </div>
      <style jsx global>{`
        .app-shell .dashboard-social-feed-v1 .community-media-viewer > header button{width:46px;height:46px;border:1px solid rgba(255,255,255,.18);border-radius:50%;background:rgba(15,16,18,.72);color:#fff;transition:background-color 180ms ease,transform 140ms ease}
        .app-shell .dashboard-social-feed-v1 .community-media-viewer > header button:hover{background:rgba(35,36,39,.9)}
        .app-shell .dashboard-social-feed-v1 .community-media-viewer > header button:active{transform:scale(.94)}
        .app-shell .dashboard-social-feed-v1 .community-media-viewer > header button:focus-visible{outline:2px solid #fff;outline-offset:3px}
        .app-shell .dashboard-social-feed-v1 .community-agenda-attachment{min-height:88px;margin-top:14px;border:1px solid var(--rr-line);border-radius:14px;background:var(--rr-surface-soft);padding:12px 13px;transition:border-color 180ms ease,background-color 180ms ease}
        .app-shell .dashboard-social-feed-v1 .community-agenda-attachment:hover{border-color:var(--rr-line-strong);background:var(--rr-surface)}
        .app-shell .dashboard-social-feed-v1 .community-agenda-copy strong{line-height:1.3;letter-spacing:-.015em}
        .app-shell .dashboard-social-feed-v1 .community-voyager-attachment{margin-top:14px;border:1px solid rgba(220,27,42,.22);border-radius:14px;background:linear-gradient(180deg,var(--rr-surface),var(--rr-surface-soft));padding:13px;box-shadow:none}
        .app-shell .dashboard-social-feed-v1 .community-voyager-head{gap:10px}.app-shell .dashboard-social-feed-v1 .community-voyager-head>b{border-radius:999px;padding:5px 8px;background:var(--rr-red-soft);color:var(--rr-danger);font-size:.66rem}
        .app-shell .dashboard-social-feed-v1 .community-voyager-progress{gap:8px}.app-shell .dashboard-social-feed-v1 .community-voyager-cta{min-height:38px;margin-top:8px}
        .app-shell .dashboard-social-feed-v1 .community-link-preview{min-height:58px;border-radius:13px;padding:10px 12px;background:var(--rr-surface-soft);transition:border-color 180ms ease,background-color 180ms ease}
        .app-shell .dashboard-social-feed-v1 .community-link-preview:hover{border-color:var(--rr-line-strong);background:var(--rr-surface)}.app-shell .dashboard-social-feed-v1 .community-link-preview small{font-size:.72rem}.app-shell .dashboard-social-feed-v1 .community-link-preview b{white-space:nowrap}
      `}</style>
    </AppShell>
  );
}
