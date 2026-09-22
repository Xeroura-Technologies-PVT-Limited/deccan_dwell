"use client";

import { useEffect, useState } from "react";
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

export function AdminDashboard() {
  const [date, setDate] = useState(todayISO());
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/dashboard?date=${date}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load dashboard");
        setMetrics(data.metrics);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load dashboard"));
  }, [date]);

  if (error) return <p className="mt-8 text-sm text-red-300">{error}</p>;
  if (!metrics) return <p className="mt-8 text-sm text-[var(--dd-cream)]/50">Loading dashboard...</p>;

  const cards = [
    ["Arrivals", metrics.arrivals],
    ["Departures", metrics.departures],
    ["Occupancy", `${metrics.occupancyPercent}% · ${metrics.occupied}/${metrics.totalUnits}`],
    ["Booked revenue", `₹${metrics.bookedRevenue.toLocaleString("en-IN")}`],
    ["Collected revenue", `₹${metrics.collectedRevenue.toLocaleString("en-IN")}`],
  ];

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-gold)]">Operations snapshot</p>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="border border-[var(--dd-gold)]/30 bg-transparent px-3 py-2 text-sm" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-[var(--dd-gold)]/20 p-4">
            <p className="text-xs text-[var(--dd-cream)]/50">{label}</p>
            <p className="mt-2 text-xl text-[var(--dd-gold)]">{value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
