"use client";

import { useMemo, useState } from "react";
import { useDesk } from "./store";
import { Btn, Segmented, cx } from "./ui";
import { BAR, addCalendarDays, isLive, todayISO, type AdminBooking } from "./lib";

const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * Tape chart: one lane per physical room, bookings as bars across the nights
 * they hold. Click a bar to open it, an empty night to book it.
 */
export function CalendarView() {
  const desk = useDesk();
  const today = todayISO();
  const [span, setSpan] = useState<"7" | "14" | "30">("14");
  const days = Number(span);
  const [from, setFrom] = useState(() => addCalendarDays(today, -1));
  const dates = useMemo(() => Array.from({ length: days }, (_, i) => addCalendarDays(from, i)), [from, days]);
  const end = addCalendarDays(from, days);

  const rows = useMemo(() => {
    const nowIso = new Date().toISOString();
    return desk.rooms.map((room) => {
      const stays = desk.bookings
        .filter((b) => b.roomTypeId === room.id && (isLive(b, nowIso) || b.status === "checked_out"))
        .filter((b) => b.checkOut > from && b.checkIn < end)
        .sort((a, b) => a.checkIn.localeCompare(b.checkIn) || a.createdAt.localeCompare(b.createdAt));
      // Greedy lane assignment: each stay takes the first room free on its arrival night.
      const lanes: AdminBooking[][] = Array.from({ length: room.totalUnits }, () => []);
      const overflow: AdminBooking[] = [];
      for (const s of stays) {
        const lane = lanes.find((l) => l.every((x) => x.checkOut <= s.checkIn || x.checkIn >= s.checkOut));
        if (lane) lane.push(s);
        else overflow.push(s);
      }
      const free = dates.map((d) => room.totalUnits - stays.filter((s) => s.checkIn <= d && s.checkOut > d && s.status !== "checked_out").length);
      return { room, lanes, overflow, free };
    });
  }, [desk.rooms, desk.bookings, from, end, dates]);

  const pos = (b: AdminBooking) => {
    const start = b.checkIn < from ? from : b.checkIn;
    const stop = b.checkOut > end ? end : b.checkOut;
    const offset = Math.round((Date.parse(`${start}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
    const len = Math.round((Date.parse(`${stop}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
    return { left: `${(offset / days) * 100}%`, width: `${(len / days) * 100}%`, clipsStart: b.checkIn < from, clipsEnd: b.checkOut > end };
  };

  const minCell = span === "30" ? 34 : 56;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Btn size="sm" onClick={() => setFrom(addCalendarDays(from, -days))} aria-label="Earlier">←</Btn>
          <Btn size="sm" onClick={() => setFrom(addCalendarDays(today, -1))}>Today</Btn>
          <Btn size="sm" onClick={() => setFrom(addCalendarDays(from, days))} aria-label="Later">→</Btn>
          <input
            type="date"
            value={from}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="h-8 rounded-lg border border-[var(--a-line)] bg-white px-2 text-[12.5px]"
            aria-label="Start date"
          />
          <span className="ml-2 text-[14px] font-medium">{MONTH.format(new Date(`${from}T00:00:00Z`))}</span>
        </div>
        <div className="flex items-center gap-3">
          <Legend />
          <Segmented value={span} onChange={setSpan} options={[{ value: "7", label: "Week" }, { value: "14", label: "2 weeks" }, { value: "30", label: "Month" }]} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--a-line)] bg-white">
        <div style={{ minWidth: 170 + days * minCell }}>
          {/* Date header */}
          <div className="sticky top-0 z-10 flex border-b border-[var(--a-line)] bg-white">
            <div className="sticky left-0 z-10 w-[170px] shrink-0 border-r border-[var(--a-line)] bg-white px-4 py-2 text-[11.5px] font-medium uppercase tracking-[0.08em] text-[var(--a-muted)]">Room</div>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
              {dates.map((d) => {
                const weekend = [0, 6].includes(new Date(`${d}T00:00:00Z`).getUTCDay());
                return (
                  <div key={d} className={cx("border-l border-[var(--a-line)] py-1.5 text-center first:border-l-0", d === today && "bg-[#0b3d33] text-white", d !== today && weekend && "bg-[#faf7f0]")}>
                    <div className={cx("text-[10.5px] uppercase", d === today ? "text-white/70" : "text-[var(--a-muted)]")}>{WEEKDAY.format(new Date(`${d}T00:00:00Z`)).slice(0, 2)}</div>
                    <div className="text-[13px] font-semibold tabular-nums">{Number(d.slice(8))}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {rows.map(({ room, lanes, overflow, free }) => (
            <div key={room.id} className="border-b border-[var(--a-line)] last:border-b-0">
              {/* Room type header with rooms left per night */}
              <div className="flex bg-[#f7f4ed]">
                <div className="sticky left-0 z-[5] w-[170px] shrink-0 border-r border-[var(--a-line)] bg-[#f7f4ed] px-4 py-1.5 text-[12.5px] font-semibold">{room.name}</div>
                <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
                  {free.map((n, i) => (
                    <div key={dates[i]} className={cx("border-l border-[var(--a-line)] py-1.5 text-center text-[11.5px] tabular-nums first:border-l-0", n <= 0 ? "font-semibold text-rose-700" : "text-[var(--a-muted)]")} title={`${Math.max(0, n)} of ${room.totalUnits} free`}>
                      {n <= 0 ? "Full" : `${n} left`}
                    </div>
                  ))}
                </div>
              </div>
              {[...lanes, ...(overflow.length ? [overflow] : [])].map((lane, li) => (
                <div key={li} className="flex border-t border-[var(--a-line)]/70">
                  <div className={cx("sticky left-0 z-[5] w-[170px] shrink-0 border-r border-[var(--a-line)] bg-white px-4 py-3 text-[12.5px]", li >= lanes.length ? "text-rose-700" : "text-[var(--a-muted)]")}>
                    {li >= lanes.length ? "Overbooked" : `${room.name} · ${li + 1}`}
                  </div>
                  <div className="relative flex-1">
                    <div className="grid h-[46px]" style={{ gridTemplateColumns: `repeat(${days}, 1fr)` }}>
                      {dates.map((d) => (
                        <button
                          key={d}
                          type="button"
                          aria-label={`Book ${room.name} on ${d}`}
                          onClick={() => desk.newReservation({ roomTypeId: room.id, checkIn: d, checkOut: addCalendarDays(d, 1) })}
                          className={cx("border-l border-[var(--a-line)]/70 transition first:border-l-0 hover:bg-[#0b3d33]/[0.05]", d === today && "bg-[#0b3d33]/[0.04]")}
                        />
                      ))}
                    </div>
                    {lane.map((b) => {
                      const p = pos(b);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => desk.openBooking(b.id)}
                          title={`${b.guestName} · ${b.checkIn} → ${b.checkOut}`}
                          className={cx(
                            "absolute top-[6px] flex h-[34px] items-center overflow-hidden border px-2 text-left text-[12px] font-medium shadow-sm transition hover:brightness-[0.97]",
                            BAR[b.status] ?? BAR.confirmed,
                            p.clipsStart ? "rounded-l-none" : "rounded-l-lg",
                            p.clipsEnd ? "rounded-r-none" : "rounded-r-lg",
                          )}
                          style={{ left: `calc(${p.left} + 2px)`, width: `calc(${p.width} - 4px)` }}
                        >
                          <span className="truncate">{b.status === "blocked" ? `⛔ ${b.guestName}` : b.guestName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
          {rows.length === 0 && <p className="p-6 text-[13px] text-[var(--a-muted)]">Loading rooms…</p>}
        </div>
      </div>
      <p className="text-[12px] text-[var(--a-muted)]">Tip: click an empty night to start a booking there; click a bar to open the reservation. Lanes are assigned automatically per room type.</p>
    </div>
  );
}

function Legend() {
  const items = [
    ["confirmed", "Confirmed"],
    ["checked_in", "In house"],
    ["pending", "On hold"],
    ["checked_out", "Departed"],
    ["blocked", "Blocked"],
  ] as const;
  return (
    <div className="hidden items-center gap-3 xl:flex">
      {items.map(([k, label]) => (
        <span key={k} className="flex items-center gap-1.5 text-[12px] text-[var(--a-muted)]">
          <span className={cx("h-3 w-5 rounded border", BAR[k])} />
          {label}
        </span>
      ))}
    </div>
  );
}
