"use client";

import { useEffect, useState, type ReactNode } from "react";
import { readJson } from "@/lib/http";
import { todayISO } from "@/lib/dates";

type Metrics = {
  date: string;
  arrivals: number;
  departures: number;
  occupied: number;
  totalUnits: number;
  occupancyPercent: number;
  bookedRevenue: number;
  collectedRevenue: number;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export function AdminDashboard() {
  const [date, setDate] = useState(todayISO());
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/dashboard?date=${date}`)
      .then(async (response) => {
        const data = await readJson<{ metrics: Metrics }>(response);
        if (!response.ok) throw new Error(data.error || "Could not load dashboard");
        if (!cancelled) {
          setMetrics(data.metrics);
          setError(null);
        }
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.24em] text-[var(--dd-cream)]/55">
          Snapshot for
        </p>
        <input
          type="date"
          value={date}
          onChange={(event) => event.target.value && setDate(event.target.value)}
          className="dd-input !mt-0 !w-auto !py-1.5 font-[family-name:var(--font-display)] !text-lg"
        />
      </div>
      {error && (
        <p role="alert" className="mt-4 border-l-2 border-[#f0a493] pl-3 text-sm text-[#f0a493]">
          {error}
        </p>
      )}
      <div className="mt-5 grid gap-px overflow-hidden border border-[var(--dd-line-dark)] bg-[var(--dd-line-dark)] sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Occupancy" value={metrics ? `${metrics.occupancyPercent}%` : "—"} note={metrics ? `${metrics.occupied} of ${metrics.totalUnits} rooms` : ""}>
          {metrics && (
            <div className="mt-4 h-1 w-full bg-[var(--dd-cream)]/10">
              <div className="h-full bg-[var(--dd-gold)] transition-[width] duration-700" style={{ width: `${Math.min(100, metrics.occupancyPercent)}%` }} />
            </div>
          )}
        </Kpi>
        <Kpi label="Arrivals · departures" value={metrics ? `${metrics.arrivals} · ${metrics.departures}` : "—"} note="check-ins · check-outs" />
        <Kpi label="Booked revenue" value={metrics ? inr(metrics.bookedRevenue) : "—"} note="for stays on this date" />
        <Kpi label="Collected" value={metrics ? inr(metrics.collectedRevenue) : "—"} note="paid so far" />
      </div>
    </section>
  );
}

function Kpi({ label, value, note, children }: { label: string; value: string; note: string; children?: ReactNode }) {
  return (
    <div className="bg-[var(--dd-night)] p-6">
      <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-gold)]">{label}</p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-[2.4rem] leading-none text-[var(--dd-cream)]">{value}</p>
      <p className="mt-2 font-[family-name:var(--font-body)] text-[12px] text-[var(--dd-cream)]/45">{note}</p>
      {children}
    </div>
  );
}
