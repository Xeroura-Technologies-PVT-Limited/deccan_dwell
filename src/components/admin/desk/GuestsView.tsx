"use client";

import { Fragment, useMemo, useState } from "react";
import { useDesk } from "./store";
import { Btn, Empty, StatusPill, inputCls } from "./ui";
import { downloadCsv, fmtDate, fmtDay, isSold, nightsOf, rupees, todayISO, whatsappHref, type AdminBooking } from "./lib";

type Guest = { key: string; name: string; email: string; phone: string; stays: AdminBooking[]; nights: number; spent: number; last?: string; next?: string };

export function GuestsView() {
  const desk = useDesk();
  const today = todayISO();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const guests = useMemo(() => {
    const map = new Map<string, Guest>();
    for (const b of desk.bookings) {
      if (b.status === "blocked") continue;
      const key = (b.guestEmail || b.guestPhone.replace(/\D/g, "") || b.guestName).toLowerCase();
      const g = map.get(key) ?? { key, name: b.guestName, email: b.guestEmail, phone: b.guestPhone, stays: [], nights: 0, spent: 0 };
      g.stays.push(b);
      if (!g.phone && b.guestPhone) g.phone = b.guestPhone;
      if (isSold(b)) {
        g.nights += nightsOf(b);
        g.spent += b.amountInr;
        if (b.checkIn <= today && (!g.last || b.checkIn > g.last)) g.last = b.checkIn;
        if (b.checkIn > today && (!g.next || b.checkIn < g.next)) g.next = b.checkIn;
      }
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
  }, [desk.bookings, today]);

  const term = q.trim().toLowerCase();
  const rows = guests.filter((g) => !term || g.name.toLowerCase().includes(term) || g.email.includes(term) || g.phone.replace(/\D/g, "").includes(term.replace(/\D/g, "") || "§"));
  const repeat = guests.filter((g) => g.stays.filter(isSold).length > 1).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--a-muted)]">
          {guests.length} guests · {repeat} returning
        </p>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a guest" className={`${inputCls} w-[260px]`} />
          <Btn
            onClick={() =>
              downloadCsv(`deccan-dwell-guests-${today}.csv`, [
                ["Guest", "Email", "Phone", "Stays", "Nights", "Spent", "Last stay", "Next stay"],
                ...rows.map((g) => [g.name, g.email, g.phone, g.stays.filter(isSold).length, g.nights, g.spent, g.last ?? "", g.next ?? ""]),
              ])
            }
          >
            Export CSV
          </Btn>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--a-line)] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[13px]">
            <thead className="border-b border-[var(--a-line)] bg-[#faf8f3] text-[12px] text-[var(--a-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Guest</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 text-right font-medium">Stays</th>
                <th className="px-4 py-3 text-right font-medium">Nights</th>
                <th className="px-4 py-3 text-right font-medium">Spent</th>
                <th className="px-4 py-3 font-medium">Last stay</th>
                <th className="px-4 py-3 font-medium">Next stay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--a-line)]">
              {rows.map((g) => (
                <Fragment key={g.key}>
                  <tr onClick={() => setOpen(open === g.key ? null : g.key)} className="cursor-pointer hover:bg-[#fbfaf6]">
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#0b3d33]/10 text-[12px] font-semibold text-[#0b3d33]">
                          {g.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </span>
                        <span className="font-medium">{g.name}</span>
                        {g.stays.filter(isSold).length > 1 && <span className="rounded-full bg-[#b48a3c]/15 px-2 text-[11px] font-medium text-[#7a5a1f]">Returning</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--a-muted)]">
                      <span className="block">{g.phone || "—"}</span>
                      <span className="block">{g.email}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{g.stays.filter(isSold).length}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{g.nights}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{rupees(g.spent)}</td>
                    <td className="px-4 py-3">{g.last ? fmtDate(g.last) : "—"}</td>
                    <td className="px-4 py-3">{g.next ? fmtDate(g.next) : "—"}</td>
                  </tr>
                  {open === g.key && (
                    <tr className="bg-[#fbfaf6]">
                      <td colSpan={7} className="px-4 py-3">
                        <div className="mb-2 flex flex-wrap gap-2">
                          {g.phone && <a href={`tel:${g.phone}`} className="rounded-lg border border-[var(--a-line)] bg-white px-3 py-1.5 text-[12.5px]">Call</a>}
                          {whatsappHref(g.phone) && <a href={whatsappHref(g.phone)} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--a-line)] bg-white px-3 py-1.5 text-[12.5px]">WhatsApp</a>}
                          {g.email && <a href={`mailto:${g.email}`} className="rounded-lg border border-[var(--a-line)] bg-white px-3 py-1.5 text-[12.5px]">Email</a>}
                        </div>
                        <ul className="divide-y divide-[var(--a-line)] rounded-xl border border-[var(--a-line)] bg-white">
                          {g.stays.map((b) => (
                            <li key={b.id}>
                              <button type="button" onClick={() => desk.openBooking(b.id)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-[#f7f4ed]">
                                <span>{b.roomName} · {fmtDay(b.checkIn)} → {fmtDay(b.checkOut)} · {rupees(b.amountInr)}</span>
                                <StatusPill status={b.status} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <div className="p-5"><Empty>No guests found.</Empty></div>}
      </div>
    </div>
  );
}
