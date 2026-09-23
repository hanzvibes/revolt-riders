"use client";

import {
  Activity,
  CheckCircle2,
  Clock3,
  GitBranch,
  Gauge,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./autopilot-monitor.module.css";

type TrackerTask = {
  number: string;
  title: string;
  done: boolean;
};

type LaneStatus = {
  id: string;
  name: string;
  branch: string;
  status: string;
  done: number;
  total: number;
  percent: number;
  targetPerRun: number;
  nextTask: TrackerTask | null;
  batchRange: string;
  recentActivity: string[];
};

type MonitorPayload = {
  lanes: LaneStatus[];
  releases: string[];
  checkedAt: string;
  refreshSeconds: number;
};

function formatCheckedAt(value: string | null) {
  if (!value) return "Belum tersambung";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Baru saja";

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function laneTone(status: string) {
  const normalized = status.toUpperCase();
  if (normalized.includes("READY")) return "ready";
  if (normalized.includes("MAINTENANCE")) return "maintenance";
  if (normalized.includes("BLOCKED")) return "blocked";
  return "active";
}

export default function AutopilotMonitorPage() {
  const [data, setData] = useState<MonitorPayload | null>(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/autopilot/status", {
        cache: "no-store",
      });
      const payload = (await response.json()) as MonitorPayload & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Monitor belum dapat dimuat.");
      }

      setData(payload);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Monitor belum dapat dimuat.",
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [load]);

  const totals = useMemo(() => {
    const lanes = data?.lanes ?? [];
    return {
      done: lanes.reduce((sum, lane) => sum + lane.done, 0),
      total: lanes.reduce((sum, lane) => sum + lane.total, 0),
    };
  }, [data]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <div className={styles.liveRow}>
              <span className={styles.liveBadge}>
                <i aria-hidden="true" />
                NEAR-LIVE
              </span>
              <span>Auto-refresh 30 detik</span>
            </div>
            <h1>Autopilot Control Room</h1>
            <p>
              Pantau Dashboard, Profile, integration gate, QA, dan release
              Revolt Riders dari satu layar.
            </p>
          </div>

          <div className={styles.headerActions}>
            <Link href="/dashboard" className={styles.backLink}>
              Kembali ke Dashboard
            </Link>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={() => void load()}
              disabled={refreshing}
            >
              <RefreshCw aria-hidden="true" />
              {refreshing ? "Refresh…" : "Refresh"}
            </button>
          </div>
        </header>

        <section className={styles.summaryGrid} aria-label="Ringkasan autopilot">
          <article>
            <Activity aria-hidden="true" />
            <span>
              <small>Automation lane</small>
              <strong>3 aktif</strong>
            </span>
          </article>
          <article>
            <Gauge aria-hidden="true" />
            <span>
              <small>Target builder</small>
              <strong>8 task / run</strong>
            </span>
          </article>
          <article>
            <CheckCircle2 aria-hidden="true" />
            <span>
              <small>Total progress</small>
              <strong>
                {totals.done}/{totals.total || 100} task
              </strong>
            </span>
          </article>
          <article>
            <ShieldCheck aria-hidden="true" />
            <span>
              <small>Production gate</small>
              <strong>QA dulu, baru deploy</strong>
            </span>
          </article>
        </section>

        {error ? (
          <div className={styles.error} role="alert">
            <strong>Monitor belum sinkron.</strong>
            <span>{error}</span>
          </div>
        ) : null}

        <section className={styles.laneGrid} aria-label="Status builder">
          {(data?.lanes ?? []).map((lane) => (
            <article key={lane.id} className={styles.laneCard}>
              <div className={styles.laneHead}>
                <div>
                  <span className={styles.laneIcon}>
                    {lane.id === "dashboard" ? (
                      <Gauge aria-hidden="true" />
                    ) : (
                      <Wrench aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <small>BUILDER LANE</small>
                    <h2>{lane.name}</h2>
                  </span>
                </div>
                <span
                  className={styles.statusBadge}
                  data-tone={laneTone(lane.status)}
                >
                  {lane.status}
                </span>
              </div>

              <div className={styles.progressHead}>
                <span>
                  <strong>{lane.done}</strong>
                  <small> / {lane.total} task selesai</small>
                </span>
                <b>{lane.percent}%</b>
              </div>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={lane.percent}
              >
                <i style={{ width: `${lane.percent}%` }} />
              </div>

              <div className={styles.currentTask}>
                <small>NEXT TASK</small>
                {lane.nextTask ? (
                  <strong>
                    #{lane.nextTask.number} · {lane.nextTask.title}
                  </strong>
                ) : (
                  <strong>Queue selesai</strong>
                )}
              </div>

              <dl className={styles.metaGrid}>
                <div>
                  <dt>
                    <GitBranch aria-hidden="true" />
                    Branch
                  </dt>
                  <dd>{lane.branch}</dd>
                </div>
                <div>
                  <dt>
                    <Clock3 aria-hidden="true" />
                    Batch aktif
                  </dt>
                  <dd>Task {lane.batchRange}</dd>
                </div>
                <div>
                  <dt>
                    <Gauge aria-hidden="true" />
                    Target run
                  </dt>
                  <dd>Maks. {lane.targetPerRun} task</dd>
                </div>
              </dl>

              <div className={styles.activityBlock}>
                <div className={styles.sectionLabel}>
                  <span>Aktivitas terbaru</span>
                  <i />
                </div>
                {lane.recentActivity.length > 0 ? (
                  <ol>
                    {lane.recentActivity.map((activity, index) => (
                      <li key={`${lane.id}-${index}-${activity}`}>
                        <span />
                        <p>{activity}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.emptyActivity}>
                    Belum ada run log baru di tracker.
                  </p>
                )}
              </div>
            </article>
          ))}
        </section>

        <section className={styles.guardCard}>
          <div className={styles.guardTitle}>
            <span className={styles.guardIcon}>
              <ShieldCheck aria-hidden="true" />
            </span>
            <div>
              <small>INTEGRATION & REPAIR GUARD</small>
              <h2>Pintu terakhir sebelum production</h2>
            </div>
            <span className={styles.guardStatus}>ACTIVE</span>
          </div>

          <div className={styles.guardFlow} aria-label="Integration workflow">
            <span>Batch ready</span>
            <i>→</i>
            <span>Full QA</span>
            <i>→</i>
            <span>Merge main</span>
            <i>→</i>
            <span>[deploy]</span>
            <i>→</i>
            <span>Production check</span>
          </div>

          <div className={styles.releaseBlock}>
            <div className={styles.sectionLabel}>
              <span>Release / blocker terbaru</span>
              <i />
            </div>
            {data?.releases?.length ? (
              <ol>
                {data.releases.map((release, index) => (
                  <li key={`${index}-${release}`}>
                    <span />
                    <p>{release}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.emptyActivity}>
                Belum ada batch autopilot yang masuk production.
              </p>
            )}
          </div>
        </section>

        <footer className={styles.footer}>
          <span>
            Source: tracker GitHub branch Dashboard + Profile + release log main.
          </span>
          <strong>
            Last sync: {formatCheckedAt(data?.checkedAt ?? null)} WIB
          </strong>
        </footer>
      </div>
    </main>
  );
}
