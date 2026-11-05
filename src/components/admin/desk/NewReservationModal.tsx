"use client";

import { useState } from "react";
import { useDesk } from "./store";
import { Btn, Field, Modal, Segmented, cx, inputCls, useToast } from "./ui";
import { ROOM_TYPES, stayTotalInr } from "@/lib/inventory-client";
import { addCalendarDays, isLive, rupees, stayNights, todayISO } from "./lib";

type Source = "phone" | "walk_in" | "email" | "ota" | "other";

export function NewReservationModal() {
  const desk = useDesk();
  return (
    <Modal open={!!desk.draft} onClose={desk.closeDraft} title="New reservation" width={720}>
      {desk.draft && <Form key={JSON.stringify(desk.draft)} />}
    </Modal>
  );
}

function Form() {
  const desk = useDesk();
  const toast = useToast();
  const today = todayISO();
  const draft = desk.draft ?? {};
  const [f, setF] = useState({
    roomTypeId: draft.roomTypeId || desk.rooms[0]?.id || ROOM_TYPES[0].id,
    checkIn: draft.checkIn || today,
    checkOut: draft.checkOut || addCalendarDays(draft.checkIn || today, 1),
    guests: "2",
    guestName: "",
    guestPhone: "",
    guestEmail: "",
    source: "phone" as Source,
    paid: false,
    custom: "",
    note: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  const nights = stayNights(f.checkIn, f.checkOut);
  const catalog = ROOM_TYPES.find((r) => r.id === f.roomTypeId);
  const dbRoom = desk.rooms.find((r) => r.id === f.roomTypeId);
  const room = catalog ? { ...catalog, basePriceInr: dbRoom?.basePriceInr ?? catalog.basePriceInr, totalUnits: dbRoom?.totalUnits ?? catalog.totalUnits, name: dbRoom?.name ?? catalog.name } : null;
  const guests = Number(f.guests) || 1;
  const quote = room && nights.length ? stayTotalInr(room, nights.length, guests) : 0;
  const total = f.custom !== "" ? Number(f.custom) || 0 : quote;

  /** Rooms left on the tightest night of the stay, from the desk's live data. */
  const left = (() => {
    if (!room || !nights.length) return null;
    const nowIso = new Date().toISOString();
    const live = desk.bookings.filter((b) => b.roomTypeId === room.id && isLive(b, nowIso));
    return Math.min(...nights.map((n) => room.totalUnits - live.filter((b) => b.checkIn <= n && b.checkOut > n).length));
  })();

  const tooMany = room ? guests > room.maxGuests : false;
  const valid = !!room && nights.length > 0 && f.guestName.trim().length >= 2 && f.guestPhone.trim().length >= 6 && (left ?? 0) > 0 && !tooMany;

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_240px]">
      <div className="space-y-4 p-6">
        <div className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_0.6fr]">
          <Field label="Room type">
            <select className={inputCls} value={f.roomTypeId} onChange={(e) => set({ roomTypeId: e.target.value })}>
              {(desk.rooms.length ? desk.rooms : ROOM_TYPES).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Check-in"><input type="date" className={inputCls} value={f.checkIn} onChange={(e) => set({ checkIn: e.target.value, checkOut: e.target.value >= f.checkOut ? addCalendarDays(e.target.value, 1) : f.checkOut })} /></Field>
          <Field label="Check-out"><input type="date" className={inputCls} value={f.checkOut} min={addCalendarDays(f.checkIn, 1)} onChange={(e) => set({ checkOut: e.target.value })} /></Field>
          <Field label="Guests"><input type="number" min={1} max={8} className={inputCls} value={f.guests} onChange={(e) => set({ guests: e.target.value })} /></Field>
        </div>
        <div className={cx("rounded-xl px-4 py-2.5 text-[13px]", left === null ? "bg-[#f7f4ed]" : left > 0 ? "bg-emerald-50 text-emerald-900" : "bg-rose-50 text-rose-800")}>
          {left === null ? "Choose dates to check availability." : left > 0 ? `${left} ${room?.name} room${left > 1 ? "s" : ""} free for all ${nights.length} night${nights.length > 1 ? "s" : ""}.` : `${room?.name} is full on at least one of these nights.`}
          {tooMany && room && <span className="block text-rose-800">{room.name} sleeps up to {room.maxGuests}.</span>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Guest name"><input className={inputCls} value={f.guestName} onChange={(e) => set({ guestName: e.target.value })} placeholder="Full name" autoFocus /></Field>
          <Field label="Phone"><input className={inputCls} value={f.guestPhone} onChange={(e) => set({ guestPhone: e.target.value })} placeholder="+91 …" inputMode="tel" /></Field>
          <div className="sm:col-span-2">
            <Field label="Email (optional)" hint="Add it so the guest can view their receipt online."><input type="email" className={inputCls} value={f.guestEmail} onChange={(e) => set({ guestEmail: e.target.value })} /></Field>
          </div>
        </div>

        <Field label="Booked via">
          <Segmented<Source>
            value={f.source}
            onChange={(source) => set({ source })}
            options={[
              { value: "phone", label: "Phone" },
              { value: "walk_in", label: "Walk-in" },
              { value: "email", label: "Email" },
              { value: "ota", label: "OTA" },
              { value: "other", label: "Other" },
            ]}
          />
        </Field>
        <Field label="Note (optional)"><input className={inputCls} value={f.note} onChange={(e) => set({ note: e.target.value })} placeholder="Arrival time, requests, ID…" /></Field>
      </div>

      <aside className="flex flex-col gap-4 border-t border-[var(--a-line)] bg-[#faf8f3] p-6 md:rounded-br-2xl md:border-l md:border-t-0">
        <div>
          <p className="text-[12px] text-[var(--a-muted)]">{room?.name} · {nights.length} night{nights.length === 1 ? "" : "s"}</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-[34px] leading-none">{rupees(total)}</p>
          {f.custom === "" && room && nights.length > 0 && <p className="mt-1 text-[12px] text-[var(--a-muted)]">{rupees(room.basePriceInr)} × {nights.length}{guests > room.occupancy ? " + extra bed" : ""}</p>}
        </div>
        <Field label="Custom total (₹)" hint="Leave blank to use the rate.">
          <input type="number" min={0} className={inputCls} value={f.custom} onChange={(e) => set({ custom: e.target.value })} placeholder={String(quote)} />
        </Field>
        <Field label="Payment">
          <Segmented<"later" | "paid">
            value={f.paid ? "paid" : "later"}
            onChange={(v) => set({ paid: v === "paid" })}
            options={[{ value: "later", label: "At check-in" }, { value: "paid", label: "Paid now" }]}
          />
        </Field>
        <Btn
          variant="primary"
          className="mt-auto w-full"
          disabled={!valid || busy}
          onClick={async () => {
            setBusy(true);
            const created = await desk.createBooking({
              kind: "reservation",
              roomTypeId: f.roomTypeId,
              checkIn: f.checkIn,
              checkOut: f.checkOut,
              guests,
              guestName: f.guestName.trim(),
              guestPhone: f.guestPhone.trim(),
              guestEmail: f.guestEmail.trim(),
              source: f.source,
              paid: f.paid,
              amountOverrideInr: f.custom !== "" ? Number(f.custom) : undefined,
              note: f.note.trim() || undefined,
            });
            setBusy(false);
            if (created) {
              toast(`Booked ${f.guestName.trim()} · ${created.id.toUpperCase()}`);
              desk.closeDraft();
              desk.openBooking(created.id);
            }
          }}
        >
          {busy ? "Booking…" : "Create reservation"}
        </Btn>
      </aside>
    </div>
  );
}
