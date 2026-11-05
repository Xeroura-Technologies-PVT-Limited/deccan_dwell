"use client";

import { useMemo } from "react";
import { useDesk } from "./store";
import { Btn, Card, Empty, Kpi, StatusPill, PaidPill, cx } from "./ui";
import { Columns } from "./charts";
import { collections, occupancyMap, periodStats, totalUnits } from "./metrics";
import { addCalendarDays, balanceDue, fmtDay, fmtStamp, isPaid, nightsOf, rupees, todayISO, type AdminBooking } from "./lib";

type Go = (v: "today" | "calendar" | "reservations" | "guests" | "rooms" | "requests" | "reports") => void;

export function TodayView({ go }: { go: Go }) {
  const desk = useDesk();
  const today = todayISO();
  const units = totalUnits(desk.rooms);

  const d = useMemo(() => {
    const guests = desk.bookings.filter((b) => b.status !== "blocked");
    const arrivals = guests.filter((b) => b.checkIn === today && ["confirmed", "pending", "checked_in"].includes(b.status));
    const departures = guests.filter((b) => b.checkOut === today && ["checked_in", "confirmed", "checked_out"].includes(b.status));
    const inHouse = guests.filter((b) => b.status === "checked_in");
    const late = guests.filter((b) => b.status === "confirmed" && b.checkIn < today);
    const overstay = guests.filter((b) => b.status === "checked_in" && b.checkOut < today);
    const unpaidInHouse = inHouse.filter((b) => balanceDue(b) > 0);
    const holds = desk.bookings.filter((b) => b.status === "pending" && b.holdExpiresAt && b.holdExpiresAt > new Date().toISOString());
    const occ = occupancyMap(desk.bookings, today, 14);
    const tonight = occ.get(today) ?? { guests: 0, blocked: 0 };
    const month = today.slice(0, 7);
    const mtd = periodStats(desk.bookings, desk.rooms, `${month}-01`, addCalendarDays(today, 1));
    const recent = desk.bookings.filter((b) => b.status !== "blocked").slice(0, 6);
    const dueToday = [...arrivals, ...inHouse].reduce((n, b) => n + balanceDue(b), 0);
    const takenToday = collections(desk.bookings, today, addCalendarDays(today, 1));
    return { takenToday, arrivals, departures, inHouse, late, overstay, unpaidInHouse, holds, occ, tonight, mtd, recent, dueToday };
  }, [desk.bookings, desk.rooms, today]);

  const sellable = Math.max(0, units - d.tonight.blocked);
  const occPct = sellable ? Math.round((d.tonight.guests / sellable) * 100) : 0;
  const pendingRequests = desk.requests.filter((r) => r.status === "pending");
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const forecast = Array.from({ length: 14 }, (_, i) => {
    const day = addCalendarDays(today, i);
    const o = d.occ.get(day) ?? { guests: 0, blocked: 0 };
    const cap = Math.max(1, units - o.blocked);
    return { key: day, label: fmtDay(day).split(" ")[0], sub: day.slice(8), value: Math.round((o.guests / cap) * 100), note: `${o.guests} of ${cap} rooms` };
  });

  const attention = [
    ...pendingRequests.map((r) => ({ key: r.id, text: `${r.booking.guestName} asked to ${r.type === "cancellation" ? "cancel" : "change dates"}`, action: () => go("requests"), cta: "Review" })),
    ...d.late.map((b) => ({ key: `late-${b.id}`, text: `${b.guestName} was due ${fmtDay(b.checkIn)} and hasn't checked in`, action: () => desk.openBooking(b.id), cta: "Open" })),
    ...d.overstay.map((b) => ({ key: `over-${b.id}`, text: `${b.guestName} was due to leave ${fmtDay(b.checkOut)}`, action: () => desk.openBooking(b.id), cta: "Open" })),
    ...d.unpaidInHouse.map((b) => ({ key: `due-${b.id}`, text: `${b.guestName} has ${rupees(balanceDue(b))} to settle`, action: () => desk.openBooking(b.id), cta: "Settle" })),
    ...d.holds.map((b) => ({ key: `hold-${b.id}`, text: `${b.guestName} is mid-payment online (room held)`, action: () => desk.openBooking(b.id), cta: "Open" })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-[var(--a-muted)]">{fmtDay(today)}</p>
          <h2 className="font-[family-name:var(--font-display)] text-[34px] leading-tight">{greeting}.</h2>
        </div>
        <div className="flex gap-2">
          <Btn onClick={() => go("calendar")}>Open calendar</Btn>
          <Btn variant="primary" onClick={() => desk.newReservation({ checkIn: today, checkOut: addCalendarDays(today, 1) })}>Walk-in</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi accent label="Occupancy tonight" value={`${occPct}%`} hint={`${d.tonight.guests} of ${sellable} rooms${d.tonight.blocked ? ` · ${d.tonight.blocked} blocked` : ""}`} />
        <Kpi label="Arrivals" value={d.arrivals.length} hint={`${d.arrivals.filter((b) => b.status === "checked_in").length} checked in`} />
        <Kpi label="Departures" value={d.departures.length} hint={`${d.departures.filter((b) => b.status === "checked_out").length} checked out`} />
        <Kpi label="In house" value={d.inHouse.length} hint="guests staying now" />
        <Kpi label="Revenue this month" value={rupees(d.mtd.revenue)} hint={`ADR ${rupees(d.mtd.adr)} · RevPAR ${rupees(d.mtd.revpar)}`} />
        <Kpi label="To collect" value={rupees(d.dueToday)} hint={`${rupees(d.takenToday.net)} received today`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Movement title="Arrivals" empty="No arrivals today." rows={d.arrivals} kind="arrival" />
        <Movement title="Departures" empty="No departures today." rows={d.departures} kind="departure" />
        <Movement title="In house" empty="Nobody is checked in." rows={d.inHouse} kind="inhouse" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Occupancy · next 14 days" action={<span className="text-[12px] text-[var(--a-muted)]">% of sellable rooms</span>}>
          <Columns data={forecast} max={100} format={(v) => `${v}%`} highlight={today} />
        </Card>
        <Card title="Needs attention" action={attention.length ? <span className="rounded-full bg-amber-100 px-2 text-[12px] font-medium text-amber-900">{attention.length}</span> : null}>
          {attention.length === 0 ? (
            <Empty>All clear — nothing waiting on you.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--a-line)]">
              {attention.slice(0, 7).map((a) => (
                <li key={a.key} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <span>{a.text}</span>
                  <Btn size="sm" onClick={a.action}>{a.cta}</Btn>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Latest bookings" action={<Btn size="sm" variant="ghost" onClick={() => go("reservations")}>All reservations →</Btn>} pad={false}>
        {d.recent.length === 0 ? (
          <div className="p-5"><Empty>No bookings yet.</Empty></div>
        ) : (
          <ul className="divide-y divide-[var(--a-line)]">
            {d.recent.map((b) => (
              <li key={b.id}>
                <button type="button" onClick={() => desk.openBooking(b.id)} className="grid w-full grid-cols-[1fr_auto] items-center gap-3 px-5 py-3 text-left hover:bg-[#fbfaf6] sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <span>
                    <span className="block text-[13.5px] font-medium">{b.guestName}</span>
                    <span className="block text-[12px] text-[var(--a-muted)]">Booked {fmtStamp(b.createdAt)}</span>
                  </span>
                  <span className="hidden text-[13px] sm:block">{b.roomName}</span>
                  <span className="hidden text-[13px] text-[var(--a-muted)] sm:block">{fmtDay(b.checkIn)} · {nightsOf(b)}n</span>
                  <StatusPill status={b.status} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Movement({ title, rows, empty, kind }: { title: string; rows: AdminBooking[]; empty: string; kind: "arrival" | "departure" | "inhouse" }) {
  const desk = useDesk();
  return (
    <Card title={<span>{title} <span className="ml-1 text-[var(--a-muted)]">{rows.length}</span></span>} pad={false}>
      {rows.length === 0 ? (
        <div className="p-5"><Empty>{empty}</Empty></div>
      ) : (
        <ul className="divide-y divide-[var(--a-line)]">
          {rows.map((b) => {
            const due = balanceDue(b);
            return (
              <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                <button type="button" onClick={() => desk.openBooking(b.id)} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[13.5px] font-medium">{b.guestName}</span>
                  <span className="block truncate text-[12px] text-[var(--a-muted)]">
                    {b.roomName} · {b.guests} guest{b.guests > 1 ? "s" : ""} · {kind === "inhouse" ? `leaves ${fmtDay(b.checkOut)}` : `${nightsOf(b)} night${nightsOf(b) > 1 ? "s" : ""}`}
                  </span>
                </button>
                <span className={cx("hidden sm:block", kind === "inhouse" && "sm:hidden 2xl:block")}><PaidPill paid={isPaid(b)} due={due} /></span>
                {kind === "arrival" && b.status === "confirmed" && (
                  <Btn size="sm" variant="primary" onClick={() => desk.patchBooking(b.id, { action: "set_status", status: "checked_in" }, `${b.guestName} checked in`)}>Check in</Btn>
                )}
                {kind === "arrival" && b.status !== "confirmed" && <StatusPill status={b.status} />}
                {kind === "departure" && b.status !== "checked_out" && (
                  due > 0 ? (
                    <Btn size="sm" variant="gold" onClick={() => desk.openBooking(b.id)}>Settle</Btn>
                  ) : (
                    <Btn size="sm" variant="primary" onClick={() => desk.patchBooking(b.id, { action: "set_status", status: "checked_out" }, `${b.guestName} checked out`)}>Check out</Btn>
                  )
                )}
                {kind === "departure" && b.status === "checked_out" && <StatusPill status={b.status} />}
                {kind === "inhouse" && <Btn size="sm" onClick={() => desk.openBooking(b.id)}>Open</Btn>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
