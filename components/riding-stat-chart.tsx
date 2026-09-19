"use client";

import { CountUpNumber } from "@/components/count-up-number";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type RidingChartRide = {
  id: string;
  title: string | null;
  distance_km: number | null;
  odometer_start: number;
  odometer_end: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

type RangeKey = "30d" | "90d" | "all";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "30d", label: "30 Hari", days: 30 },
  { key: "90d", label: "90 Hari", days: 90 },
  { key: "all", label: "Semua", days: null },
];

const formatKm = (value: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));

export function RidingStatChart({ rides }: { rides: RidingChartRide[] }) {
  const [range, setRange] = useState<RangeKey>("90d");

  const chartData = useMemo(() => {
    const option = RANGE_OPTIONS.find((item) => item.key === range) ?? RANGE_OPTIONS[1];
    const cutoff = option.days ? Date.now() - option.days * 24 * 60 * 60 * 1000 : null;

    return rides
      .filter((ride) => {
        if (ride.status !== "approved") return false;
        if (!cutoff) return true;
        return new Date(ride.created_at).getTime() >= cutoff;
      })
      .map((ride) => ({
        id: ride.id,
        date: ride.created_at,
        label: formatShortDate(ride.created_at),
        title: ride.title || "Ride",
        km: ride.distance_km ?? Math.max(0, ride.odometer_end - ride.odometer_start),
      }))
      .filter((item) => item.km > 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [range, rides]);

  const metrics = useMemo(() => {
    if (chartData.length === 0) return { average: 0, max: 0 };
    const total = chartData.reduce((sum, item) => sum + item.km, 0);
    return {
      average: total / chartData.length,
      max: Math.max(...chartData.map((item) => item.km)),
    };
  }, [chartData]);

  return (
    <section className="riding-stat-chart" aria-labelledby="riding-stat-chart-title">
      <div className="riding-stat-chart-head">
        <div>
          <small>STATISTIK RIDING</small>
          <h3 id="riding-stat-chart-title">Tren kilometer</h3>
        </div>

        <div className="riding-stat-range" role="group" aria-label="Periode statistik riding">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={range === option.key ? "active" : ""}
              aria-pressed={range === option.key}
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {chartData.length > 0 ? (
        <>
          <div className="riding-stat-chart-canvas">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="ridingKmFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#dc1b2a" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="#dc1b2a" stopOpacity={0.015} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,.055)" strokeDasharray="3 5" />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  minTickGap={26}
                  tick={{ fill: "#777f84", fontSize: 10, fontWeight: 700 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(value) => `${value} KM`}
                  tick={{ fill: "#777f84", fontSize: 9, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(220,27,42,.28)", strokeWidth: 1 }}
                  contentStyle={{
                    border: "1px solid #2a2e31",
                    borderRadius: "10px",
                    background: "#0b0d0e",
                    boxShadow: "0 12px 26px rgba(0,0,0,.34)",
                    color: "#fff",
                    fontSize: "11px",
                  }}
                  labelStyle={{ color: "#8f969b", marginBottom: "4px" }}
                  formatter={(value, _name, item) => [
                    `${formatKm(Number(value ?? 0))} KM`,
                    item?.payload?.title || "Riding",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="km"
                  stroke="#dc1b2a"
                  strokeWidth={2.4}
                  fill="url(#ridingKmFill)"
                  activeDot={{ r: 4.5, fill: "#dc1b2a", stroke: "#fff", strokeWidth: 2 }}
                  dot={{ r: 2.5, fill: "#121416", stroke: "#dc1b2a", strokeWidth: 1.5 }}
                  isAnimationActive
                  animationDuration={1300}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="riding-stat-chart-summary">
            <span>
              <small>Rata-rata</small>
              <b><CountUpNumber value={metrics.average} maximumFractionDigits={1} suffix=" KM" /></b>
            </span>
            <span>
              <small>Ride terjauh</small>
              <b><CountUpNumber value={metrics.max} maximumFractionDigits={1} suffix=" KM" /></b>
            </span>
            <span>
              <small>Aktivitas</small>
              <b><CountUpNumber value={chartData.length} suffix=" ride" /></b>
            </span>
          </div>
        </>
      ) : (
        <div className="riding-stat-empty">
          <strong>Belum ada data pada periode ini.</strong>
          <span>Ride yang sudah disetujui akan otomatis muncul di grafik.</span>
        </div>
      )}
    </section>
  );
}
