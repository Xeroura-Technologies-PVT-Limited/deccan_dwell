"use client";

import { useState, type ReactNode } from "react";
import { useDesk } from "./store";
import { Btn, ConfirmBtn, Drawer, Field, PaidPill, Segmented, StatusPill, inputCls, useToast } from "./ui";
import { CHECK_IN_TIME, CHECK_OUT_TIME } from "@/lib/hotel";
import { METHODS, balanceDue, confirmationText, creditHeld, fmtDate, fmtStamp, isPaid, methodLabel, nightsOf, noteText, paidAmount, rupees, sourceOf, todayISO, whatsappHref, type AdminBooking } from "./lib";

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
  const [pay, setPay] = useState<null | { checkout: boolean }>(null);
  const [cancelling, setCancelling] = useState(false);
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
              {!block && ["pending", "confirmed", "checked_in", "checked_out"].includes(b.status) && <PaidPill paid={paid} due={due} />}
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
              <Btn variant="primary" disabled={busy} onClick={() => setPay({ checkout: true })}>Collect {rupees(due)} &amp; check out</Btn>
            ) : (
              <Btn variant="primary" disabled={busy} onClick={() => run({ action: "set_status", status: "checked_out" }, `${b.guestName} checked out`)}>Check out</Btn>
            )
          )}
          {!block && due > 0 && ["pending", "confirmed", "checked_in", "checked_out"].includes(b.status) && (
            <Btn variant="gold" disabled={busy} onClick={() => setPay({ checkout: false })}>Take payment</Btn>
          )}
          {b.status === "confirmed" && b.checkIn <= today && (
            <ConfirmBtn variant="secondary" disabled={busy} label="No-show" confirmLabel="Mark no-show?" onConfirm={() => run({ action: "set_status", status: "no_show" }, "Marked as no-show")} />
          )}
          {["pending", "confirmed", "checked_in"].includes(b.status) && (
            <Btn variant="danger" disabled={busy} onClick={() => setCancelling(true)}>Cancel booking</Btn>
          )}
          {["cancelled", "no_show", "expired"].includes(b.status) && !block && (
            <ConfirmBtn variant="primary" disabled={busy} label="Reinstate booking" confirmLabel="Reinstate if free?" onConfirm={() => run({ action: "reinstate" }, "Booking reinstated")} />
          )}
          {block && <ConfirmBtn variant="danger" disabled={busy} label="Release rooms" confirmLabel="Release?" onConfirm={() => run({ action: "cancel" }, "Room released")} />}
        </div>
        {!block && (
          <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
            {whatsappHref(b.guestPhone) && ["confirmed", "checked_in", "pending"].includes(b.status) && (
              <a href={whatsappHref(b.guestPhone, confirmationText(b))} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--a-line)] px-3 py-1.5 hover:bg-[#f7f4ed]">Send confirmation on WhatsApp</a>
            )}
            <a href={`/admin/invoice/${b.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--a-line)] px-3 py-1.5 hover:bg-[#f7f4ed]">Print invoice ↗</a>
          </div>
        )}
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
        {pay && <PaymentForm b={b} checkout={pay.checkout} onDone={() => setPay(null)} />}
        {cancelling && <CancelForm b={b} onDone={() => setCancelling(false)} />}
        {b.status === "cancelled" && (b.cancelReason || b.cancelledAt) && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-[13px] text-rose-900">
            Cancelled{b.cancelledAt ? ` ${fmtStamp(b.cancelledAt)}` : ""}{b.cancelReason ? ` — ${b.cancelReason}` : ""}
            {creditHeld(b) > 0 && <span className="block">{rupees(creditHeld(b))} kept after refunds.</span>}
          </div>
        )}
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
          <Section title="Payments" action={<Btn size="sm" variant="ghost" onClick={() => setPay({ checkout: false })}>+ Add</Btn>}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#f7f4ed] p-3"><p className="text-[11.5px] text-[var(--a-muted)]">Total</p><p className="text-[15px] font-semibold">{rupees(b.amountInr)}</p></div>
              <div className="rounded-xl bg-[#f7f4ed] p-3"><p className="text-[11.5px] text-[var(--a-muted)]">Received</p><p className="text-[15px] font-semibold text-emerald-800">{rupees(paidAmount(b))}</p></div>
              <div className="rounded-xl bg-[#f7f4ed] p-3"><p className="text-[11.5px] text-[var(--a-muted)]">Balance</p><p className={`text-[15px] font-semibold ${due > 0 ? "text-amber-800" : ""}`}>{rupees(due)}</p></div>
            </div>
            <ul className="mt-4 divide-y divide-[var(--a-line)] text-[13px]">
              {b.paymentId?.startsWith("pay_") && (
                <li className="flex justify-between py-2"><span>Online payment · <span className="font-mono text-[11.5px]">{b.paymentId}</span></span><span className="tabular-nums">{rupees(b.depositInr || b.amountInr)}</span></li>
              )}
              {(b.payments ?? []).map((p) => (
                <li key={p.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {p.amountInr < 0 ? "Refund" : "Payment"} · {methodLabel(p.method)}
                    <span className="block text-[12px] text-[var(--a-muted)]">{fmtStamp(p.createdAt)}{p.note ? ` · ${p.note}` : ""}</span>
                  </span>
                  <span className={`tabular-nums ${p.amountInr < 0 ? "text-rose-700" : ""}`}>{p.amountInr < 0 ? "−" : ""}{rupees(Math.abs(p.amountInr))}</span>
                </li>
              ))}
              {!b.paymentId?.startsWith("pay_") && (b.payments ?? []).length === 0 && (
                <li className="py-2 text-[var(--a-muted)]">{isPaid(b) ? "Marked paid at the hotel." : "No payments yet."}</li>
              )}
            </ul>
            {b.status === "pending" && b.holdExpiresAt && <p className="mt-2 text-[12px] text-[var(--a-muted)]">Online hold expires {fmtStamp(b.holdExpiresAt)}</p>}
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

function PaymentForm({ b, checkout, onDone }: { b: AdminBooking; checkout: boolean; onDone: () => void }) {
  const desk = useDesk();
  const due = balanceDue(b);
  const [kind, setKind] = useState<"payment" | "refund">("payment");
  const [amount, setAmount] = useState(String(due || ""));
  const [method, setMethod] = useState<string>("cash");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const value = Number(amount) || 0;
  return (
    <section className="rounded-2xl border-2 border-[#b48a3c]/40 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h4 className="text-[14px] font-semibold">{checkout ? "Settle and check out" : "Record money"}</h4>
        {!checkout && (
          <Segmented value={kind} onChange={(v) => { setKind(v); setAmount(v === "refund" ? String(Math.max(0, paidAmount(b) - (b.status === "cancelled" ? 0 : b.amountInr)) || "") : String(due || "")); }} options={[{ value: "payment", label: "Payment" }, { value: "refund", label: "Refund" }]} />
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Amount (₹)" hint={kind === "payment" ? (due > 0 ? `Balance due ${rupees(due)}` : "Nothing due") : `Received so far ${rupees(paidAmount(b))}`}>
          <input className={inputCls} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </Field>
        <Field label="Method">
          <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Reference (optional)"><input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="UPI ref, card last 4, receipt no.…" /></Field>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Btn size="sm" variant="ghost" onClick={onDone}>Close</Btn>
        <Btn
          size="sm"
          variant={kind === "refund" ? "danger" : "primary"}
          disabled={busy || value <= 0}
          onClick={async () => {
            setBusy(true);
            const ok = await desk.patchBooking(b.id, { action: "add_payment", amountInr: kind === "refund" ? -value : value, method, note: note.trim() || undefined }, kind === "refund" ? `Refund of ${rupees(value)} recorded` : `${rupees(value)} received`);
            if (ok && checkout) await desk.patchBooking(b.id, { action: "set_status", status: "checked_out" }, `${b.guestName} checked out`);
            setBusy(false);
            if (ok) onDone();
          }}
        >
          {busy ? "Saving…" : kind === "refund" ? `Refund ${rupees(value)}` : checkout ? `Receive ${rupees(value)} & check out` : `Receive ${rupees(value)}`}
        </Btn>
      </div>
    </section>
  );
}

const REASONS = ["Guest cancelled", "Change of plans", "Booked elsewhere", "Duplicate booking", "Payment not received", "Hotel cancelled"];

function CancelForm({ b, onDone }: { b: AdminBooking; onDone: () => void }) {
  const desk = useDesk();
  const received = paidAmount(b);
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const [fee, setFee] = useState("0");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const refund = Math.max(0, received - (Number(fee) || 0));
  return (
    <section className="rounded-2xl border-2 border-rose-200 bg-white p-5">
      <h4 className="mb-4 text-[14px] font-semibold text-rose-800">Cancel this booking</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Reason">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <Field label="Details (optional)"><input className={inputCls} value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
        {received > 0 && (
          <>
            <Field label="Cancellation fee kept (₹)" hint={`Received so far ${rupees(received)}`}>
              <input className={inputCls} type="number" min={0} max={received} value={fee} onChange={(e) => setFee(e.target.value)} />
            </Field>
            <Field label="Refund by">
              <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
          </>
        )}
      </div>
      <p className="mt-3 text-[12.5px] text-[var(--a-muted)]">
        The room goes back on sale straight away.{received > 0 ? ` Refund to record: ${rupees(refund)}.` : ""}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <Btn size="sm" variant="ghost" onClick={onDone}>Keep booking</Btn>
        <Btn
          size="sm"
          variant="danger"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const ok = await desk.patchBooking(
              b.id,
              { action: "cancel_admin", reason: [reason, detail.trim()].filter(Boolean).join(" — "), refundInr: refund || undefined, refundMethod: method },
              refund ? `Cancelled · refund ${rupees(refund)} recorded` : "Booking cancelled",
            );
            setBusy(false);
            if (ok) onDone();
          }}
        >
          {busy ? "Cancelling…" : refund ? `Cancel & refund ${rupees(refund)}` : "Cancel booking"}
        </Btn>
      </div>
    </section>
  );
}
