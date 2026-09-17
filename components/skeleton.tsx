"use client";

import React from "react";

export function Skeleton({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton-shimmer ${className}`} style={style} />;
}

export function CardSkeleton({ height = "120px" }: { height?: string }) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Skeleton style={{ width: "42px", height: "42px", borderRadius: "50%" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
          <Skeleton style={{ width: "50%", height: "16px" }} />
          <Skeleton style={{ width: "30%", height: "12px" }} />
        </div>
      </div>
      <Skeleton style={{ width: "100%", height, marginTop: "4px" }} />
    </div>
  );
}

export function StatsGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="stats" style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}>
      {Array.from({ length: count }).map((_, i) => (
        <article key={i} style={{ padding: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
          <Skeleton style={{ width: "40px", height: "40px", borderRadius: "9px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: 1 }}>
            <Skeleton style={{ width: "55%", height: "12px" }} />
            <Skeleton style={{ width: "80%", height: "22px" }} />
          </div>
        </article>
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 0" }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
          <Skeleton style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
            <Skeleton style={{ width: "45%", height: "14px" }} />
            <Skeleton style={{ width: "25%", height: "11px" }} />
          </div>
          <Skeleton style={{ width: "60px", height: "24px", borderRadius: "6px" }} />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ title = "Memuat data..." }: { title?: string }) {
  return (
    <div className="page-wrap" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="page-intro" style={{ marginBottom: "10px" }}>
        <div>
          <Skeleton style={{ width: "90px", height: "12px", marginBottom: "8px" }} />
          <h2 style={{ margin: "4px 0" }}>{title}</h2>
          <Skeleton style={{ width: "240px", height: "14px" }} />
        </div>
      </div>
      <StatsGridSkeleton count={3} />
      <CardSkeleton height="160px" />
    </div>
  );
}
