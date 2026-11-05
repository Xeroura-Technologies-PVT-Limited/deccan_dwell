"use client";

import { useMemo, useState } from "react";
import { useDesk } from "./store";
import { Btn, Empty, PaidPill, Segmented, StatusPill, cx, inputCls } from "./ui";
import { balanceDue, downloadCsv, fmtDay, isPaid, nightsOf, rupees, sourceOf, todayISO, type AdminBooking } from "./lib";

type Filter = "upcoming" | "inhouse" | "departed" | "holds" | "cancelled" | "all";
type SortKey = "checkIn" | "createdAt" | "guestName" | "amountInr";
const PAGE = 25;

export function ReservationsView() {
  const desk = useDesk();
  const today = todayISO();
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [room, setRoom] = useState("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "checkIn", dir: 1 });
  const [page, setPage] = useState(0);

  const guests = useMemo(() => desk.bookings.filter((b) => b.status !== "blocked"), [desk.bookings]);
  const match: Record<Filter, (b: AdminBooking) => boolean> = {
    upcoming: (b) => b.status === "confirmed" && b.checkOut >= today,
    inhouse: (b) => b.status === "checked_in",
    departed: (b) => b.status === "checked_out",
    holds: (b) => b.status === "pending",
    cancelled: (b) => ["cancelled", "no_show", "expired"].includes(b.status),
    all: () => true,
  };
  const counts = Object.fromEntries((Object.keys(match) as Filter[]).map((k) => [k, guests.filter(match[k]).length])) as Record<Filter, number>;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return guests
      .filter(match[filter])
      .filter((b) => room === "all" || b.roomTypeId === room)
      .filter((b) => !from || b.checkOut > from)
      .filter((b) => !to || b.checkIn <= to)
      .filter(
        (b) =>
          !term ||
          b.guestName.toLowerCase().includes(term) ||
          b.guestEmail.toLowerCase().includes(term) ||
          b.id.toLowerCase().includes(term) ||
          (digits.length >= 3 && b.guestPhone.replace(/\D/g, "").includes(digits)),
      )
      .sort((a, b) => {
        const av = a[sort.key] as string | number;
        const bv = b[sort.key] as string | number;
        return (av > bv ? 1 : av < bv ? -1 : 0) * sort.dir;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guests, filter, room, q, from, to, sort, today]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const totals = rows.reduce((t, b) => ({ amount: t.amount + b.amountInr, due: t.due + balanceDue(b), nights: t.nights + nightsOf(b) }), { amount: 0, due: 0, nights: 0 });

  const th = (key: SortKey, label: string, cls = "") => (
    <th className={cx("px-4 py-3 font-medium", cls)}>
      <button type="button" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))} className="inline-flex items-center gap-1 hover:text-[var(--a-ink)]">
        {label}
        <span className="text-[10px]">{sort.key === key ? (sort.dir === 1 ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );

  const exportCsv = () =>
    downloadCsv(`deccan-dwell-reservations-${today}.csv`, [
      ["Booking", "Guest", "Phone", "Email", "Room", "Check-in", "Check-out", "Nights", "Guests", "Total", "Paid", "Due", "Source", "Status", "Booked at", "Note"],
      ...rows.map((b) => [b.id.toUpperCase(), b.guestName, b.guestPhone, b.guestEmail, b.roomName, b.checkIn, b.checkOut, nightsOf(b), b.guests, b.amountInr, isPaid(b) ? "Yes" : "No", balanceDue(b), sourceOf(b), b.status, b.createdAt, b.adminNote ?? ""]),
    ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={filter}
          onChange={(v) => { setFilter(v); setPage(0); setSort({ key: v === "departed" || v === "all" ? "createdAt" : "checkIn", dir: v === "departed" || v === "all" ? -1 : 1 }); }}
          options={[
            { value: "upcoming", label: "Upcoming", count: counts.upcoming },
            { value: "inhouse", label: "In house", count: counts.inhouse },
            { value: "departed", label: "Departed", count: counts.departed },
            { value: "holds", label: "On hold", count: counts.holds },
            { value: "cancelled", label: "Cancelled", count: counts.cancelled },
            { value: "all", label: "All", count: counts.all },
          ]}
        />
        <Btn onClick={exportCsv}>Export CSV</Btn>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_auto_auto]">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Filter by guest, phone, email or booking no." className={inputCls} />
        <select value={room} onChange={(e) => { setRoom(e.target.value); setPage(0); }} className={inputCls}>
          <option value="all">All rooms</option>
          {desk.rooms.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--a-muted)]">Stay from<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={cx(inputCls, "w-[150px]")} /></label>
        <label className="flex items-center gap-2 text-[12.5px] text-[var(--a-muted)]">to<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={cx(inputCls, "w-[150px]")} /></label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--a-line)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead className="border-b border-[var(--a-line)] bg-[#faf8f3] text-[12px] text-[var(--a-muted)]">
              <tr>
                {th("guestName", "Guest")}
                <th className="px-4 py-3 font-medium">Room</th>
                {th("checkIn", "Stay")}
                <th className="px-4 py-3 font-medium">Guests</th>
                {th("amountInr", "Total", "text-right")}
                <th className="px-4 py-3 font-medium">Payment</th>
                <th className="px-4 py-3 font-medium">Source</th>
                {th("createdAt", "Booked")}
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--a-line)]">
              {shown.map((b) => (
                <tr key={b.id} onClick={() => desk.openBooking(b.id)} className="cursor-pointer transition hover:bg-[#fbfaf6]">
                  <td className="px-4 py-3">
                    <span className="block font-medium">{b.guestName}</span>
                    <span className="block text-[12px] text-[var(--a-muted)]">{b.guestPhone || b.guestEmail || "—"} · <span className="font-mono">{b.id.toUpperCase()}</span></span>
                  </td>
                  <td className="px-4 py-3">{b.roomName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {fmtDay(b.checkIn)} → {fmtDay(b.checkOut)}
                    <span className="block text-[12px] text-[var(--a-muted)]">{nightsOf(b)} night{nightsOf(b) > 1 ? "s" : ""}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{b.guests}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{rupees(b.amountInr)}</td>
                  <td className="px-4 py-3"><PaidPill paid={isPaid(b)} due={balanceDue(b)} /></td>
                  <td className="px-4 py-3 text-[var(--a-muted)]">{sourceOf(b)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-[var(--a-muted)]">{fmtDay(b.createdAt.slice(0, 10))}</td>
                  <td className="px-4 py-3"><StatusPill status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="p-5"><Empty>No reservations match these filters.</Empty></div>}
        {rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--a-line)] bg-[#faf8f3] px-4 py-3 text-[12.5px] text-[var(--a-muted)]">
            <span>
              {rows.length} reservation{rows.length > 1 ? "s" : ""} · {totals.nights} nights · {rupees(totals.amount)}
              {totals.due > 0 && <span className="text-amber-800"> · {rupees(totals.due)} to collect</span>}
            </span>
            {pages > 1 && (
              <span className="flex items-center gap-2">
                <Btn size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Btn>
                <span className="tabular-nums">{page + 1} / {pages}</span>
                <Btn size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</Btn>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
