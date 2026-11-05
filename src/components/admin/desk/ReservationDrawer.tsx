"use client";

import { useState, type ReactNode } from "react";
import { useDesk } from "./store";
import { Btn, ConfirmBtn, Drawer, Field, PaidPill, StatusPill, inputCls, useToast } from "./ui";
import { CHECK_IN_TIME, CHECK_OUT_TIME } from "@/lib/hotel";
import { balanceDue, fmtDate, fmtStamp, isPaid, nightsOf, noteText, rupees, sourceOf, todayISO, whatsappHref, type AdminBooking } from "./lib";

export function ReservationDrawer() {
  const desk = useDesk();
  const booking = desk.bookings.find((b) => b.id === desk.openId) ?? null;
  return (
    <Drawer open={!!booking} onClose={() => desk.openBooking(null)} width={560}>
      {booking && <Detail key={booking.id} b={booking} />}
    </Drawer>
  );
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--a-line)] bg-white">
      <header className="flex items-center justify-between border-b border-[var(--a-line)] px-5 py-3">
        <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--a-muted)]">{title}</h4>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-[13.5px]">
      <span className="text-[var(--a-muted)]">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}

function Detail({ b }: { b: AdminBooking }) {
  const desk = useDesk();
  const toast = useToast();
  const today = todayISO();
  const due = balanceDue(b);
  const paid = isPaid(b);
  const block = b.status === "blocked";
  const [busy, setBusy] = useState(false);
  const [editStay, setEditStay] = useState(false);
  const [editGuest, setEditGuest] = useState(false);
  const [note, setNote] = useState(noteText(b));

  const run = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    const ok = await desk.patchBooking(b.id, body, msg);
    setBusy(false);
    return ok;
  };
  const source = sourceOf(b);
  const receiptUrl = b.guestEmail ? `/booking/${b.id}?email=${encodeURIComponent(b.guestEmail)}` : "";

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-[var(--a-line)] bg-white px-6 pb-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <StatusPill status={b.status} />
              {!block && <PaidPill paid={paid} due={due} />}
            </div>
            <h2 className="mt-3 truncate font-[family-name:var(--font-display)] text-[32px] leading-tight">{b.guestName}</h2>
            <p className="mt-1 text-[12.5px] text-[var(--a-muted)]">
              <button type="button" className="font-mono hover:text-[var(--a-ink)]" onClick={() => { navigator.clipboard?.writeText(b.id.toUpperCase()); toast("Booking number copied"); }}>
                {b.id.toUpperCase()}
              </button>
              {" · "}
              {source} · booked {fmtStamp(b.createdAt)}
            </p>
          </div>
          <button type="button" onClick={() => desk.openBooking(null)} aria-label="Close" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--a-muted)] hover:bg-black/5">✕</button>
        </div>

        {/* Primary actions for where the guest is in their stay */}
        <div className="mt-5 flex flex-wrap gap-2">
          {b.status === "confirmed" && (
            <Btn variant="primary" disabled={busy || b.checkIn > today} onClick={() => run({ action: "set_status", status: "checked_in" }, `${b.guestName} checked in`)} title={b.checkIn > today ? `Arrives ${fmtDate(b.checkIn)}` : undefined}>
              Check in
            </Btn>
          )}
          {b.status === "checked_in" && (
            due > 0 ? (
              <ConfirmBtn
                variant="primary"
                disabled={busy}
                label={`Collect ${rupees(due)} & check out`}
                confirmLabel={`Received ${rupees(due)}? Check out`}
                onConfirm={async () => {
                  if (await run({ action: "mark_paid" }, "Payment recorded")) await run({ action: "set_status", status: "checked_out" }, `${b.guestName} checked out`);
                }}
              />
            ) : (
              <Btn variant="primary" disabled={busy} onClick={() => run({ action: "set_status", status: "checked_out" }, `${b.guestName} checked out`)}>Check out</Btn>
            )
          )}
          {!block && !paid && ["pending", "confirmed", "checked_in", "checked_out"].includes(b.status) && (
            <ConfirmBtn variant="gold" disabled={busy} label={`Record payment · ${rupees(b.amountInr)}`} confirmLabel="Payment received?" onConfirm={() => run({ action: "mark_paid" }, "Payment recorded")} />
          )}
          {b.status === "confirmed" && b.checkIn <= today && (
            <ConfirmBtn variant="secondary" disabled={busy} label="No-show" confirmLabel="Mark no-show?" onConfirm={() => run({ action: "set_status", status: "no_show" }, "Marked as no-show")} />
          )}
          {["pending", "confirmed"].includes(b.status) && (
            <ConfirmBtn variant="danger" disabled={busy} label="Cancel booking" confirmLabel="Cancel for sure?" onConfirm={() => run({ action: "cancel" }, "Booking cancelled")} />
          )}
          {block && <ConfirmBtn variant="danger" disabled={busy} label="Release rooms" confirmLabel="Release?" onConfirm={() => run({ action: "cancel" }, "Room released")} />}
        </div>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        <Section title="Stay" action={["pending", "confirmed", "checked_in", "blocked"].includes(b.status) && <Btn size="sm" variant="ghost" onClick={() => setEditStay((v) => !v)}>{editStay ? "Close" : "Change"}</Btn>}>
          {editStay ? (
            <StayEditor b={b} onDone={() => setEditStay(false)} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#f7f4ed] p-3">
                  <p className="text-[11.5px] text-[var(--a-muted)]">Check-in</p>
                  <p className="text-[14px] font-medium">{fmtDate(b.checkIn)}</p>
                  <p className="text-[12px] text-[var(--a-muted)]">from {CHECK_IN_TIME}</p>
                </div>
                <div className="rounded-xl bg-[#f7f4ed] p-3">
                  <p className="text-[11.5px] text-[var(--a-muted)]">Check-out</p>
                  <p className="text-[14px] font-medium">{fmtDate(b.checkOut)}</p>
                  <p className="text-[12px] text-[var(--a-muted)]">by {CHECK_OUT_TIME}</p>
                </div>
              </div>
              <div className="mt-3">
                <Row k="Room" v={b.roomName} />
                <Row k="Nights" v={nightsOf(b)} />
                {!block && <Row k="Guests" v={b.guests} />}
              </div>
            </>
          )}
        </Section>

        {!block && (
          <Section title="Guest" action={<Btn size="sm" variant="ghost" onClick={() => setEditGuest((v) => !v)}>{editGuest ? "Close" : "Edit"}</Btn>}>
            {editGuest ? (
              <GuestEditor b={b} onDone={() => setEditGuest(false)} />
            ) : (
              <>
                <Row k="Phone" v={b.guestPhone || "—"} />
                <Row k="Email" v={b.guestEmail || "—"} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.guestPhone && <a href={`tel:${b.guestPhone}`} className="rounded-lg border border-[var(--a-line)] px-3 py-1.5 text-[12.5px] hover:bg-[#f7f4ed]">Call</a>}
                  {whatsappHref(b.guestPhone) && <a href={whatsappHref(b.guestPhone)} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--a-line)] px-3 py-1.5 text-[12.5px] hover:bg-[#f7f4ed]">WhatsApp</a>}
                  {b.guestEmail && <a href={`mailto:${b.guestEmail}?subject=${encodeURIComponent(`Your stay at Deccan Dwell · ${b.id.toUpperCase()}`)}`} className="rounded-lg border border-[var(--a-line)] px-3 py-1.5 text-[12.5px] hover:bg-[#f7f4ed]">Email</a>}
                  {receiptUrl && <a href={receiptUrl} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--a-line)] px-3 py-1.5 text-[12.5px] hover:bg-[#f7f4ed]">Guest receipt ↗</a>}
                </div>
              </>
            )}
          </Section>
        )}

        {!block && (
          <Section title="Payment">
            <Row k="Total" v={<span className="font-[family-name:var(--font-display)] text-[22px]">{rupees(b.amountInr)}</span>} />
            <Row k="Method" v={b.paymentMethod === "online" ? "Paid online" : "Pay at hotel"} />
            <Row k="Status" v={<PaidPill paid={paid} due={due} />} />
            {b.paymentId?.startsWith("pay_") && <Row k="Razorpay ID" v={<span className="font-mono text-[12px]">{b.paymentId}</span>} />}
            {b.status === "pending" && b.holdExpiresAt && <Row k="Hold expires" v={fmtStamp(b.holdExpiresAt)} />}
          </Section>
        )}

        <Section title="Internal note">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Visible to staff only — preferences, arrival time, ID details…"
            className={`${inputCls} h-auto min-h-[88px] py-2`}
          />
          <div className="mt-2 flex justify-end">
            <Btn
              size="sm"
              disabled={busy || note.trim() === noteText(b)}
              onClick={() => {
                const sourceLine = b.adminNote?.match(/^Source:.*$/m)?.[0];
                run({ action: "note", note: [sourceLine, note.trim()].filter(Boolean).join("\n") }, "Note saved");
              }}
            >
              Save note
            </Btn>
          </div>
        </Section>
      </div>
    </div>
  );
}

function StayEditor({ b, onDone }: { b: AdminBooking; onDone: () => void }) {
  const desk = useDesk();
  const [f, setF] = useState({ roomTypeId: b.roomTypeId, checkIn: b.checkIn, checkOut: b.checkOut, guests: String(b.guests), reprice: false });
  const [busy, setBusy] = useState(false);
  const room = desk.rooms.find((r) => r.id === f.roomTypeId);
  const nights = Math.max(0, Math.round((Date.parse(f.checkOut) - Date.parse(f.checkIn)) / 86_400_000));
  return (
    <div className="space-y-3">
      <Field label="Room type">
        <select className={inputCls} value={f.roomTypeId} onChange={(e) => setF({ ...f, roomTypeId: e.target.value })}>
          {desk.rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {rupees(r.basePriceInr)}/night</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Check-in"><input type="date" className={inputCls} value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></Field>
        <Field label="Check-out"><input type="date" className={inputCls} value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field>
        <Field label="Guests"><input type="number" min={1} max={8} className={inputCls} value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })} /></Field>
      </div>
      {b.status !== "blocked" && (
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={f.reprice} onChange={(e) => setF({ ...f, reprice: e.target.checked })} />
          Re-price at the current rate {room && nights > 0 ? `(about ${rupees(room.basePriceInr * nights)})` : ""}
        </label>
      )}
      <div className="flex justify-end gap-2">
        <Btn size="sm" variant="ghost" onClick={onDone}>Cancel</Btn>
        <Btn
          size="sm"
          variant="primary"
          disabled={busy || nights < 1}
          onClick={async () => {
            setBusy(true);
            const ok = await desk.patchBooking(b.id, { action: "update_stay", roomTypeId: f.roomTypeId, checkIn: f.checkIn, checkOut: f.checkOut, guests: Number(f.guests) || b.guests, repriceStay: f.reprice }, "Stay updated");
            setBusy(false);
            if (ok) onDone();
          }}
        >
          {busy ? "Checking availability…" : "Save changes"}
        </Btn>
      </div>
    </div>
  );
}

function GuestEditor({ b, onDone }: { b: AdminBooking; onDone: () => void }) {
  const desk = useDesk();
  const [f, setF] = useState({ guestName: b.guestName, guestPhone: b.guestPhone, guestEmail: b.guestEmail, amountInr: String(b.amountInr) });
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-3">
      <Field label="Name"><input className={inputCls} value={f.guestName} onChange={(e) => setF({ ...f, guestName: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone"><input className={inputCls} value={f.guestPhone} onChange={(e) => setF({ ...f, guestPhone: e.target.value })} /></Field>
        <Field label="Email"><input className={inputCls} type="email" value={f.guestEmail} onChange={(e) => setF({ ...f, guestEmail: e.target.value })} /></Field>
      </div>
      <Field label="Agreed total (₹)" hint="Change only for a negotiated or corrected price.">
        <input className={inputCls} type="number" min={0} value={f.amountInr} onChange={(e) => setF({ ...f, amountInr: e.target.value })} />
      </Field>
      <div className="flex justify-end gap-2">
        <Btn size="sm" variant="ghost" onClick={onDone}>Cancel</Btn>
        <Btn
          size="sm"
          variant="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await desk.patchBooking(b.id, { action: "update_guest", guestName: f.guestName, guestPhone: f.guestPhone, guestEmail: f.guestEmail, amountInr: Number(f.amountInr) }, "Guest details saved");
            setBusy(false);
            if (ok) onDone();
          }}
        >
          Save
        </Btn>
      </div>
    </div>
  );
}
