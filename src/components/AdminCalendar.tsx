"use client";

import { useEffect, useMemo, useState } from "react";
import { shiftMonth } from "@/components/AvailabilityCalendar";
import { readJson } from "@/lib/http";
import { todayISO } from "@/lib/dates";
import { ROOM_TYPES } from "@/lib/inventory-client";

type CalendarRow = { night: string; booking: { id: string; roomName: string; guestName: string; status: string } };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month at a glance: each night shows how full the house is; pick a night to see who's staying. */
export function AdminCalendar() {
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [room, setRoom] = useState("all");
  const [selected, setSelected] = useState<string | null>(today);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/calendar?month=${month}`)
      .then(async (response) => {
        const data = await readJson<{ rows: CalendarRow[] }>(response);
        if (!response.ok) throw new Error(data.error || "Could not load calendar");
        if (!cancelled) {
          setRows(data.rows ?? []);
          setError(null);
        }
      })
      .catch((reason) => !cancelled && setError(reason instanceof Error ? reason.message : "Could not load calendar"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [month]);

  const roomNames = useMemo(() => ROOM_TYPES.map((r) => r.name), []);
  const capacity =
    room === "all"
      ? ROOM_TYPES.reduce((n, r) => n + r.totalUnits, 0)
      : ROOM_TYPES.find((r) => r.name === room)?.totalUnits ?? 1;
  const filtered = room === "all" ? rows : rows.filter((r) => r.booking.roomName === room);
  const byNight = useMemo(() => {
    const map = new Map<string, CalendarRow[]>();
    filtered.forEach((r) => map.set(r.night, [...(map.get(r.night) ?? []), r]));
    return map;
  }, [filtered]);

  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const blanks = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const list = selected ? byNight.get(selected) ?? [] : [];

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dd-line-dark)] text-[var(--dd-gold)] hover:border-[var(--dd-gold)]">←</button>
          <p className="min-w-[11rem] text-center font-[family-name:var(--font-display)] text-2xl">{MONTHS[m - 1]} {y}</p>
          <button type="button" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--dd-line-dark)] text-[var(--dd-gold)] hover:border-[var(--dd-gold)]">→</button>
        </div>
        <select value={room} onChange={(event) => setRoom(event.target.value)} className="dd-input !mt-0 !w-auto min-w-[12rem] !py-2 !text-sm">
          <option value="all" className="bg-[var(--dd-night)]">All rooms</option>
          {roomNames.map((name) => (
            <option key={name} value={name} className="bg-[var(--dd-night)]">{name}</option>
          ))}
        </select>
      </div>
      {error && <p role="alert" className="mt-4 border-l-2 border-[#f0a493] pl-3 text-sm text-[#f0a493]">{error}</p>}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className={`border border-[var(--dd-line-dark)] p-4 transition-opacity ${loading ? "opacity-50" : ""}`}>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <span key={d} className="pb-2 text-center font-[family-name:var(--font-nav)] text-[9.5px] uppercase tracking-[0.18em] text-[var(--dd-cream)]/45">{d}</span>
            ))}
            {Array.from({ length: blanks }).map((_, i) => <span key={`b${i}`} />)}
            {Array.from({ length: days }).map((_, i) => {
              const date = `${month}-${String(i + 1).padStart(2, "0")}`;
              const count = byNight.get(date)?.length ?? 0;
              const ratio = Math.min(1, count / capacity);
              const isSel = selected === date;
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  className={`relative flex aspect-[1.15] flex-col justify-between overflow-hidden border p-2 text-left transition-colors ${
                    isSel ? "border-[var(--dd-gold)]" : "border-[var(--dd-line-dark)] hover:border-[var(--dd-gold)]/50"
                  }`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 bg-[var(--dd-gold)]/20 transition-[height] duration-500"
                    style={{ height: `${ratio * 100}%` }}
                  />
                  <span className={`relative font-[family-name:var(--font-display)] text-lg ${date === today ? "text-[var(--dd-gold)]" : ""}`}>{i + 1}</span>
                  <span className="relative font-[family-name:var(--font-nav)] text-[9px] uppercase tracking-[0.12em] text-[var(--dd-cream)]/60">
                    {count ? `${count}/${capacity}` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="border border-[var(--dd-line-dark)] bg-[var(--dd-night-2)]/60 p-5">
          <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.24em] text-[var(--dd-gold)]">
            {selected ? new Date(`${selected}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }) : "Pick a night"}
          </p>
          {list.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-[var(--dd-cream)]/40">No rooms occupied this night.</p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--dd-line-dark)]">
              {list.map((r) => (
                <li key={r.booking.id} className="py-3">
                  <p className="text-[15px]">{r.booking.guestName}</p>
                  <p className="text-[12px] text-[var(--dd-cream)]/50">
                    {r.booking.roomName} · <span className="capitalize">{r.booking.status.replace("_", " ")}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </section>
  );
}
