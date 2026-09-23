import { NextResponse } from "next/server";

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

const REPO = "hanzvibes/revolt-riders";

const TRACKERS = [
  {
    id: "dashboard",
    name: "Dashboard Autopilot",
    branch: "feat/autopilot-dashboard",
    path: ".autopilot/dashboard.md",
    targetPerRun: 8,
  },
  {
    id: "profile",
    name: "Profile Autopilot",
    branch: "feat/autopilot-profile",
    path: ".autopilot/profile.md",
    targetPerRun: 8,
  },
] as const;

async function fetchRepoText(branch: string, path: string) {
  const rawUrl = `https://raw.githubusercontent.com/${REPO}/refs/heads/${branch}/${path}`;
  const rawResponse = await fetch(rawUrl, {
    cache: "no-store",
    headers: {
      "User-Agent": "revolt-riders-autopilot-monitor",
    },
  });

  if (rawResponse.ok) {
    return rawResponse.text();
  }

  const apiUrl = `https://api.github.com/repos/${REPO}/contents/${path}?ref=${encodeURIComponent(branch)}`;
  const apiResponse = await fetch(apiUrl, {
    cache: "no-store",
    headers: {
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "revolt-riders-autopilot-monitor",
    },
  });

  if (!apiResponse.ok) {
    throw new Error(`GitHub tracker fetch failed (${apiResponse.status})`);
  }

  return apiResponse.text();
}

function parseTracker(
  source: string,
  meta: (typeof TRACKERS)[number],
): LaneStatus {
  const status = source.match(/^Status:\s*(.+)$/m)?.[1]?.trim() || "UNKNOWN";
  const tasks = Array.from(
    source.matchAll(/^- \[([ xX])\]\s+(\d+)\s+(.+)$/gm),
  ).map<TrackerTask>((match) => ({
    done: match[1].toLowerCase() === "x",
    number: match[2],
    title: match[3].trim(),
  }));

  const done = tasks.filter((task) => task.done).length;
  const total = tasks.length;
  const nextTask = tasks.find((task) => !task.done) ?? null;
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;

  const currentBatchStartIndex = Math.floor(done / 10) * 10;
  const batchTasks = tasks.slice(currentBatchStartIndex, currentBatchStartIndex + 10);
  const batchRange =
    batchTasks.length > 0
      ? `${batchTasks[0].number}–${batchTasks[batchTasks.length - 1].number}`
      : "Complete";

  const runLogSection = source.split("## Run log")[1] ?? "";
  const recentActivity = runLogSection
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.includes("|") &&
        !line.includes("YYYY-MM-DD") &&
        !line.startsWith("Append concise"),
    )
    .slice(-4)
    .reverse();

  return {
    id: meta.id,
    name: meta.name,
    branch: meta.branch,
    status,
    done,
    total,
    percent,
    targetPerRun: meta.targetPerRun,
    nextTask,
    batchRange,
    recentActivity,
  };
}

function parseReleases(source: string) {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.includes("|") &&
        !line.includes("surface/batch") &&
        !line.startsWith("Format:"),
    )
    .slice(-5)
    .reverse();
}

export async function GET() {
  try {
    const [dashboardSource, profileSource, releasesSource] = await Promise.all([
      fetchRepoText(TRACKERS[0].branch, TRACKERS[0].path),
      fetchRepoText(TRACKERS[1].branch, TRACKERS[1].path),
      fetchRepoText("main", ".autopilot/RELEASES.md"),
    ]);

    const lanes = [
      parseTracker(dashboardSource, TRACKERS[0]),
      parseTracker(profileSource, TRACKERS[1]),
    ];

    return NextResponse.json(
      {
        lanes,
        releases: parseReleases(releasesSource),
        checkedAt: new Date().toISOString(),
        refreshSeconds: 30,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Autopilot status belum dapat dimuat.",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
