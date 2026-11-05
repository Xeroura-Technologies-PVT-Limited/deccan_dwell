"use client";

import { useState } from "react";
import { useDesk } from "./store";
import { Btn, Card, ConfirmBtn, Empty } from "./ui";
import { fmtDay, fmtStamp, nightsOf } from "./lib";

export function RequestsView() {
  const desk = useDesk();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = desk.requests.filter((r) => r.status === "pending");
  const done = desk.requests.filter((r) => r.status !== "pending").sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? "")).slice(0, 20);

  const act = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    await desk.reviewRequest(id, status);
    setBusy(null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div className="space-y-3">
        <h2 className="text-[13.5px] font-semibold">Waiting for you <span className="text-[var(--a-muted)]">{pending.length}</span></h2>
        {pending.length === 0 && <Empty>No guest requests waiting.</Empty>}
        {pending.map((r) => {
          const b = r.booking;
          const change = r.type === "date_change";
          return (
            <section key={r.id} className="rounded-2xl border border-[var(--a-line)] bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-[#7a5a1f]">{change ? "Date change" : "Cancellation"}</p>
                  <button type="button" onClick={() => desk.openBooking(b.id)} className="mt-1 text-left font-[family-name:var(--font-display)] text-[22px] hover:underline">{b.guestName}</button>
                  <p className="text-[12.5px] text-[var(--a-muted)]">{b.roomName} · <span className="font-mono">{b.id.toUpperCase()}</span> · asked {fmtStamp(r.createdAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" disabled={busy === r.id} onClick={() => act(r.id, "rejected")}>Decline</Btn>
                  <ConfirmBtn size="sm" variant="primary" disabled={busy === r.id} label={change ? "Approve change" : "Approve cancellation"} confirmLabel="Confirm approval" onConfirm={() => act(r.id, "approved")} />
                </div>
              </div>
              <div className="mt-4 grid gap-3 rounded-xl bg-[#f7f4ed] p-4 text-[13px] sm:grid-cols-2">
                <div>
                  <p className="text-[12px] text-[var(--a-muted)]">Current stay</p>
                  <p className="font-medium">{fmtDay(b.checkIn)} → {fmtDay(b.checkOut)} · {nightsOf(b)}n</p>
                </div>
                {change && r.requestedCheckIn && r.requestedCheckOut && (
                  <div>
                    <p className="text-[12px] text-[var(--a-muted)]">Requested</p>
                    <p className="font-medium text-[#0b3d33]">{fmtDay(r.requestedCheckIn)} → {fmtDay(r.requestedCheckOut)} · {nightsOf({ checkIn: r.requestedCheckIn, checkOut: r.requestedCheckOut })}n</p>
                  </div>
                )}
              </div>
              {r.note && <p className="mt-3 rounded-xl border border-[var(--a-line)] px-4 py-3 text-[13px] italic">&ldquo;{r.note}&rdquo;</p>}
              {change && <p className="mt-3 text-[12px] text-[var(--a-muted)]">Approving checks availability and re-prices the stay at the current rate.</p>}
            </section>
          );
        })}
      </div>
      <Card title="Recently reviewed" pad={false}>
        {done.length === 0 ? (
          <div className="p-5"><Empty>Nothing reviewed yet.</Empty></div>
        ) : (
          <ul className="divide-y divide-[var(--a-line)]">
            {done.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                <span>
                  <span className="block font-medium">{r.booking.guestName}</span>
                  <span className="block text-[12px] text-[var(--a-muted)]">{r.type === "date_change" ? "Date change" : "Cancellation"} · {r.reviewedAt ? fmtStamp(r.reviewedAt) : ""}</span>
                </span>
                <span className={r.status === "approved" ? "text-emerald-700" : "text-rose-700"}>{r.status === "approved" ? "Approved" : "Declined"}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
