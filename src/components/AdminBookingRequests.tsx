"use client";

import { readJson } from "@/lib/http";
import { useEffect, useState } from "react";

type RequestRow = {
  id: string;
  type: string;
  status: string;
  requestedCheckIn?: string | null;
  requestedCheckOut?: string | null;
  createdAt: string;
  booking: { id: string; guestName: string; guestEmail: string; checkIn: string; checkOut: string; roomName: string };
};

export function AdminBookingRequests({ onChange }: { onChange?: (pending: number) => void } = {}) {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/booking-requests")
      .then(async (response) => {
        const data = await readJson(response);
        if (!response.ok) throw new Error(data.error || "Could not load requests");
        setRows(data.requests ?? []);
        onChange?.((data.requests ?? []).filter((r: RequestRow) => r.status === "pending").length);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Could not load requests"));
  }, []);

  async function review(id: string, status: "approved" | "rejected") {
    const response = await fetch("/api/admin/booking-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      setError(data.error || "Could not review request");
      return;
    }
    setRows((current) => {
      const next = current.map((row) => (row.id === id ? { ...row, status } : row));
      onChange?.(next.filter((row) => row.status === "pending").length);
      return next;
    });
  }

  const pending = rows.filter((row) => row.status === "pending");
  const done = rows.filter((row) => row.status !== "pending").slice(0, 8);

  return (
    <section className="mt-10 space-y-10">
      {error && <p role="alert" className="border-l-2 border-[#f0a493] pl-3 text-sm text-[#f0a493]">{error}</p>}
      {pending.length === 0 ? (
        <p className="border border-[var(--dd-line-dark)] py-14 text-center font-[family-name:var(--font-body)] text-[var(--dd-cream)]/45">
          No pending requests — you’re all caught up.
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {pending.map((row) => (
            <article key={row.id} className="border border-[var(--dd-line-dark)] bg-[var(--dd-night-2)]/60 p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="rounded-full border border-[var(--dd-gold)]/60 px-3 py-1 font-[family-name:var(--font-nav)] text-[9.5px] uppercase tracking-[0.18em] text-[var(--dd-gold)]">
                  {row.type === "date_change" ? "Date change" : "Cancellation"}
                </span>
                <span className="text-[12px] text-[var(--dd-cream)]/45">{row.booking.id}</span>
              </div>
              <p className="mt-4 font-[family-name:var(--font-display)] text-2xl">{row.booking.guestName}</p>
              <p className="text-[13px] text-[var(--dd-cream)]/55">{row.booking.guestEmail}</p>
              <p className="mt-3 text-[14px] text-[var(--dd-cream)]/80">
                {row.booking.roomName} · {row.booking.checkIn} → {row.booking.checkOut}
              </p>
              {row.type === "date_change" && (
                <p className="mt-1 text-[14px] text-[var(--dd-gold)]">
                  Wants {row.requestedCheckIn} → {row.requestedCheckOut}
                </p>
              )}
              <div className="mt-5 flex gap-3">
                <button type="button" onClick={() => void review(row.id, "approved")} className="dd-btn dd-btn--sm dd-btn--solid">
                  Approve
                </button>
                <button type="button" onClick={() => void review(row.id, "rejected")} className="dd-btn dd-btn--sm" style={{ ["--dd-btn-line" as string]: "rgba(243,238,228,0.3)" }}>
                  Decline
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {done.length > 0 && (
        <div>
          <p className="font-[family-name:var(--font-nav)] text-[10px] uppercase tracking-[0.24em] text-[var(--dd-cream)]/45">Recently reviewed</p>
          <ul className="mt-3 divide-y divide-[var(--dd-line-dark)] border-y border-[var(--dd-line-dark)]">
            {done.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-4 py-3 text-[14px]">
                <span>
                  {row.booking.guestName} · {row.type === "date_change" ? "date change" : "cancellation"}
                </span>
                <span className={row.status === "approved" ? "text-[var(--dd-gold)]" : "text-[var(--dd-cream)]/45"}>{row.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
