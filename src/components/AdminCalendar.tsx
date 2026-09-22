"use client";

import { useEffect, useMemo, useState } from "react";
import { shiftMonth } from "@/components/AvailabilityCalendar";
import { todayISO } from "@/lib/dates";

type CalendarRow = { night: string; booking: { id: string; roomName: string; guestName: string; status: string } };

export function AdminCalendar() {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [rows, setRows] = useState<CalendarRow[]>([]);
  const [room, setRoom] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/calendar?month=${month}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load calendar");
        setRows(data.rows);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load calendar"));
  }, [month]);

  const rooms = useMemo(() => Array.from(new Set(rows.map((row) => row.booking.roomName))), [rows]);
  const filtered = room === "all" ? rows : rows.filter((row) => row.booking.roomName === room);

  return (
    <section className="mt-14 border-t border-[var(--dd-gold)]/15 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.22em] text-[var(--dd-gold)]">Booking calendar</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setMonth(shiftMonth(month, -1))} className="text-xs text-[var(--dd-gold)]">Prev</button>
          <span className="text-sm">{month}</span>
          <button type="button" onClick={() => setMonth(shiftMonth(month, 1))} className="text-xs text-[var(--dd-gold)]">Next</button>
          <select value={room} onChange={(event) => setRoom(event.target.value)} className="border border-[var(--dd-gold)]/30 bg-[var(--dd-green)] px-2 py-1 text-xs">
            <option value="all">All rooms</option>
            {rooms.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      <div className="mt-4 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((row) => (
          <div key={`${row.night}-${row.booking.id}`} className="border border-[var(--dd-gold)]/20 p-3 text-sm">
            <p className="text-[var(--dd-gold)]">{row.night}</p>
            <p className="mt-1">{row.booking.roomName} · {row.booking.guestName}</p>
            <p className="text-xs capitalize text-[var(--dd-cream)]/55">{row.booking.status.replace("_", " ")} · {row.booking.id}</p>
          </div>
        ))}
      </div>
      {!error && filtered.length === 0 && <p className="mt-4 text-sm text-[var(--dd-cream)]/50">No occupied nights in this view.</p>}
    </section>
  );
}
