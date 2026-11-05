"use client";

import { useMemo, useState } from "react";
import { useDesk } from "./store";
import { Btn, Card, Kpi, Segmented, cx, inputCls } from "./ui";
import { BarList, Columns } from "./charts";
import { periodStats, totalUnits } from "./metrics";
import { addCalendarDays, downloadCsv, fmtDate, fmtDay, rupees, todayISO } from "./lib";

type Preset = "this_month" | "last_month" | "last_30" | "next_30" | "year" | "custom";

function monthStart(iso: string) {
  return `${iso.slice(0, 7)}-01`;
}
function nextMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}
function prevMonth(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return m === 1 ? `${y - 1}-12-01` : `${y}-${String(m - 1).padStart(2, "0")}-01`;
}

export function ReportsView() {
  const desk = useDesk();
  const today = todayISO();
  const [preset, setPreset] = useState<Preset>("this_month");
  const [custom, setCustom] = useState({ from: monthStart(today), to: today });

  const [from, to] = useMemo((): [string, string] => {
    switch (preset) {
      case "this_month": return [monthStart(today), nextMonth(today)];
      case "last_month": return [prevMonth(today), monthStart(today)];
      case "last_30": return [addCalendarDays(today, -30), today];
      case "next_30": return [today, addCalendarDays(today, 30)];
      case "year": return [`${today.slice(0, 4)}-01-01`, `${Number(today.slice(0, 4)) + 1}-01-01`];
      default: return [custom.from, addCalendarDays(custom.to, 1)];
    }
  }, [preset, today, custom]);

  const s = useMemo(() => periodStats(desk.bookings, desk.rooms, from, to), [desk.bookings, desk.rooms, from, to]);
  const units = totalUnits(desk.rooms);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  const daily = useMemo(() => {
    const out = [];
    for (let d = from; d < to && out.length < 400; d = addCalendarDays(d, 1)) {
      const sold = s.perDay.get(d) ?? 0;
      out.push({ key: d, label: String(Number(d.slice(8))), sub: d.endsWith("-01") ? fmtDay(d).split(" ").pop() : undefined, value: units ? Math.round((sold / units) * 100) : 0, note: `${sold} of ${units} rooms` });
    }
    return out;
  }, [from, to, s.perDay, units]);

  const byRoom = desk.rooms.map((r) => {
    const v = s.byRoom.get(r.id) ?? { revenue: 0, nights: 0, stays: 0 };
    const cap = r.totalUnits * s.days;
    return { room: r, ...v, occ: cap ? v.nights / cap : 0, adr: v.nights ? v.revenue / v.nights : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={preset}
          onChange={setPreset}
          options={[
            { value: "this_month", label: "This month" },
            { value: "last_month", label: "Last month" },
            { value: "last_30", label: "Last 30 days" },
            { value: "next_30", label: "Next 30 days" },
            { value: "year", label: "This year" },
            { value: "custom", label: "Custom" },
          ]}
        />
        <div className="flex items-center gap-2">
          {preset === "custom" && (
            <>
              <input type="date" className={cx(inputCls, "w-[150px]")} value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
              <span className="text-[var(--a-muted)]">–</span>
              <input type="date" className={cx(inputCls, "w-[150px]")} value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
            </>
          )}
          <Btn
            onClick={() =>
              downloadCsv(`deccan-dwell-report-${from}-to-${addCalendarDays(to, -1)}.csv`, [
                ["Date", "Rooms sold", "Rooms available", "Occupancy %"],
                ...daily.map((d) => [d.key, s.perDay.get(d.key) ?? 0, units, d.value]),
                [],
                ["Room type", "Stays", "Nights", "Revenue", "Occupancy %", "ADR"],
                ...byRoom.map((r) => [r.room.name, r.stays, r.nights, Math.round(r.revenue), Math.round(r.occ * 100), Math.round(r.adr)]),
              ])
            }
          >
            Export CSV
          </Btn>
        </div>
      </div>
      <p className="-mt-3 text-[12.5px] text-[var(--a-muted)]">{fmtDate(from)} – {fmtDate(addCalendarDays(to, -1))} · {s.days} nights · revenue counted on the nights stayed</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi accent label="Room revenue" value={rupees(s.revenue)} hint={`${s.stays} stays`} />
        <Kpi label="Occupancy" value={pct(s.occupancy)} hint={`${s.nightsSold} of ${s.capacity} room nights`} />
        <Kpi label="ADR" value={rupees(s.adr)} hint="average rate per night sold" />
        <Kpi label="RevPAR" value={rupees(s.revpar)} hint="revenue per available room" />
        <Kpi label="Avg. length of stay" value={`${s.avgLength.toFixed(1)} n`} />
        <Kpi label="Avg. booking lead time" value={`${Math.round(s.avgLead)} days`} />
        <Kpi label="Cancellations" value={s.cancelled} />
        <Kpi label="No-shows" value={s.noShows} />
      </div>

      <Card title="Daily occupancy" action={<span className="text-[12px] text-[var(--a-muted)]">% of rooms sold</span>}>
        <Columns data={daily} max={100} format={(v) => `${v}%`} highlight={today} height={180} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Revenue by room type">
          <BarList rows={byRoom.map((r) => ({ label: r.room.name, value: r.revenue, sub: `${r.nights} nights` }))} format={rupees} />
        </Card>
        <Card title="Where bookings come from">
          <BarList rows={[...s.bySource.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))} format={(v) => `${v} stay${v === 1 ? "" : "s"}`} />
          {s.bySource.size === 0 && <p className="text-[13px] text-[var(--a-muted)]">No stays in this period.</p>}
        </Card>
      </div>

      <Card title="Room type performance" pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="border-b border-[var(--a-line)] bg-[#faf8f3] text-[12px] text-[var(--a-muted)]">
              <tr>
                <th className="px-5 py-3 font-medium">Room type</th>
                <th className="px-5 py-3 text-right font-medium">Stays</th>
                <th className="px-5 py-3 text-right font-medium">Nights</th>
                <th className="px-5 py-3 text-right font-medium">Occupancy</th>
                <th className="px-5 py-3 text-right font-medium">ADR</th>
                <th className="px-5 py-3 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--a-line)] tabular-nums">
              {byRoom.map((r) => (
                <tr key={r.room.id}>
                  <td className="px-5 py-3 font-medium">{r.room.name}</td>
                  <td className="px-5 py-3 text-right">{r.stays}</td>
                  <td className="px-5 py-3 text-right">{r.nights}</td>
                  <td className="px-5 py-3 text-right">{pct(r.occ)}</td>
                  <td className="px-5 py-3 text-right">{rupees(r.adr)}</td>
                  <td className="px-5 py-3 text-right">{rupees(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
